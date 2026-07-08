import googleTrends from "google-trends-api";

const DEFAULT_KEYWORD_BANK = [
  "台湾旅行",
  "台北グルメ",
  "台湾カフェ",
  "九份",
  "台南旅行",
  "台湾朝ごはん",
  "夜市",
  "迪化街",
  "台湾おみやげ"
];

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

export async function fetchTrendCandidates(sourceText: string | string[]) {
  const primaryQuery = Array.isArray(sourceText)
    ? sourceText.find((item) => item.trim().length > 0) ?? DEFAULT_KEYWORD_BANK[0]
    : sourceText;

  try {
    const response = await googleTrends.relatedQueries({
      keyword: primaryQuery.slice(0, 80),
      geo: "JP",
      hl: "ja"
    });
    const parsed = JSON.parse(response) as {
      default?: {
        rankedList?: Array<{
          rankedKeyword?: Array<{ query?: string }>;
        }>;
      };
    };

    const related = parsed.default?.rankedList
      ?.flatMap((entry) => entry.rankedKeyword ?? [])
      .map((item) => item.query)
      .filter((query): query is string => Boolean(query))
      .slice(0, 8);

    return unique([...(related ?? []), ...DEFAULT_KEYWORD_BANK]).slice(0, 12);
  } catch {
    return DEFAULT_KEYWORD_BANK;
  }
}
