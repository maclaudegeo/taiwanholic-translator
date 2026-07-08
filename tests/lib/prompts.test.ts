import {
  buildBulkTranslationPrompt,
  buildTitleOptionsPrompt,
  buildTranslationPrompt
} from "../../lib/prompts";

describe("buildTranslationPrompt", () => {
  it("includes concrete Howto Taiwan-style writing rules and anti-ai constraints", () => {
    const prompt = buildTranslationPrompt({
      blockType: "title",
      sourceText: "台北早餐推薦",
      selectedKeywords: ["台湾 朝ごはん"]
    });

    expect(prompt).toContain("Preserve the original meaning");
    expect(prompt).toContain("Howto Taiwan");
    expect(prompt).toContain("Do not write like product copy");
    expect(prompt).toContain("具体的な体験");
    expect(prompt).toContain("many blocks should use none");
    expect(prompt).toContain("not sentence-by-sentence translation");
    expect(prompt).toContain("Write with editorial judgment");
    expect(prompt).toContain("Help the reader decide");
    expect(prompt).toContain("Use a Japanese reader lens");
  });
});

describe("buildTitleOptionsPrompt", () => {
  it("asks for three title variants with the requested focuses", () => {
    const prompt = buildTitleOptionsPrompt({
      sourceTitle: "台北早餐推薦",
      polishedTitle: "台北で楽しむ朝ごはん案内",
      selectedKeywords: ["台湾 朝ごはん"]
    });

    expect(prompt).toContain("Return exactly three options");
    expect(prompt).toContain("stable, click, search");
    expect(prompt).toContain("Howto Taiwan-style Japanese title habits");
  });
});

describe("buildBulkTranslationPrompt", () => {
  it("asks for article-wide translation while preserving block ids and keyword fit", () => {
    const prompt = buildBulkTranslationPrompt({
      blocks: [
        {
          id: "title-1",
          type: "title",
          sourceText: "台北早餐推薦"
        },
        {
          id: "paragraph-1",
          type: "paragraph",
          sourceText: "這家店是很多在地人會去吃的早餐店。"
        }
      ],
      selectedKeywords: ["台湾 朝ごはん"]
    });

    expect(prompt).toContain("Preserve block ids");
    expect(prompt).toContain("Use selected keywords only where they genuinely fit");
    expect(prompt).toContain("Howto Taiwan");
    expect(prompt).toContain("Do not write like product copy");
    expect(prompt).toContain("reader able to picture");
    expect(prompt).toContain("Do not carry over Chinese emotional buildup line by line");
    expect(prompt).toContain("Do not let every recommendation land at the same intensity");
    expect(prompt).toContain("help the reader choose by implying first picks");
  });
});
