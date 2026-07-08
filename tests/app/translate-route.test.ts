import { POST as analyzePost } from "../../app/api/analyze/route";
import { POST as translatePost } from "../../app/api/translate/route";

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
});
