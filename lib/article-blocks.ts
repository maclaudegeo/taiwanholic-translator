export type BlockType =
  | "title"
  | "seo_description"
  | "heading"
  | "paragraph"
  | "caption";

export type ArticleBlock = {
  id: string;
  type: BlockType;
  sourceText: string;
  translatedText: string | null;
  polishedText: string | null;
  trendSuggestions: string[];
  notes: string[];
};

export type KeywordSource = "article_core" | "google_trends" | "manual";

export type KeywordSuggestion = {
  phrase: string;
  phraseZh: string;
  source: KeywordSource;
  reason: string;
  selected: boolean;
};

export type TitleOption = {
  id: string;
  label: string;
  text: string;
  textZh: string;
  focus: string;
  keywordsUsed: string[];
};

export type ValidationReport = {
  verdict: string;
  japaneseEditorScore: number;
  aiFeelScore: number;
  readerImpression: string;
  suggestions: string[];
};

export type AnalysisPayload = {
  blocks: ArticleBlock[];
  keywords: KeywordSuggestion[];
};

export type TranslationPayload = {
  blocks: ArticleBlock[];
  keywords: KeywordSuggestion[];
  titleOptions: TitleOption[];
  validation: ValidationReport | null;
};

export function isTrendEligibleBlock(type: BlockType) {
  return type === "title" || type === "heading" || type === "seo_description";
}
