import {
  analyzeArticleBlocks,
  generateTitleOptions,
  translateArticleBlocks
} from "../../lib/translation-pipeline";
import { chunkArticleBlocks, mergeTranslatedBlocks } from "../../lib/translation-chunks";

describe("translateArticleBlocks", () => {
  it("runs only bulk translation during article translation", async () => {
    const callModel = vi
      .fn()
      .mockResolvedValueOnce({
        blocks: [
          {
            id: "title-1",
            text: "台湾 朝ごはんを楽しむ台北案内",
            notes: ["bulk polished"]
          }
        ]
      });

    const result = await translateArticleBlocks(
      [
        {
          id: "title-1",
          type: "title",
          sourceText: "台北早餐推薦",
          translatedText: null,
          polishedText: null,
          trendSuggestions: [],
          notes: []
        }
      ],
      {
        callModel,
        keywords: [
          {
            phrase: "台湾 朝ごはん",
            source: "google_trends",
            reason: "Recent Japan travel search phrase",
            selected: true
          }
        ]
      },
    );

    expect(callModel).toHaveBeenCalledTimes(1);
    expect(callModel.mock.calls[0]?.[0]?.kind).toBe("bulk_translation");
    expect(callModel.mock.calls[0]?.[0]?.prompt).toContain("title-1");
    expect(result.blocks[0]?.polishedText).toBe("台湾 朝ごはんを楽しむ台北案内");
    expect(result.blocks[0]?.trendSuggestions).toEqual(["台湾 朝ごはん"]);
    expect(result.blocks[0]?.notes).toEqual(["bulk polished"]);
    expect(result.keywords[0]?.phrase).toBe("台湾 朝ごはん");
    expect(result.titleOptions).toEqual([]);
    expect(result.validation).toBeNull();
  });

  it("falls back gracefully when the model returns an empty block text", async () => {
    const callModel = vi
      .fn()
      .mockResolvedValueOnce({
        blocks: [
          {
            id: "title-1",
            text: "",
            notes: []
          }
        ]
      });

    const result = await translateArticleBlocks(
      [
        {
          id: "title-1",
          type: "title",
          sourceText: "台北早餐推薦",
          translatedText: null,
          polishedText: null,
          trendSuggestions: [],
          notes: []
        }
      ],
      {
        callModel,
        keywords: []
      },
    );

    expect(result.blocks[0]?.polishedText).toBe("台北早餐推薦");
    expect(result.blocks[0]?.translatedText).toBe("台北早餐推薦");
    expect(result.blocks[0]?.notes).toContain("bulk translation fallback applied");
  });

  it("generates stable title option ids when the model does not return them", async () => {
    const callModel = vi
      .fn()
      .mockResolvedValueOnce({
        options: [
          {
            label: "穩健型",
            text: "台北で楽しむ朝ごはん案内",
            focus: "穩健型",
            keywordsUsed: ["台湾 朝ごはん"]
          },
          {
            label: "吸引型",
            text: "台湾らしい朝を楽しむなら 台北朝ごはん案内",
            focus: "吸引型",
            keywordsUsed: ["台湾 朝ごはん"]
          },
          {
            label: "搜尋型",
            text: "台北 朝ごはん おすすめ 台湾旅行で外せない一軒",
            focus: "搜尋型",
            keywordsUsed: ["台湾 朝ごはん"]
          }
        ]
      });

    const result = await generateTitleOptions(
      [
        {
          id: "title-1",
          type: "title",
          sourceText: "台北早餐推薦",
          translatedText: "台湾 朝ごはんを楽しむ台北案内",
          polishedText: "台湾 朝ごはんを楽しむ台北案内",
          trendSuggestions: [],
          notes: []
        }
      ],
      {
        callModel,
        keywords: []
      },
    );

    expect(result).toHaveLength(3);
    expect(result.map((option) => option.id)).toEqual([
      "title-option-1",
      "title-option-2",
      "title-option-3"
    ]);
  });

  it("translates the provided chunk in a single bulk call", async () => {
    const callModel = vi
      .fn()
      .mockResolvedValueOnce({
        blocks: [
          {
            id: "paragraph-1",
            text: "一段目",
            notes: []
          },
          {
            id: "paragraph-2",
            text: "二段目",
            notes: []
          }
        ]
      });

    const result = await translateArticleBlocks(
      [
        {
          id: "paragraph-1",
          type: "paragraph",
          sourceText: "甲".repeat(2600),
          translatedText: null,
          polishedText: null,
          trendSuggestions: [],
          notes: []
        },
        {
          id: "paragraph-2",
          type: "paragraph",
          sourceText: "乙".repeat(2600),
          translatedText: null,
          polishedText: null,
          trendSuggestions: [],
          notes: []
        }
      ],
      {
        callModel,
        keywords: []
      },
    );

    expect(callModel).toHaveBeenCalledTimes(1);
    expect(callModel.mock.calls[0]?.[0]?.kind).toBe("bulk_translation");
    expect(result.blocks.map((block) => block.polishedText)).toEqual(["一段目", "二段目"]);
  });

  it("normalizes note strings from the model into arrays", async () => {
    const callModel = vi
      .fn()
      .mockResolvedValueOnce({
        blocks: [
          {
            id: "title-1",
            text: "台北の朝ごはん案内",
            notes: "rewritten for tone"
          }
        ]
      });

    const result = await translateArticleBlocks(
      [
        {
          id: "title-1",
          type: "title",
          sourceText: "台北早餐推薦",
          translatedText: null,
          polishedText: null,
          trendSuggestions: [],
          notes: []
        }
      ],
      {
        callModel: callModel as never,
        keywords: []
      },
    );

    expect(result.blocks[0]?.notes).toEqual(["rewritten for tone"]);
  });
});

