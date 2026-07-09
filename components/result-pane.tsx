import type {
  ArticleBlock,
  KeywordSuggestion,
  TitleOption
} from "../lib/article-blocks";
import { useState } from "react";

type ResultPaneProps = {
  blocks: ArticleBlock[];
  onDownload: () => void;
  onTitleChange: (title: string) => void;
  keywords: KeywordSuggestion[];
  titleOptions: TitleOption[];
};

function localizeTitleFocus(focus: string, index: number) {
  const normalized = focus.trim().toLowerCase();

  if (
    normalized.includes("stable") ||
    focus.includes("穩健") ||
    focus.includes("安定")
  ) {
    return "穩健版";
  }

  if (
    normalized.includes("click") ||
    focus.includes("吸引") ||
    focus.includes("點擊")
  ) {
    return "吸引版";
  }

  if (
    normalized.includes("search") ||
    focus.includes("搜尋") ||
    focus.includes("seo")
  ) {
    return "SEO 版";
  }

  return `方案 ${index + 1}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightKeywords(text: string, keywords: string[]) {
  if (keywords.length === 0) {
    return text;
  }

  const pattern = new RegExp(
    `(${keywords
      .slice()
      .sort((a, b) => b.length - a.length)
      .map(escapeRegExp)
      .join("|")})`,
    "g",
  );
  const parts = text.split(pattern);

  return parts.map((part, index) =>
    keywords.includes(part) ? (
      <mark key={`${part}-${index}`} className="keyword-highlight">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
}

export function ResultPane({
  blocks,
  onDownload,
  onTitleChange,
  keywords,
  titleOptions
}: ResultPaneProps) {
  const [selectedTitleId, setSelectedTitleId] = useState<string>(
    titleOptions[0]?.id ?? "custom"
  );
  const [customTitle, setCustomTitle] = useState("");
  const selectedKeywords = keywords
    .filter((keyword) => keyword.selected)
    .map((keyword) => keyword.phrase);
  const selectedOption = titleOptions.find((option) => option.id === selectedTitleId);
  const effectiveTitle =
    selectedTitleId === "custom"
      ? customTitle.trim()
      : (selectedOption?.text ?? titleOptions[0]?.text ?? "");
  const displayBlocks = blocks
    .filter((block) => block.polishedText)
    .map((block) =>
      block.type === "title" && effectiveTitle
        ? { ...block, polishedText: effectiveTitle }
        : block
    );
  const usedKeywords = new Set(displayBlocks.flatMap((block) => block.trendSuggestions));

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const applyTitleSelection = (titleId: string, fallbackText?: string) => {
    setSelectedTitleId(titleId);
    onTitleChange(titleId === "custom" ? customTitle.trim() : (fallbackText ?? ""));
  };

  const renderArticleBlock = (block: ArticleBlock) => {
    const content = highlightKeywords(block.polishedText ?? "", selectedKeywords);

    if (block.type === "title") {
      return (
        <header key={block.id} className="article-title-block">
          <h1>{content}</h1>
        </header>
      );
    }

    if (block.type === "heading") {
      return (
        <section key={block.id} className="article-section-block">
          <h2>{content}</h2>
        </section>
      );
    }

    if (block.type === "seo_description") {
      return (
        <section key={block.id} className="article-seo-block">
          <p>{content}</p>
        </section>
      );
    }

    if (block.type === "caption") {
      return (
        <figure key={block.id} className="article-caption-block">
          <figcaption>{content}</figcaption>
        </figure>
      );
    }

    return (
      <p key={block.id} className="article-paragraph-block">
        {content}
      </p>
    );
  };

  return (
    <section className="panel" aria-label="Translation results">
      <div className="section-heading">
        <h2>日文結果</h2>
      </div>

      <div className="result-summary">
        {selectedKeywords.map((keyword) => (
          <span
            key={keyword}
            className={usedKeywords.has(keyword) ? "used-chip" : "unused-chip"}
          >
            {keyword}
          </span>
        ))}
      </div>

      <article className="article-preview">
        <div className="article-body">
          {displayBlocks.map((block) => renderArticleBlock(block))}
        </div>
      </article>

      <div className="title-options">
        <div className="section-heading">
          <h2>標題建議</h2>
          <p className="subtle">
            3 個都是 TaiwanHolic 風格的 SEO 版標題，你可以直接複製去給日本人確認。
          </p>
        </div>
        <div className="notes-list">
          {titleOptions.map((option, index) => (
            <article key={option.id} className="note-card">
              <label className="title-choice">
                <input
                  type="radio"
                  name="title-choice"
                  checked={selectedTitleId === option.id}
                  onChange={() => applyTitleSelection(option.id, option.text)}
                />
                <span>選這個標題</span>
              </label>
              <h3>{option.text}</h3>
              <p className="subtle">中文意思：{option.textZh}</p>
              <p className="subtle">
                方向：{localizeTitleFocus(option.focus, index)} | 已帶入關鍵字：
                {option.keywordsUsed.join("、") || "尚未帶入"}
              </p>
              <button
                className="secondary-button inline-button"
                type="button"
                onClick={() => copyText(option.text)}
              >
                複製標題
              </button>
            </article>
          ))}
          <article className="note-card">
            <label className="title-choice">
              <input
                type="radio"
                name="title-choice"
                checked={selectedTitleId === "custom"}
                onChange={() => {
                  setSelectedTitleId("custom");
                  onTitleChange(customTitle.trim());
                }}
              />
              <span>使用自訂標題</span>
            </label>
            <input
              className="text-input custom-title-input"
              type="text"
              value={customTitle}
              placeholder="自己輸入想用的日文標題"
              onChange={(event) => {
                const nextValue = event.currentTarget.value;
                setCustomTitle(nextValue);
                if (selectedTitleId === "custom") {
                  onTitleChange(nextValue.trim());
                }
              }}
            />
          </article>
        </div>
      </div>

      <div className="download-row">
        <button className="secondary-button result-action" type="button" onClick={onDownload}>
          下載 docx
        </button>
      </div>
    </section>
  );
}
