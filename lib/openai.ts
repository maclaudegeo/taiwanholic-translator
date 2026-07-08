import OpenAI from "openai";
import { z, type ZodType } from "zod";

type ProviderName = "gemini" | "openai";

type StructuredInput = {
  instructions: string;
  prompt: string;
};

let openAiClient: OpenAI | null = null;
const GEMINI_MAX_RETRIES = 3;
const GEMINI_RETRY_BASE_MS = 1500;

function extractJsonPayload(rawText: string) {
  const fencedMatch = rawText.match(/```json\s*([\s\S]+?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  return rawText.trim();
}

function clipText(value: string, limit = 500) {
  const normalized = value.trim();
  return normalized.length > limit
    ? `${normalized.slice(0, limit)}...`
    : normalized;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryGemini(errorText: string, status: number) {
  const normalized = errorText.toLowerCase();

  return (
    status === 503 ||
    status === 429 ||
    normalized.includes("unavailable") ||
    normalized.includes("high demand") ||
    normalized.includes("resource_exhausted") ||
    normalized.includes("try again later")
  );
}

function getConfiguredProviders(): ProviderName[] {
  const rawOrder = process.env.LLM_PROVIDER_ORDER?.trim() || "gemini,openai";
  const requested = rawOrder
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean) as ProviderName[];
  const unique = Array.from(new Set(requested));

  return unique.filter((provider) => {
    if (provider === "gemini") {
      return Boolean(process.env.GEMINI_API_KEY);
    }

    if (provider === "openai") {
      return Boolean(process.env.OPENAI_API_KEY);
    }

    return false;
  });
}

function ensureProviders() {
  const providers = getConfiguredProviders();

  if (providers.length === 0) {
    throw new Error(
      "No model provider is configured. Add GEMINI_API_KEY or OPENAI_API_KEY to .env.local."
    );
  }

  return providers;
}

function getOpenAiClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing. Add it to .env.local.");
  }

  openAiClient ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openAiClient;
}

async function requestWithOpenAi(input: StructuredInput) {
  const response = await getOpenAiClient().responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5.5",
    reasoning: { effort: "low" },
    instructions: input.instructions,
    input: input.prompt
  });

  return response.output_text;
}

function getGeminiTextParts(payload: unknown) {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("candidates" in payload) ||
    !Array.isArray((payload as { candidates?: unknown[] }).candidates)
  ) {
    return [];
  }

  const candidates = (payload as {
    candidates: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  }).candidates;

  return candidates.flatMap((candidate) =>
    candidate.content?.parts
      ?.map((part) => (typeof part.text === "string" ? part.text : ""))
      .filter(Boolean) ?? []
  );
}

async function requestWithGemini(input: StructuredInput) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Add it to .env.local.");
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= GEMINI_MAX_RETRIES; attempt += 1) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${input.instructions}\n\n${input.prompt}`
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      const retryable = shouldRetryGemini(errorText, response.status);
      lastError = new Error(
        `Gemini ${response.status} (attempt ${attempt}/${GEMINI_MAX_RETRIES}): ${errorText}`
      );

      if (retryable && attempt < GEMINI_MAX_RETRIES) {
        await sleep(GEMINI_RETRY_BASE_MS * attempt);
        continue;
      }

      throw lastError;
    }

    const payload = (await response.json()) as unknown;
    const parts = getGeminiTextParts(payload);

    if (parts.length === 0) {
      lastError = new Error(
        `Gemini returned an empty response on attempt ${attempt}/${GEMINI_MAX_RETRIES}. Payload: ${clipText(JSON.stringify(payload))}`
      );

      if (attempt < GEMINI_MAX_RETRIES) {
        await sleep(GEMINI_RETRY_BASE_MS * attempt);
        continue;
      }

      throw lastError;
    }

    return parts.join("\n").trim();
  }

  throw lastError ?? new Error("Gemini request failed.");
}

async function generateJsonText(provider: ProviderName, input: StructuredInput) {
  if (provider === "gemini") {
    return requestWithGemini(input);
  }

  return requestWithOpenAi(input);
}

function summarizeProviderFailure(provider: ProviderName, error: unknown) {
  const detail = error instanceof Error ? error.message.trim() : String(error);
  return `${provider}: ${detail}`;
}

export async function requestStructuredData<T>(
  schema: ZodType<T>,
  input: StructuredInput,
): Promise<T> {
  const providers = ensureProviders();
  const failures: string[] = [];

  for (const provider of providers) {
    try {
      const rawText = await generateJsonText(provider, input);
      const extracted = extractJsonPayload(rawText);
      let parsed: unknown;

      try {
        parsed = JSON.parse(extracted);
      } catch {
        throw new Error(
          `${provider} returned non-JSON output: ${clipText(extracted)}`
        );
      }

      return schema.parse(parsed);
    } catch (error) {
      const summary = summarizeProviderFailure(provider, error);
      failures.push(summary);
      console.error("[llm-provider-failure]", summary);
    }
  }

  console.error("[llm-all-providers-failed]", failures.join(" | "));
  throw new Error(
    `All model providers failed. ${failures.join(" | ")}`
  );
}

export async function requestTranslationOrPolish(input: {
  prompt: string;
  instructions: string;
}) {
  return requestStructuredData(
    z.object({
      text: z.string().default(""),
      notes: z.array(z.string()).default([])
    }),
    input,
  );
}

export async function requestTrendSuggestions(input: {
  prompt: string;
  instructions: string;
}) {
  return requestStructuredData(
    z.object({
      suggestions: z.array(z.string()).default([]),
      notes: z.array(z.string()).default([])
    }),
    input,
  );
}
