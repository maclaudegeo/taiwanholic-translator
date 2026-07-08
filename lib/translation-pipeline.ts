import { z } from "zod";
import type {
  AnalysisPayload,
  ArticleBlock,
  KeywordSuggestion,
  TitleOption,
  ValidationReport,
  TranslationPayload
} from "./article-blocks";
import {
  buildBulkTranslationPrompt,
  buildKeywordSuggestionPrompt,
  buildValidationPrompt,
  buildTitleOptionsPrompt
} from "./prompts";
import { fetchTrendCandidates } from "./trends";
import { requestStructuredData } from "./openai";

type TranslationCallResult =
  | { text: string; notes: string[] }
  | { blocks: { id: string; text: string; notes: string[] }[] }
  | { keywords: KeywordSuggestion[] }
  | { options: TitleOption[] }
  | {
      verdict: string;
      japaneseEditorScore: number;
      aiFeelScore: number;
      readerImpression: string;
      suggestions: string[];
      blocks: { id: string; text: string; notes: string[] }[];
    };

type CallKind = "bulk_translation" | "keywords" | "titles" | "validation";

type PipelineCall = {
  prompt: string;
  instructions: string;
  kind: CallKind;
};

type PipelineOptions = {
  callModel?: (input: PipelineCall) => Promise<TranslationCallResult>;
  includeTrendSuggestions?: boolean;
  keywords?: KeywordSuggestion[];
};

const MAX_BULK_TRANSLATION_CHARS = 3200;
const MAX_BULK_TRANSLATION_BLOCKS = 8;
const BULK_TRANSLATION_CONCURRENCY = 3;

const noteListSchema = z
  .union([z.array(z.string()), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (Array.isArray(value)) {
      return value.map((item) => item.trim()).filter(Boolean);
    }

    if (typeof value === "string") {
      const normalized = value.trim();
      return normalized ? [normalized] : [];
    }

    return [];
  });

function createCallModel(
  override?: (input: PipelineCall) => Promise<TranslationCallResult>
) {
  return (
    override ??
    (async ({ prompt, instructions, kind }: PipelineCall) => {
      if (kind === "keywords") {
        return requestStructuredData(
          z.object({
            keywords: z.array(
              z.object({
                phrase: z.string().min(1),
                source: z.enum(["article_core", "google_trends", "manual"]),
                reason: z.string().min(1),
                selected: z.boolean().default(true)
              })
            )
          }),
          { prompt, instructions }
        );
      }

      if (kind === "titles") {
        return requestStructuredData(
          z.object({
            options: z.array(
              z.object({
                label: z.string().min(1),
                text: z.string().min(1),
                focus: z.string().min(1),
                keywordsUsed: z.array(z.string()).default([])
              })
            ).length(3)
          }),
          { prompt, instructions }
        );
      }

      if (kind === "validation") {
        return requestStructuredData(
          z.object({
            verdict: z.string().min(1),
            japaneseEditorScore: z.number().min(1).max(10),
            aiFeelScore: z.number().min(0).max(10),
            readerImpression: z.string().min(1),
            suggestions: z.array(z.string().min(1)).max(5),
            blocks: z.array(
              z.object({
                id: z.string().min(1),
                text: z.string().default(""),
                notes: noteListSchema.default([])
              })
            )
          }),
          { prompt, instructions }
        );
      }

      return requestStructuredData(
        z.object({
          blocks: z.array(
            z.object({
              id: z.string().min(1),
              text: z.string().default(""),
              notes: noteListSchema.default([])
            })
          )
        }),
        { prompt, instructions }
      );
    })
  );
}

function normalizeKeyword(keyword: KeywordSuggestion): KeywordSuggestion {
  return {
    phrase: keyword.phrase.trim(),
    source: keyword.source,
    reason: keyword.reason.trim(),
    selected: keyword.selected
  };
}

function dedupeKeywords(keywords: KeywordSuggestion[]) {
  const map = new Map<string, KeywordSuggestion>();

  for (const rawKeyword of keywords) {
    const keyword = normalizeKeyword(rawKeyword);

    if (!keyword.phrase) {
      continue;
    }

    const key = keyword.phrase.toLowerCase();
    const existing = map.get(key);

    if (!existing) {
      map.set(key, keyword);
      continue;
    }

    map.set(key, {
      ...existing,
      reason: existing.reason || keyword.reason,
      selected: existing.selected || keyword.selected,
      source:
        existing.source === "manual" || keyword.source !== "manual"
          ? existing.source
          : keyword.source
    });
  }

  return Array.from(map.values());
}

