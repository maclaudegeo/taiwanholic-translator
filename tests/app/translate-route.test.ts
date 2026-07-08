import { POST as analyzePost } from "../../app/api/analyze/route";
import { POST as translatePost } from "../../app/api/translate/route";
import * as pipeline from "../../lib/translation-pipeline";

describe("POST /api/analyze", () => {
  it("rejects requests without a docx file", async () => {
    const request = {
      formData: async () => new FormData()
    } as Request;

    const response = await analyzePost(request);

    expect(response.status).toBe(400);
  });

  it("rejects non-docx uploads", async () => {
    const formData = new FormData();
    formData.set("file", new File(["hello"], "note.txt", { type: "text/plain" }));

    const request = {
      formData: async () => formData
    } as Request;

    const response = await analyzePost(request);

    expect(response.status).toBe(400);
  });
});

describe("POST /api/translate", () => {
  it("rejects requests without analyzed blocks", async () => {
    const request = {
      json: async () => ({ keywords: [] })
    } as Request;

    const response = await translatePost(request);

    expect(response.status).toBe(400);
  });

  it("maps provider quota errors to a friendly Chinese message", async () => {
    const translateSpy = vi
      .spyOn(pipeline, "translateArticleBlocks")
      .mockRejectedValueOnce(
        new Error(
          "All model providers failed. gemini: 429 RESOURCE_EXHAUSTED | openai: 429 You exceeded your current quota"
        )
      );

    const request = {
      json: async () => ({
        blocks: [
          {
            id: "p1",
            type: "paragraph",
            sourceText: "原文",
            translatedText: null,
            polishedText: null,
            trendSuggestions: [],
            notes: []
          }
        ],
        keywords: []
      })
    } as Request;

    const response = await translatePost(request);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toMatch(/翻譯服務暫時無法使用/);

    translateSpy.mockRestore();
  });
});
