import type { ArticleBlock } from "./article-blocks";

export const MAX_BULK_TRANSLATION_CHARS = 1200;
export const MAX_BULK_TRANSLATION_BLOCKS = 1;
const SPLITTABLE_TYPES = new Set<ArticleBlock["type"]>(["paragraph", "seo_description", "caption"]);

function splitTextByLength(text: string, maxChars: number) {
  const normalized = text.replace(/\r\n/g, "\n");
  const sentences = normalized.match(/[^。！？!? \n]+[。！？!?]?|\n+/g) ?? [normalized];
  const parts: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length <= maxChars) {
      current += sentence;
      continue;
    }

    if (current.trim()) {
      parts.push(current.trim());
      current = "";
    }

    if (sentence.length <= maxChars) {
      current = sentence;
      continue;
    }

    let offset = 0;

    while (offset < sentence.length) {
      parts.push(sentence.slice(offset, offset + maxChars).trim());
      offset += maxChars;
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts.filter(Boolean);
}

function splitOversizedBlock(block: ArticleBlock) {
  if (
    block.sourceText.length <= MAX_BULK_TRANSLATION_CHARS ||
    !SPLITTABLE_TYPES.has(block.type)
  ) {
    return [block];
  }

  const parts = splitTextByLength(block.sourceText, MAX_BULK_TRANSLATION_CHARS);

  if (parts.length <= 1) {
    return [block];
  }

  return parts.map((part, index) => ({
    ...block,
    id: `${block.id}__part_${index + 1}`,
    sourceText: part,
    translatedText: null,
    polishedText: null,
    trendSuggestions: [],
    notes: []
  }));
}

export function chunkArticleBlocks(blocks: ArticleBlock[]) {
  const expandedBlocks = blocks.flatMap(splitOversizedBlock);
  const chunks: ArticleBlock[][] = [];
  let currentChunk: ArticleBlock[] = [];
  let currentChars = 0;

  for (const block of expandedBlocks) {
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

export function mergeTranslatedBlocks(blocks: ArticleBlock[]) {
  const merged: ArticleBlock[] = [];
  const map = new Map<string, ArticleBlock>();

  const appendText = (current: string | null, next: string | null) => {
    const left = current?.trim() ?? "";
    const right = next?.trim() ?? "";

    if (!left) {
      return right;
    }

    if (!right) {
      return left;
    }

    return `${left}\n${right}`;
  };

  for (const block of blocks) {
    const match = block.id.match(/^(.*)__part_(\d+)$/);

    if (!match) {
      merged.push(block);
      continue;
    }

    const baseId = match[1] ?? block.id;
    const existing = map.get(baseId);

    if (!existing) {
      const nextBlock = {
        ...block,
        id: baseId
      };
      map.set(baseId, nextBlock);
      merged.push(nextBlock);
      continue;
    }

    existing.sourceText = appendText(existing.sourceText, block.sourceText);
    existing.translatedText = appendText(existing.translatedText, block.translatedText);
    existing.polishedText = appendText(existing.polishedText, block.polishedText);
    existing.trendSuggestions = Array.from(
      new Set([...existing.trendSuggestions, ...block.trendSuggestions])
    );
    existing.notes = [...existing.notes, ...block.notes];
  }

  return merged;
}