function buildFallbackKeywords(trendCandidates: string[]) {
  return dedupeKeywords(
    trendCandidates.slice(0, 8).map((phrase, index) => ({
      phrase,
      source: "google_trends" as const,
      reason:
        index < 3
          ? "近期日本旅遊搜尋中常見，且可作為這篇文章的日文關鍵字參考"
          : "可作為補充用的日文旅遊搜尋關鍵字",
      selected: index < 4
    }))
  );
}

function normalizeModelText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeModelNotes(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized ? [normalized] : [];
  }

  return [];
}

function normalizeTitleOptions(options: TitleOption[]) {
  return options.map((option, index) => ({
    ...option,
    id: normalizeModelText(option.id) || `title-option-${index + 1}`,
    label: normalizeModelText(option.label) || `標題 ${index + 1}`,
    text: normalizeModelText(option.text),
    focus: normalizeModelText(option.focus) || `方向 ${index + 1}`,
    keywordsUsed: option.keywordsUsed ?? []
  }));
}

function normalizeValidationReport(input: {
  verdict: string;
  japaneseEditorScore: number;
  aiFeelScore: number;
  readerImpression: string;
  suggestions: string[];
}): ValidationReport {
  return {
    verdict: normalizeModelText(input.verdict),
    japaneseEditorScore: Math.max(1, Math.min(10, Math.round(input.japaneseEditorScore))),
    aiFeelScore: Math.max(0, Math.min(10, Math.round(input.aiFeelScore))),
    readerImpression: normalizeModelText(input.readerImpression),
    suggestions: input.suggestions.map(normalizeModelText).filter(Boolean).slice(0, 5)
  };
}

function chunkArticleBlocks(blocks: ArticleBlock[]) {
  const chunks: ArticleBlock[][] = [];
  let currentChunk: ArticleBlock[] = [];
  let currentChars = 0;

  for (const block of blocks) {
    const blockChars = block.sourceText.length;
    const wouldOverflowChars =
      currentChunk.length > 0 &&
      currentChars + blockChars > MAX_BULK_TRANSLATION_CHARS;
    const wouldOverflowBlocks =
      currentChunk.length >= MAX_BULK_TRANSLATION_BLOCKS;

    if (wouldOverflowChars || wouldOverflowBlocks) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentChars = 0;
    }

    currentChunk.push(block);
    currentChars += blockChars;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

async function mapWithConcurrency<TInput, TOutput>(
  items: TInput[],
  concurrency: number,
  mapper: (item: TInput, index: number) => Promise<TOutput>
) {
  const results: TOutput[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex] as TInput, currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );

  return results;
}

export async function analyzeArticleBlocks(
  blocks: ArticleBlock[],
  options: PipelineOptions
): Promise<AnalysisPayload> {
  const callModel = createCallModel(options.callModel);
  const articleHints = blocks
    .filter(
      (block) =>
        block.type === "title" ||
        block.type === "heading" ||
        block.type === "caption"
    )
    .map((block) => block.sourceText)
    .slice(0, 10);
  const sourceSummary = blocks
    .map((block) => block.sourceText)
    .join(" ")
    .slice(0, 1800);
  const trendCandidates = options.includeTrendSuggestions
    ? await fetchTrendCandidates(articleHints)
    : [];
  const keywordBundle = (await callModel({
    kind: "keywords",
    prompt: buildKeywordSuggestionPrompt({
      sourceSummary,
      articleHints,
      trendCandidates
    }),
    instructions:
      "Return valid JSON only. Suggest only article-relevant Japanese keyword phrases and preselect the strongest natural options."
  })) as { keywords: KeywordSuggestion[] };

  const dedupedKeywords = dedupeKeywords(keywordBundle.keywords);

  return {
    blocks,
    keywords:
      dedupedKeywords.length > 0
        ? dedupedKeywords
        : buildFallbackKeywords(trendCandidates)
  };
}

