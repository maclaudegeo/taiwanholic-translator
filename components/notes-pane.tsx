"use client";

import { useState } from "react";
import type { ArticleBlock, KeywordSuggestion } from "../lib/article-blocks";

type NotesPaneProps = {
  blocks: ArticleBlock[];
  isPending: boolean;
  keywords: KeywordSuggestion[];
  onAddManualKeyword: (phrase: string) => void;
  onTranslate: () => void;
  onToggleKeyword: (phrase: string, nextSelected: boolean) => void;
};

function keywordSourceLabel(source: KeywordSuggestion["source"]) {
  switch (source) {
    case "article_core":
      return "文章核心";
    case "google_trends":
      return "Google Trends";
    case "manual":
      return "手動新增";
    default:
      return source;
  }
}

function keywordGroupTitle(source: KeywordSuggestion["source"]) {
  switch (source) {
    case "article_core":
      return "文章 SEO 建議";
    case "google_trends":
      return "Google Trends（日文旅遊搜尋）";
    case "manual":
      return "手動新增（日文）";
    default:
      return source;
  }
}

function localizeKeywordReason(keyword: KeywordSuggestion) {
  const reason = keyword.reason.trim();

  if (!reason) {
    return keyword.source === "google_trends"
      ? "這是近期日本旅遊搜尋常見的日文詞，和這篇文章主題也能自然搭配。"
      : "這個詞和文章主題關聯高，放進日文標題或內文都會很自然。";
  }

  const normalized = reason.toLowerCase();

  if (
    normalized.includes("broad, high-volume term") ||
    normalized.includes("recent japan travel search phrase") ||
    normalized.includes("good general keyword")
  ) {
    return "這是搜尋量較高、也很常見的旅遊關鍵字，適合放在標題或前段。";
  }

  if (
    normalized.includes("highly relevant") ||
    normalized.includes("targets food enthusiasts") ||
    normalized.includes("must-eat list") ||
    normalized.includes("article is a")
  ) {
    return "這個詞和文章內容非常貼近，也比較容易吸引正在找這類資訊的讀者。";
  }

  if (normalized.includes("emphasizes the food aspect")) {
    return "這個詞能更清楚帶出美食重點，和文章主軸很搭。";
  }

  if (
    normalized.includes("記事全体") ||
    normalized.includes("記事構成") ||
    normalized.includes("見出し") ||
    normalized.includes("導入文") ||
    normalized.includes("自然に合い") ||
    normalized.includes("一致度") ||
    normalized.includes("読者") ||
    normalized.includes("内容")
  ) {
    return keyword.source === "google_trends"
      ? "這個詞和這篇文章主題相符，也適合拿來強化搜尋表現。"
      : "這個詞能準確代表文章內容，放進對應段落會比較自然。";
  }

  return keyword.source === "google_trends"
    ? "這是可搭配文章使用的日文搜尋詞，建議只在自然的地方帶入，不需要硬塞。"
    : "這是文章本身很適合延伸使用的關鍵字，系統翻譯時會盡量自然帶入。";
}

function keywordPlacementLabel(keyword: KeywordSuggestion, index: number) {
  if (keyword.source === "manual") {
    return "手動補充";
  }

  if (keyword.source === "google_trends") {
    return index === 0 ? "建議放標題或首段" : "可放小標或內文";
  }

  if (index === 0) {
    return "建議放標題";
  }

  if (index === 1) {
    return "建議放小標";
  }

  if (index === 2) {
    return "建議放首段";
  }

  return "可放內文或圖說";
}

export function NotesPane({
  blocks,
  isPending,
  keywords,
  onAddManualKeyword,
  onTranslate,
  onToggleKeyword,
}: NotesPaneProps) {
  const [manualKeyword, setManualKeyword] = useState("");
  const groupedKeywords = {
    article_core: keywords.filter((keyword) => keyword.source === "article_core").slice(0, 4),
    google_trends: keywords.filter((keyword) => keyword.source === "google_trends").slice(0, 5),
    manual: keywords.filter((keyword) => keyword.source === "manual")
  };

  return (
    <section className="panel" aria-label="Editorial notes">
      <div className="section-heading">
        <h2>選關鍵字</h2>
        <p className="subtle">
          每張關鍵字卡片都可以直接點選。保留你想用的詞，系統翻譯時會自然帶入，不會硬塞。
        </p>
      </div>

      {keywords.length > 0 ? (
        <div className="notes-list">
          <article className="note-card keyword-card">
            {(["google_trends", "article_core", "manual"] as const).map((source) =>
              groupedKeywords[source].length > 0 ? (
                <section key={source} className="keyword-group">
                  <div className="keyword-group-head">
                    <h4>{keywordGroupTitle(source)}</h4>
                  </div>
                  <div className="keyword-list">
                    {groupedKeywords[source].map((keyword, index) => (
                      <label
                        key={`${keyword.source}-${keyword.phrase}`}
                        className={`keyword-option ${keyword.selected ? "keyword-option-selected" : ""}`}
                      >
                        {source === "manual" ? null : (
                          <input
                            type="checkbox"
                            checked={keyword.selected}
                            disabled={isPending}
                            onChange={(event) =>
                              onToggleKeyword(keyword.phrase, event.currentTarget.checked)
                            }
                          />
                        )}
                        <div>
                          <div className="keyword-line">
                            <strong>{keyword.phrase}</strong>
                            <span className="placement-chip">
                              {keywordPlacementLabel(keyword, index)}
                            </span>
                          </div>
                          <p className="keyword-reason">
                            [{keywordSourceLabel(keyword.source)}] {localizeKeywordReason(keyword)}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>
              ) : null
            )}

            <section className="keyword-group">
              <div className="keyword-group-head">
                <h4>手動補詞空白格</h4>
              </div>
              <div className="manual-keyword-row">
                <input
                  className="text-input"
                  type="text"
                  value={manualKeyword}
                  placeholder="手動加入你想補的日文關鍵字"
                  onChange={(event) => setManualKeyword(event.currentTarget.value)}
                />
                <button
                  className="secondary-button inline-button"
                  type="button"
                  disabled={isPending || manualKeyword.trim().length === 0}
                  onClick={() => {
                    onAddManualKeyword(manualKeyword);
                    setManualKeyword("");
                  }}
                >
                  加入
                </button>
              </div>
            </section>

            <button
              className="primary-button translate-button"
              type="button"
              disabled={isPending || blocks.length === 0}
              onClick={onTranslate}
            >
              {isPending ? "翻譯中..." : "翻成日文"}
            </button>
          </article>
        </div>
      ) : null}
    </section>
  );
}
