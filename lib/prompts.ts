import type { BlockType } from "./article-blocks";
import {
  ARTICLE_FLOW,
  BRAND_POSITIONING,
  EDITORIAL_VOICE,
  FIDELITY_RULES,
  JAPANESE_USAGE_RULES,
  REFERENCE_BOUNDARY,
  TITLE_RULES
} from "./editorial-rules";

type PromptInput = {
  blockType: BlockType;
  sourceText: string;
};

type BulkPromptBlock = {
  id: string;
  type: BlockType;
  sourceText: string;
};

export function buildTranslationPrompt({
  blockType,
  sourceText,
  selectedKeywords = []
}: PromptInput & { selectedKeywords?: string[] }) {
  return [
    "Task: translate the Chinese source into Japanese.",
    BRAND_POSITIONING,
    EDITORIAL_VOICE,
    ARTICLE_FLOW,
    JAPANESE_USAGE_RULES,
    FIDELITY_RULES,
    REFERENCE_BOUNDARY,
    TITLE_RULES,
    "Reference the high-level Japanese wording habits found in Howto Taiwan articles: concrete, reader-friendly, lightly editorial, and never machine-like.",
    "Prefer natural Japanese travel-media wording over literal translation. Use practical phrases that sound written by a human editor for Japanese readers.",
    `Block type: ${blockType}`,
    `Selected SEO keywords: ${selectedKeywords.join(", ") || "none"}`,
    "Use selected keywords only where they genuinely fit the content, especially in titles, headings, SEO descriptions, and captions. Never force keyword stuffing or awkward Japanese.",
    "Output JSON with keys: text (string) and notes (array of strings).",
    `Source text: ${sourceText}`
  ].join("\n");
}

export function buildPolishingPrompt({
  blockType,
  sourceText,
  translatedText,
  selectedKeywords = []
}: PromptInput & { translatedText: string; selectedKeywords?: string[] }) {
  return [
    "Task: act as a strict Japanese editor and polish the translated text.",
    BRAND_POSITIONING,
    EDITORIAL_VOICE,
    ARTICLE_FLOW,
    JAPANESE_USAGE_RULES,
    FIDELITY_RULES,
    TITLE_RULES,
    "Keep selected keywords only where they read naturally, especially in titles, headings, captions, and SEO descriptions.",
    "Focus on removing translationese, awkward collocations, and Chinese syntax residue.",
    "Make the writing feel like a Taiwan-savvy friend guiding a Japanese traveler into everyday Taiwan, while preserving the source writer's intent and structure.",
    "Actively rewrite any phrase that sounds like AI translation, textbook Japanese, or unnatural literal Chinese-to-Japanese transfer.",
    `Block type: ${blockType}`,
    `Selected SEO keywords: ${selectedKeywords.join(", ") || "none"}`,
    `Source text: ${sourceText}`,
    `Current translation: ${translatedText}`,
    "Output JSON with keys: text (string) and notes (array of strings)."
  ].join("\n");
}

export function buildBulkTranslationPrompt({
  blocks,
  selectedKeywords = []
}: {
  blocks: BulkPromptBlock[];
  selectedKeywords?: string[];
}) {
  return [
    "Task: translate the Chinese source article into polished Japanese in one pass.",
    BRAND_POSITIONING,
    EDITORIAL_VOICE,
    ARTICLE_FLOW,
    JAPANESE_USAGE_RULES,
    FIDELITY_RULES,
    REFERENCE_BOUNDARY,
    TITLE_RULES,
    "Reference the high-level Japanese wording habits found in Howto Taiwan articles: concrete, reader-friendly, lightly editorial, and never machine-like.",
    "Prefer natural Japanese travel-media wording over literal translation. The result should read as if a human Japanese editor wrote it.",
    "Preserve the original author's meaning, narrative order, and practical information.",
    `Selected SEO keywords: ${selectedKeywords.join(", ") || "none"}`,
    "Use selected keywords only where they genuinely fit the content, especially in titles, headings, SEO descriptions, and captions. Never force keyword stuffing or awkward Japanese.",
    "Preserve block ids and return one translated result for every input block in the same order.",
    "For each block, lightly polish the Japanese so it already feels final and publication-ready.",
    "Output JSON with key blocks. Each block item needs id, text, and notes.",
    `Blocks: ${JSON.stringify(blocks)}`
  ].join("\n");
}

export function buildKeywordSuggestionPrompt(input: {
  sourceSummary: string;
  articleHints: string[];
  trendCandidates: string[];
}) {
  return [
    "Task: propose Japanese SEO keyword suggestions for a Taiwan travel article.",
    "You are helping a non-Japanese-speaking editor choose practical keywords.",
    "Combine article relevance with recent Japan travel search interest.",
    "Trend keywords are only a support layer. Article fit comes first.",
    "Keep only keywords that truly match the article. Avoid unrelated hype terms.",
    "Prefer words that could naturally appear in titles, subheadings, captions, or short descriptive passages.",
    `Article summary: ${input.sourceSummary}`,
    `Article hints: ${input.articleHints.join(", ") || "none"}`,
    `Recent Japan travel trend candidates: ${input.trendCandidates.join(", ") || "none"}`,
    "Output JSON with key keywords. Each keyword item needs phrase, source(article_core or google_trends), reason, and selected(true/false). Return 5 to 10 items."
  ].join("\n");
}

export function buildTitleOptionsPrompt(input: {
  sourceTitle: string;
  polishedTitle: string;
  selectedKeywords: string[];
}) {
  return [
    "Task: create three Japanese title options for a Taiwan travel media article.",
    "All three options must sound like the same Taiwan travel media family: friendly, editorial, useful, curiosity-driven, and SEO-aware.",
    "Reference the high-level headline feel and Japanese wording habits found in Howto Taiwan travel titles, but do not copy fixed phrasing.",
    "All options must include or strongly reflect the selected keywords only where natural.",
    "The best title should feel like a trusted Taiwan friend giving a helpful invitation, not a loud clickbait ad.",
    "Return exactly three options with these focuses: stable, click, search.",
    `Original Chinese title: ${input.sourceTitle}`,
    `Current polished Japanese title: ${input.polishedTitle}`,
    `Selected keywords: ${input.selectedKeywords.join(", ") || "none"}`,
    "Output JSON with key options. Each option needs label, text, focus, and keywordsUsed."
  ].join("\n");
}
