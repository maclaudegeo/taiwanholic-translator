import type { ArticleBlock } from "../../lib/article-blocks";

export const sampleBlocks: ArticleBlock[] = [
  {
    id: "title-1",
    type: "title",
    sourceText: "台北早餐推薦",
    translatedText: "台北朝ごはんガイド",
    polishedText: "台北で楽しむ朝ごはん案内",
    trendSuggestions: ["台湾 朝ごはん"],
    notes: ["Title sharpened for Japanese travel readers."]
  },
  {
    id: "paragraph-2",
    type: "paragraph",
    sourceText: "先從台灣早晨開始。",
    translatedText: "まずは台湾の朝から始めましょう。",
    polishedText: "まずは台湾らしい朝の時間から旅を始めましょう。",
    trendSuggestions: [],
    notes: []
  }
];