describe("chunkArticleBlocks", () => {
  it("splits long articles into multiple chunks for client-side translation", () => {
    const chunks = chunkArticleBlocks([
      {
        id: "paragraph-1",
        type: "paragraph",
        sourceText: "甲".repeat(4000),
        translatedText: null,
        polishedText: null,
        trendSuggestions: [],
        notes: []
      },
      {
        id: "paragraph-2",
        type: "paragraph",
        sourceText: "乙".repeat(4000),
        translatedText: null,
        polishedText: null,
        trendSuggestions: [],
        notes: []
      }
    ]);

    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks[0]?.[0]?.id).toContain("paragraph-1");
    expect(chunks.some((chunk) => chunk[0]?.id.includes("paragraph-2"))).toBe(true);
  });

  it("merges split translated parts back into original blocks", () => {
    const merged = mergeTranslatedBlocks([
      {
        id: "paragraph-1__part_1",
        type: "paragraph",
        sourceText: "第一段前半",
        translatedText: "前半です。",
        polishedText: "前半です。",
        trendSuggestions: ["台湾旅行"],
        notes: ["part1"]
      },
      {
        id: "paragraph-1__part_2",
        type: "paragraph",
        sourceText: "第一段後半",
        translatedText: "後半です。",
        polishedText: "後半です。",
        trendSuggestions: ["台北グルメ"],
        notes: ["part2"]
      }
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe("paragraph-1");
    expect(merged[0]?.translatedText).toContain("前半です。");
    expect(merged[0]?.translatedText).toContain("後半です。");
    expect(merged[0]?.trendSuggestions).toEqual(["台湾旅行", "台北グルメ"]);
    expect(merged[0]?.notes).toEqual(["part1", "part2"]);
  });
});

describe("analyzeArticleBlocks", () => {
  it("falls back to trend candidates when the model returns no keywords", async () => {
    const callModel = vi.fn().mockResolvedValueOnce({
      keywords: []
    });

    const result = await analyzeArticleBlocks(
      [
        {
          id: "title-1",
          type: "title",
          sourceText: "台北早餐推薦",
          translatedText: null,
          polishedText: null,
          trendSuggestions: [],
          notes: []
        }
      ],
      {
        callModel,
        includeTrendSuggestions: true
      }
    );

    expect(result.keywords.length).toBeGreaterThan(0);
    expect(result.keywords[0]?.phrase).toBeTruthy();
    expect(result.keywords[0]?.source).toBe("google_trends");
  });
});
