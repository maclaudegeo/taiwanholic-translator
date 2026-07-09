import type { ArticleBlock } from "../../../lib/article-blocks";
import { formatServiceError } from "../../../lib/api-errors";
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

    if (parsedBlocks.length === 0) {
      return Response.json(
        {
          error:
            "這份 .docx 目前沒有讀到可翻譯文字。常見原因是內容放在圖片、文字方塊或特殊版型裡。你可以先把文章內容改成一般段落或表格後再試一次。"
        },
        { status: 422 }
      );
    }

    const analysis = await analyzeArticleBlocks(createEmptyBlocks(parsedBlocks), {
      includeTrendSuggestions
    });

    return Response.json(analysis);
  } catch (error) {
    const message = formatServiceError(error, "目前無法處理這份上傳檔案。");

    return Response.json({ error: message }, { status: 500 });
  }
}
