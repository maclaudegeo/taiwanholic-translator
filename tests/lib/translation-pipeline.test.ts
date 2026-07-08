import {
  analyzeArticleBlocks,
  translateArticleBlocks
} from "../../lib/translation-pipeline";

describe("translateArticleBlocks", () => {
  it("runs bulk translation then title generation in order", async () => {
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
      })
      .mockResolvedValueOnce({
        options: [
          {
            id: "stable",
            label: "穩健型",
            text: "台北で楽しむ朝ごはん案内",
            focus: "穩健型",
            keywordsUsed: ["台湾 朝ごはん"]
          },
          {
            id: "click",
            label: "吸引型",
            text: "台湾らしい朝を楽しむなら 台北朝ごはん案内",
            focus: "吸引型",
            keywordsUsed: ["台湾 朝ごはん"]
          },
          {
            id: "search",
            label: "搜尋型",
            text: "台北 朝ごはん おすすめ 台湾旅行で外せない一軒",
            focus: "搜尋型",
            keywordsUsed: ["台湾 朝ごはん"]
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

    expect(callModel).toHaveBeenCalledTimes(2);
    expect(callModel.mock.calls[0]?.[0]?.kind).toBe("bulk_translation");
    expect(callModel.mock.calls[1]?.[0]?.kind).toBe("titles");
    expect(callModel.mock.calls[0]?.[0]?.prompt).toContain("title-1");
    expect(result.blocks[0]?.polishedText).toBe("台湾 朝ごはんを楽しむ台北案内");
    expect(result.blocks[0]?.trendSuggestions).toEqual(["台湾 朝ごはん"]);
    expect(result.blocks[0]?.notes).toEqual(["bulk polished"]);
    expect(result.keywords[0]?.phrase).toBe("台湾 朝ごはん");
    expect(result.titleOptions).toHaveLength(3);
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
      })
      .mockResolvedValueOnce({
        options: [
          {
            id: "stable",
            label: "穩健型",
            text: "台北で楽しむ朝ごはん案内",
            focus: "穩健型",
            keywordsUsed: []
          },
          {
            id: "click",
            label: "吸引型",
            text: "台湾らしい朝を楽しむなら 台北朝ごはん案内",
            focus: "吸引型",
            keywordsUsed: []
          },
          {
            id: "search",
            label: "搜尋型",
            text: "台北 朝ごはん おすすめ 台湾旅行で外せない一軒",
            focus: "搜尋型",
            keywordsUsed: []
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
        blocks: [
          {
            id: "title-1",
            text: "台湾 朝ごはんを楽しむ台北案内",
            notes: []
          }
        ]
      })
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

    expect(result.titleOptions).toHaveLength(3);
    expect(result.titleOptions.map((option) => option.id)).toEqual([
      "title-option-1",
      "title-option-2",
      "title-option-3"
    ]);
  });

  it("splits very long articles into a few bulk translation batches", async () => {
    const callModel = vi
      .fn()
      .mockResolvedValueOnce({
        blocks: [
          {
            id: "paragraph-1",
            text: "一段目",
            notes: []
          }
        ]
      })
      .mockResolvedValueOnce({
        blocks: [
          {
            id: "paragraph-2",
            text: "二段目",
            notes: []
          }
        ]
      })
      .mockResolvedValueOnce({
        options: [
          {
            id: "stable",
            label: "穩健型",
            text: "長文記事のまとめ",
            focus: "穩健型",
            keywordsUsed: []
          },
          {
            id: "click",
            label: "吸引型",
            text: "台湾の魅力がもっと見えてくる長文記事",
            focus: "吸引型",
            keywordsUsed: []
          },
          {
            id: "search",
            label: "搜尋型",
            text: "台湾旅行 おすすめ 長文ガイド",
            focus: "搜尋型",
            keywordsUsed: []
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

    expect(callModel).toHaveBeenCalledTimes(3);
    expect(callModel.mock.calls[0]?.[0]?.kind).toBe("bulk_translation");
    expect(callModel.mock.calls[1]?.[0]?.kind).toBe("bulk_translation");
    expect(callModel.mock.calls[2]?.[0]?.kind).toBe("titles");
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
      })
      .mockResolvedValueOnce({
        options: [
          {
            id: "stable",
            label: "穩健型",
            text: "台北で楽しむ朝ごはん案内",
            focus: "穩健型",
            keywordsUsed: []
          },
          {
            id: "click",
            label: "吸引型",
            text: "台湾らしい朝を楽しむなら 台北朝ごはん案内",
            focus: "吸引型",
            keywordsUsed: []
          },
          {
            id: "search",
            label: "搜尋型",
            text: "台北 朝ごはん おすすめ 台湾旅行で外せない一軒",
            focus: "搜尋型",
            keywordsUsed: []
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
