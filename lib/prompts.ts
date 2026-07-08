import type { BlockType } from "./article-blocks";
import {
  ANTI_AI_RULES,
  ARTICLE_FLOW,
  BRAND_POSITIONING,
  DECISION_HELPING_RULES,
  EDITORIAL_JUDGMENT_RULES,
  EDITORIAL_VOICE,
  FIDELITY_RULES,
  HOWTO_TAIWAN_STYLE_GUIDE,
  JAPANESE_USAGE_RULES,
  JAPANESE_READER_LENS,
  NATURAL_JAPANESE_RULES,
  REFERENCE_BOUNDARY,
  TRANSCREATION_RULES,
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
    EDITORIAL_JUDGMENT_RULES,
    DECISION_HELPING_RULES,
    JAPANESE_READER_LENS,
    NATURAL_JAPANESE_RULES,
    TRANSCREATION_RULES,
    HOWTO_TAIWAN_STYLE_GUIDE,
    ANTI_AI_RULES,
    FIDELITY_RULES,
    REFERENCE_BOUNDARY,
    TITLE_RULES,
    "Write as if the piece has been rewritten by an editor who has deeply internalized Howto Taiwan-style Japanese title habits and body habits.",
    "Prefer native-feeling Japanese travel-media wording over literal translation. The result should sound chosen, observed, reader-aware, and edited for Japanese reading habits.",
    "Keep the original reporting value, but rewrite the rhetoric so it no longer feels like Chinese travel copy carried into Japanese.",
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
    EDITORIAL_JUDGMENT_RULES,
    DECISION_HELPING_RULES,
    JAPANESE_READER_LENS,
    NATURAL_JAPANESE_RULES,
    TRANSCREATION_RULES,
    HOWTO_TAIWAN_STYLE_GUIDE,
    ANTI_AI_RULES,
    FIDELITY_RULES,
    TITLE_RULES,
    "Keep selected keywords only where they read naturally, especially in titles, headings, captions, and SEO descriptions.",
    "Focus on removing translationese, awkward collocations, and Chinese syntax residue.",
    "Make the writing feel like Howto Taiwan-style Japanese rewritten by a real editor, while preserving the source writer's intent and structure.",
    "Actively rewrite any phrase that sounds like AI translation, textbook Japanese, generic PR copy, or unnatural Chinese-to-Japanese transfer.",
    "If a sentence feels faithful but still reads like overseas media translated into Japanese, rewrite it more aggressively into Japanese editorial prose.",
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
    EDITORIAL_JUDGMENT_RULES,
    DECISION_HELPING_RULES,
    JAPANESE_READER_LENS,
    NATURAL_JAPANESE_RULES,
    TRANSCREATION_RULES,
    HOWTO_TAIWAN_STYLE_GUIDE,
    ANTI_AI_RULES,
    FIDELITY_RULES,
    REFERENCE_BOUNDARY,
    TITLE_RULES,
    "Write as if a Japanese editor has fully rewritten the article after studying Howto Taiwan-style Japanese title habits and body habits.",
    "Do not write like product copy. The result should read as if a human Japanese travel editor wrote it for this exact media voice.",
    "Preserve the original author's facts, observations, and practical information, but rewrite the rhetoric into natural Japanese editorial pacing.",
    "Do not let every recommendation land at the same intensity. Some items can sound essential, some easy to try, some better for a specific taste or timing.",
    "When the article is a recommendation list, help the reader choose by implying first picks, best-for-who distinctions, or easier entry points where the source supports that guidance.",
    "Keep this guidance inside the original article structure. Do not add extra ranking sections, editor memo blocks, or appended summaries that were not present in the source.",
    `Selected SEO keywords: ${selectedKeywords.join(", ") || "none"}`,
    "Use selected keywords only where they genuinely fit the content, especially in titles, headings, SEO descriptions, and captions. Never force keyword stuffing or awkward Japanese.",
    "If an exact keyword phrase feels too visible, reshape it into more natural Japanese and avoid repeating the same search form across nearby lines.",
    "Make the reader able to picture the scene, the taste, the texture, the buying situation, or the stay whenever the source gives enough material.",
    "Do not carry over Chinese emotional buildup line by line. Rebalance intensity so the finished article feels written for Japanese readers from the start.",
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
    "Use Howto Taiwan-style Japanese title habits: concrete subject first, then practical benefit, then a soft emotional hook.",
    "Keep each title compact and magazine-like. Avoid overloading one title with too many nouns, place names, or keyword fragments.",
    "Do not write like SEO-only title stuffing, catalog copy, or generic clickbait.",
    "All options must include or strongly reflect the selected keywords only where natural.",
    "The best title should feel like a trusted Taiwan friend giving a helpful invitation, not a loud clickbait ad.",
    "Return exactly three options with these focuses: stable, click, search.",
    `Original Chinese title: ${input.sourceTitle}`,
    `Current polished Japanese title: ${input.polishedTitle}`,
    `Selected keywords: ${input.selectedKeywords.join(", ") || "none"}`,
    "Output JSON with key options. Each option needs label, text, focus, and keywordsUsed."
  ].join("\n");
}

export function buildValidationPrompt(input: {
  sourceTitle: string;
  blocks: BulkPromptBlock[];
  selectedKeywords: string[];
}) {
  return [
    "Task: act as a strict Japanese editorial reviewer for a Taiwan travel media article.",
    "Judge whether this reads more like an article written or heavily edited by a Japanese travel editor, or more like an AI-translated article.",
    "Evaluate from the perspective of Japanese readers who are sensitive to travel-media tone.",
    "Check for AI feel, translation feel, keyword overexposure, unnatural diction, and whether the article truly sounds like Japanese editorial writing.",
    "If a block needs light improvement, rewrite only that block. Keep the original structure and meaning. Do not add new sections.",
    "Return a concise verdict, two scores, reader impression, a few short suggestions, and the final adjusted blocks.",
    `Original Chinese title: ${input.sourceTitle}`,
    `Selected keywords: ${input.selectedKeywords.join(", ") || "none"}`,
    `Current Japanese blocks: ${JSON.stringify(input.blocks)}`
  ].join("\n");
}
