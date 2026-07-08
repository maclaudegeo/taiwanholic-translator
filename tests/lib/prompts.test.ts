import {
  buildBulkTranslationPrompt,
  buildTitleOptionsPrompt,
  buildTranslationPrompt
} from "../../lib/prompts";

describe("buildTranslationPrompt", () => {
  it("includes the fidelity rule and Taiwan-friend editorial tone", () => {
    const prompt = buildTranslationPrompt({
      blockType: "title",
      sourceText: "台北早餐推薦",
      selectedKeywords: ["台湾 朝ごはん"]
    });

    expect(prompt).toContain("Preserve the original meaning");
    expect(prompt).toContain("trusted Taiwan-savvy friend");
    expect(prompt).toContain("Howto Taiwan articles");
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
    expect(prompt).toContain("Howto Taiwan articles");
  });
});
