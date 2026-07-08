import { z } from "zod";
import { buildDocxBuffer } from "../../../lib/docx-exporter";

const blockSchema = z.object({
  id: z.string(),
  type: z.enum(["title", "seo_description", "heading", "paragraph", "caption"]),
  sourceText: z.string(),
  translatedText: z.string().nullable(),
  polishedText: z.string().nullable(),
  trendSuggestions: z.array(z.string()),
  notes: z.array(z.string())
});

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const payloadSchema = z.object({
      blocks: z.array(blockSchema).min(1),
      titleOverride: z.string().optional()
    });

    let payload: z.infer<typeof payloadSchema>;
    let originalBuffer: Buffer | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      payload = payloadSchema.parse({
        blocks: JSON.parse(String(formData.get("blocks") ?? "[]")),
        titleOverride:
          typeof formData.get("titleOverride") === "string"
            ? String(formData.get("titleOverride"))
            : undefined
      });

      const file = formData.get("file");

      if (file instanceof File) {
        const fileBuffer =
          typeof file.arrayBuffer === "function"
            ? await file.arrayBuffer()
            : await new Response(file).arrayBuffer();
        originalBuffer = Buffer.from(fileBuffer);
      }
    } else {
      payload = payloadSchema.parse(await request.json());
    }

    const buffer = await buildDocxBuffer(
      payload.blocks,
      payload.titleOverride,
      originalBuffer
    );

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition":
          'attachment; filename="translated-article.docx"'
      }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "目前無法建立匯出檔案。";

    return Response.json({ error: message }, { status: 400 });
  }
}
