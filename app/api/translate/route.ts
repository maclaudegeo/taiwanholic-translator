import { z } from "zod";
import { formatServiceError } from "../../../lib/api-errors";
import { translateArticleBlocks } from "../../../lib/translation-pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const requestSchema = z.object({
  blocks: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["title", "seo_description", "heading", "paragraph", "caption"]),
      sourceText: z.string(),
      translatedText: z.string().nullable(),
      polishedText: z.string().nullable(),
      trendSuggestions: z.array(z.string()),
      notes: z.array(z.string())
    })
  ).min(1),
  keywords: z.array(
    z.object({
      phrase: z.string().min(1),
      phraseZh: z.string().min(1),
      source: z.enum(["article_core", "google_trends", "manual"]),
      reason: z.string(),
      selected: z.boolean()
    })
  ).default([])
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = requestSchema.safeParse(json);

    if (!payload.success) {
      return Response.json(
        { error: "請先完成文章分析，再用已選關鍵字開始翻譯。" },
        { status: 400 }
      );
    }

    const translatedPayload = await translateArticleBlocks(payload.data.blocks, {
      keywords: payload.data.keywords
    });

    return Response.json(translatedPayload);
  } catch (error) {
    const message = formatServiceError(error, "目前無法完成翻譯。");

    return Response.json({ error: message }, { status: 500 });
  }
}
