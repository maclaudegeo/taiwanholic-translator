import { POST as exportPost } from "../../app/api/export/route";

describe("POST /api/export", () => {
  it("accepts multipart form data with the original docx file", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File([new Uint8Array([1, 2, 3])], "article.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      })
    );
    formData.set(
      "blocks",
      JSON.stringify([
        {
          id: "title-1",
          type: "title",
          sourceText: "原始標題",
          translatedText: "翻譯標題",
          polishedText: "翻譯標題",
          trendSuggestions: [],
          notes: []
        }
      ])
    );
    formData.set("titleOverride", "自訂標題");

    const request = {
      headers: new Headers({
        "content-type": "multipart/form-data; boundary=test-boundary"
      }),
      formData: async () => formData
    } as unknown as Request;

    const response = await exportPost(request);
    expect(response.status).toBe(200);
    expect(
      response.headers.get("content-type")
    ).toContain(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });
});
