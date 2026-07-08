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
      })
      .mockResolvedValueOnce({
        verdict: "日本編集者がかなり手を入れた記事に見えます。",
        japaneseEditorScore: 9.2,
        aiFeelScore: 2.1,
        readerImpression: "一般の日本読者には自然に読まれそうです。",
        suggestions: ["キーワードの露出はかなり抑えられています。"],
        blocks: [
          {
            id: "title-1",
            text: "台湾 朝ごはんを楽しむ台北案内",
            notes: ["validated by reviewer"]
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

    expect(callModel).toHaveBeenCalledTimes(3);
    expect(callModel.mock.calls[0]?.[0]?.kind).toBe("bulk_translation");
    expect(callModel.mock.calls[1]?.[0]?.kind).toBe("titles");
    expect(callModel.mock.calls[2]?.[0]?.kind).toBe("validation");
    expect(callModel.mock.calls[0]?.[0]?.prompt).toContain("title-1");
    expect(result.blocks[0]?.polishedText).toBe("台湾 朝ごはんを楽しむ台北案内");
    expect(result.blocks[0]?.trendSuggestions).toEqual(["台湾 朝ごはん"]);
    expect(result.blocks[0]?.notes).toEqual([
      "bulk polished",
      "validated by reviewer"
    ]);
    expect(result.keywords[0]?.phrase).toBe("台湾 朝ごはん");
    expect(result.titleOptions).toHaveLength(3);
    expect(result.validation?.japaneseEditorScore).toBe(9);
    expect(result.validation?.aiFeelScore).toBe(2);
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
      })
      .mockResolvedValueOnce({
        verdict: "翻訳感がやや残ります。",
        japaneseEditorScore: 7.4,
        aiFeelScore: 4.2,
        readerImpression: "やや翻訳記事らしさがあります。",
        suggestions: ["冒頭の語順を少し自然にするとよいでしょう。"],
        blocks: [
          {
            id: "title-1",
            text: "台北早餐推薦",
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

  it("keeps the translation when validation omits scores and blocks", async () => {
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
      })
      .mockResolvedValueOnce({
        verdict: "校正コメントのみ返しました。"
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

    expect(result.blocks[0]?.polishedText).toBe("台湾 朝ごはんを楽しむ台北案内");
    expect(result.blocks[0]?.notes).toEqual(["bulk polished"]);
    expect(result.validation?.verdict).toBe("校正コメントのみ返しました。");
    expect(result.validation?.japaneseEditorScore).toBe(8);
    expect(result.validation?.aiFeelScore).toBe(3);
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
      })
      .mockResolvedValueOnce({
        verdict: "日本記事として自然です。",
        japaneseEditorScore: 8.6,
        aiFeelScore: 2.8,
        readerImpression: "十分自然に読めます。",
        suggestions: [],
        blocks: [
          {
            id: "title-1",
            text: "台湾 朝ごはんを楽しむ台北案内",
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
      })
      .mockResolvedValueOnce({
        verdict: "自然な長文記事です。",
        japaneseEditorScore: 8.5,
        aiFeelScore: 2.5,
        readerImpression: "読みやすいです。",
        suggestions: [],
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

    expect(callModel).toHaveBeenCalledTimes(4);
    expect(callModel.mock.calls[0]?.[0]?.kind).toBe("bulk_translation");
    expect(callModel.mock.calls[1]?.[0]?.kind).toBe("bulk_translation");
    expect(callModel.mock.calls[2]?.[0]?.kind).toBe("titles");
    expect(callModel.mock.calls[3]?.[0]?.kind).toBe("validation");
    expect(result.blocks.map((block) => block.polishedText)).toEqual(["一段目", "二段目"]);
  });

  it("translates long-article chunks with limited parallelism to reduce timeout risk", async () => {
    let activeBulkCalls = 0;
    let maxConcurrentBulkCalls = 0;

    const callModel = vi.fn(async (input: { kind: string; prompt: string }) => {
      if (input.kind === "bulk_translation") {
        activeBulkCalls += 1;
        maxConcurrentBulkCalls = Math.max(
          maxConcurrentBulkCalls,
          activeBulkCalls
        );

        const ids = Array.from(input.prompt.matchAll(/"id":"([^"]+)"/g)).map(
          (match) => match[1] ?? ""
        );

        await new Promise((resolve) => setTimeout(resolve, 20));

        activeBulkCalls -= 1;

        return {
          blocks: ids.map((id) => ({
            id,
            text: `${id}-ja`,
            notes: []
          }))
        };
      }

      if (input.kind === "titles") {
        return {
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
        };
      }

      return {
        verdict: "自然な長文記事です。",
        japaneseEditorScore: 8.5,
        aiFeelScore: 2.5,
        readerImpression: "読みやすいです。",
        suggestions: [],
        blocks: [
          {
            id: "paragraph-1",
            text: "paragraph-1-ja",
            notes: []
          },
          {
            id: "paragraph-2",
            text: "paragraph-2-ja",
            notes: []
          },
          {
            id: "paragraph-3",
            text: "paragraph-3-ja",
            notes: []
          }
        ]
      };
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
        },
        {
          id: "paragraph-3",
          type: "paragraph",
          sourceText: "丙".repeat(2600),
          translatedText: null,
          polishedText: null,
          trendSuggestions: [],
          notes: []
        }
      ],
      {
        callModel,
        keywords: []
      }
    );

    expect(maxConcurrentBulkCalls).toBeGreaterThan(1);
    expect(result.blocks.map((block) => block.polishedText)).toEqual([
      "paragraph-1-ja",
      "paragraph-2-ja",
      "paragraph-3-ja"
    ]);
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
      })
      .mockResolvedValueOnce({
        verdict: "十分自然です。",
        japaneseEditorScore: 8.8,
        aiFeelScore: 2.4,
        readerImpression: "AI感は強くありません。",
        suggestions: [],
        blocks: [
          {
            id: "title-1",
            text: "台北の朝ごはん案内",
            notes: "reviewed and validated"
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

    expect(result.blocks[0]?.notes).toEqual([
      "rewritten for tone",
      "reviewed and validated"
    ]);
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
