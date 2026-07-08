import type { ArticleBlock } from "../../../lib/article-blocks";
import { parseDocxBuffer } from "../../../lib/docx-parser";
import { analyzeArticleBlocks } from "../../../lib/translation-pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function createEmptyBlocks(blocks: ArticleBlock[]) {
  return blocks.map((block) => ({
    ...block,
    translatedText: null,
    polishedText: null,
    trendSuggestions: [],
    notes: []
  }));
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const includeTrendSuggestions =
    formData.get("includeTrendSuggestions") === "true";

  if (!(file instanceof File)) {
    return Response.json(
      { error: "請上傳 .docx 檔案。" },
      { status: 400 }
    );
  }

  if (!file.name.toLowerCase().endsWith(".docx")) {
    return Response.json(
      { error: "第一版只支援 .docx 檔案。" },
      { status: 400 }
    );
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const parsedBlocks = await parseDocxBuffer(arrayBuffer);
    const analysis = await analyzeArticleBlocks(createEmptyBlocks(parsedBlocks), {
      includeTrendSuggestions
    });

    return Response.json(analysis);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "目前無法處理這份上傳檔案。";

    return Response.json({ error: message }, { status: 500 });
  }
}
