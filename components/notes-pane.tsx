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
      ? "最近の日本語旅行検索でよく見られる語で、このテーマにも自然になじみます。"
      : "記事テーマとの関連が強く、日本語本文にも自然に入れやすい語です。";
  }

  const normalized = reason.toLowerCase();

  if (normalized.includes("broad, high-volume term")) {
    return "検索量の大きい定番語で、台湾旅行の記事テーマにもそのまま結びつきます。";
  }

  if (normalized.includes("highly relevant") && normalized.includes("targets food enthusiasts")) {
    return "記事テーマとの相性が高く、台北グルメを探す読者にもそのまま届きやすい語です。";
  }

  if (normalized.includes("emphasizes the food aspect")) {
    return "台湾グルメ旅という印象をはっきり出せるので、今回の記事の軸とよく合います。";
  }

  if (normalized.includes("recent japan travel search phrase")) {
    return "最近の旅行検索でも使われやすく、タイトルや本文にも自然に入れやすい語です。";
  }

  return reason;
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
          你只需要選 Google Trend 關鍵字。文章相關詞會直接告訴你建議放哪裡，翻譯時系統會自然處理。
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
                    {groupedKeywords[source].map((keyword, index) =>
                      source === "article_core" ? (
                        <article
                          key={`${keyword.source}-${keyword.phrase}`}
                          className="keyword-option keyword-suggestion"
                        >
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
                        </article>
                      ) : (
                        <label
                          key={`${keyword.source}-${keyword.phrase}`}
                          className="keyword-option"
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
                      )
                    )}
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
