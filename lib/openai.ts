import OpenAI from "openai";
import { z, type ZodType } from "zod";

let client: OpenAI | null = null;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing. Add it to .env.local.");
  }

  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

function extractJsonPayload(rawText: string) {
  const fencedMatch = rawText.match(/```json\s*([\s\S]+?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  return rawText.trim();
}

export async function requestStructuredData<T>(
  schema: ZodType<T>,
  input: {
    instructions: string;
    prompt: string;
  },
): Promise<T> {
  const response = await getClient().responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5.5",
    reasoning: { effort: "low" },
    instructions: input.instructions,
    input: input.prompt
  });

  return schema.parse(JSON.parse(extractJsonPayload(response.output_text)));
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
