import type { ArticleBlock } from "./article-blocks";

export const MAX_BULK_TRANSLATION_CHARS = 6000;
export const MAX_BULK_TRANSLATION_BLOCKS = 12;

export function chunkArticleBlocks(blocks: ArticleBlock[]) {
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