export async function translateArticleBlocks(
  blocks: ArticleBlock[],
  options: PipelineOptions
): Promise<TranslationPayload> {
  const callModel = createCallModel(options.callModel);
  const chosenKeywords = dedupeKeywords(options.keywords ?? []);
  const selectedKeywords = chosenKeywords
    .filter((keyword) => keyword.selected)
    .map((keyword) => keyword.phrase);
  const translatedMap = new Map<string, { text: string; notes: string[] }>();
  const blockChunks = chunkArticleBlocks(blocks);

  const translatedBundles = (await mapWithConcurrency(
    blockChunks,
    BULK_TRANSLATION_CONCURRENCY,
    async (chunk) =>
      (await callModel({
        kind: "bulk_translation",
        prompt: buildBulkTranslationPrompt({
          blocks: chunk.map((block) => ({
            id: block.id,
            type: block.type,
            sourceText: block.sourceText
          })),
          selectedKeywords
        }),
        instructions:
          "Return valid JSON only. Translate and polish the whole article chunk in one pass. Preserve every block id and keep the Japanese natural, faithful, and publication-ready."
      })) as { blocks: { id: string; text: string; notes: string[] }[] }
  )) as { blocks: { id: string; text: string; notes: string[] }[] }[];

  for (const translatedBundle of translatedBundles) {
    for (const block of translatedBundle.blocks) {
      translatedMap.set(block.id, {
        text: normalizeModelText(block.text),
        notes: normalizeModelNotes(block.notes)
      });
    }
  }

  const results: ArticleBlock[] = blocks.map((block) => {
    const translated = translatedMap.get(block.id);
    const fallbackApplied = !translated?.text;
    const polishedText = translated?.text || block.sourceText;
    const translatedNotes = translated?.notes ?? [];

    return {
      ...block,
      translatedText: polishedText,
      polishedText,
      trendSuggestions: selectedKeywords.filter((keyword) =>
        polishedText.includes(keyword)
      ),
      notes: fallbackApplied
        ? [...translatedNotes, "bulk translation fallback applied"]
        : translatedNotes
    };
  });

  const sourceTitle =
    blocks.find((block) => block.type === "title")?.sourceText ??
    blocks[0]?.sourceText ??
    "";
  const polishedTitle =
    results.find((block) => block.type === "title")?.polishedText ??
    results[0]?.polishedText ??
    sourceTitle;
  const titleOptionBundle = (await callModel({
    kind: "titles",
    prompt: buildTitleOptionsPrompt({
      sourceTitle,
      polishedTitle,
      selectedKeywords
    }),
    instructions:
      "Return valid JSON only. All three titles must be publication-ready, SEO-aware, faithful to the article, and naturally useful for Japanese readers."
  })) as { options: TitleOption[] };

  const validationBundle = (await callModel({
    kind: "validation",
    prompt: buildValidationPrompt({
      sourceTitle,
      blocks: results.map((block) => ({
        id: block.id,
        type: block.type,
        sourceText: block.polishedText ?? block.translatedText ?? block.sourceText
      })),
      selectedKeywords
    }),
    instructions:
      "Return valid JSON only. Evaluate like a strict Japanese editor, score AI feel honestly, and lightly improve the wording where needed without changing the article structure."
  })) as {
    verdict: string;
    japaneseEditorScore: number;
    aiFeelScore: number;
    readerImpression: string;
    suggestions: string[];
    blocks: { id: string; text: string; notes: string[] }[];
  };

  const validationMap = new Map(
    validationBundle.blocks.map((block) => [
      block.id,
      {
        text: normalizeModelText(block.text),
        notes: normalizeModelNotes(block.notes)
      }
    ])
  );

  const finalBlocks = results.map((block) => {
    const validated = validationMap.get(block.id);

    if (!validated?.text) {
      return block;
    }

    return {
      ...block,
      translatedText: validated.text,
      polishedText: validated.text,
      trendSuggestions: selectedKeywords.filter((keyword) =>
        validated.text.includes(keyword)
      ),
      notes: [...block.notes, ...validated.notes]
    };
  });

  return {
    blocks: finalBlocks,
    keywords: chosenKeywords,
    titleOptions: normalizeTitleOptions(titleOptionBundle.options),
    validation: normalizeValidationReport(validationBundle)
  };
}
