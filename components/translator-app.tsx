"use client";

import { useState } from "react";
import type {
  ArticleBlock,
  KeywordSuggestion,
  TitleOption
} from "../lib/article-blocks";
import { chunkArticleBlocks, mergeTranslatedBlocks } from "../lib/translation-chunks";
import { NotesPane } from "./notes-pane";
import { ResultPane } from "./result-pane";
import { UploadForm } from "./upload-form";

function upsertManualKeyword(
  keywords: KeywordSuggestion[],
  phrase: string
): KeywordSuggestion[] {
  const normalized = phrase.trim();

  if (!normalized) {
    return keywords;
  }

  const exists = keywords.some(
    (keyword) => keyword.phrase.toLowerCase() === normalized.toLowerCase()
  );

  if (exists) {
    return keywords.map((keyword) =>
      keyword.phrase.toLowerCase() === normalized.toLowerCase()
        ? { ...keyword, selected: true }
        : keyword
    );
  }

  return [
    ...keywords,
    {
      phrase: normalized,
      phraseZh: normalized,
      source: "manual",
      reason: "由使用者手動補充",
      selected: true
    }
  ];
}

export function TranslatorApp() {
  const [file, setFile] = useState<File | null>(null);
  const [blocks, setBlocks] = useState<ArticleBlock[]>([]);
  const [keywords, setKeywords] = useState<KeywordSuggestion[]>([]);
  const [titleOptions, setTitleOptions] = useState<TitleOption[]>([]);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("可以開始上傳檔案");
  const [includeTrendSuggestions, setIncludeTrendSuggestions] = useState(true);
  const [pendingStage, setPendingStage] = useState<"analyzing" | "translating" | "downloading" | null>(null);

  const hasAnalysis = blocks.length > 0;
  const hasTranslation = blocks.some((block) => Boolean(block.polishedText));
  const isPending = pendingStage !== null;
  const stage = hasTranslation
    ? "translated"
    : pendingStage === "translating" && hasAnalysis
      ? "translating"
      : hasAnalysis
        ? "keywords"
        : pendingStage === "analyzing"
          ? "analyzing"
          : file
            ? "ready"
            : "idle";

  const resetResults = () => {
    setBlocks([]);
    setKeywords([]);
    setTitleOptions([]);
    setSelectedTitle("");
  };

  const handleFileChange = (nextFile: File | null) => {
    setFile(nextFile);
    setError(null);
    resetResults();
    setPendingStage(null);
    setStatus(nextFile ? "已選擇檔案，請按下「分析文章」。" : "可以開始上傳檔案");
  };

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const fetchChunkWithRetry = async (
    chunk: ArticleBlock[],
    latestKeywords: KeywordSuggestion[]
  ) => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ blocks: chunk, keywords: latestKeywords })
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "翻譯失敗。");
        }

        return (await response.json()) as {
          blocks: ArticleBlock[];
          keywords: KeywordSuggestion[];
          titleOptions: TitleOption[];
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("翻譯失敗。");

        if (attempt < 3) {
          await sleep(1200 * attempt);
        }
      }
    }

    throw lastError ?? new Error("翻譯失敗。");
  };

  const loadTitleOptions = async (
    nextBlocks: ArticleBlock[],
    nextKeywords: KeywordSuggestion[]
  ) => {
    try {
      const response = await fetch("/api/titles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ blocks: nextBlocks, keywords: nextKeywords })
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        titleOptions: TitleOption[];
      };

      setTitleOptions(payload.titleOptions);
      setSelectedTitle((current) => current || payload.titleOptions[0]?.text || "");
      setStatus("翻譯完成，請檢查日文結果、標題和關鍵字使用情況。");
    } catch {
      setStatus("翻譯完成，標題建議暫時還沒整理出來。");
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("請先選擇一個 .docx 檔案。");
      return;
    }

    setError(null);
    setStatus("正在讀取文章並整理關鍵字建議...");
    resetResults();
    setPendingStage("analyzing");

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("includeTrendSuggestions", String(includeTrendSuggestions));

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "文章分析失敗。");
        setStatus("請重新上傳檔案後再試一次。");
        return;
      }

      const payload = (await response.json()) as {
        blocks: ArticleBlock[];
        keywords: KeywordSuggestion[];
      };

      setBlocks(payload.blocks);
      setKeywords(payload.keywords);
      setStatus(
        payload.keywords.length > 0
          ? `分析完成，共整理出 ${payload.keywords.length} 個關鍵字，請勾選後開始翻譯。`
          : "分析完成，但這篇暫時沒有自動抓到關鍵字。你可以手動補詞，或直接開始翻譯。"
      );
    } catch {
      setError("目前無法連線到分析服務，請稍後再試一次。");
      setStatus("分析中斷，請重新再試一次。");
    } finally {
      setPendingStage(null);
    }
  };

  const handleTranslate = async () => {
    if (blocks.length === 0) {
      setError("請先分析文章，讓我先整理關鍵字建議。");
      return;
    }

    setError(null);
    setStatus("正在依照已選關鍵字翻成日文...");
    setPendingStage("translating");

    try {
      const chunks = chunkArticleBlocks(blocks);
      const translatedBlocks: ArticleBlock[] = [];
      let latestKeywords = keywords;

      for (let index = 0; index < chunks.length; index += 1) {
        setStatus(`正在翻譯第 ${index + 1} / ${chunks.length} 段...`);

        const payload = await fetchChunkWithRetry(chunks[index] ?? [], latestKeywords);

        translatedBlocks.push(...payload.blocks);
        latestKeywords = payload.keywords;
      }

      const mergedBlocks = mergeTranslatedBlocks(translatedBlocks);

      setBlocks(mergedBlocks);
      setKeywords(latestKeywords);
      setTitleOptions([]);
      setSelectedTitle(
        mergedBlocks.find((block) => block.type === "title")?.polishedText ??
          mergedBlocks[0]?.polishedText ??
          ""
      );
      setStatus("翻譯完成，正在整理標題...");
      void loadTitleOptions(mergedBlocks, latestKeywords);
    } catch (error) {
      setError(
        error instanceof Error && error.message
          ? error.message
          : "翻譯連線中斷了。文章較長時可能需要較久，請再試一次。"
      );
      setStatus("翻譯中斷，請重新再試一次。");
    } finally {
      setPendingStage(null);
    }
  };

  const handleDownload = async () => {
    if (!hasTranslation || !file) {
      return;
    }

    setError(null);
    setStatus("正在準備匯出檔案...");
    setPendingStage("downloading");

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("blocks", JSON.stringify(blocks));
      formData.set("titleOverride", selectedTitle);

      const response = await fetch("/api/export", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "匯出失敗。");
        setStatus("目前無法建立匯出檔案。");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "translated-article.docx";
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus("翻譯後的 docx 已準備完成。");
    } catch {
      setError("下載連線中斷了，請再試一次。");
      setStatus("目前無法建立匯出檔案。");
    } finally {
      setPendingStage(null);
    }
  };

  return (
    <div className="workspace-flow">
      <UploadForm
        error={error}
        file={file}
        hasAnalysis={hasAnalysis}
        includeTrendSuggestions={includeTrendSuggestions}
        isPending={isPending}
        onAnalyze={handleAnalyze}
        onFileChange={handleFileChange}
        onToggleTrendSuggestions={setIncludeTrendSuggestions}
        stage={stage}
        status={status}
      />
      {hasAnalysis ? (
        <NotesPane
          blocks={blocks}
          isPending={isPending}
          keywords={keywords}
          onAddManualKeyword={(phrase) => {
            setKeywords((current) => upsertManualKeyword(current, phrase));
            setTitleOptions([]);
          }}
          onToggleKeyword={(phrase, nextSelected) => {
            setKeywords((current) =>
              current.map((keyword) =>
                keyword.phrase === phrase
                  ? { ...keyword, selected: nextSelected }
                  : keyword
              )
            );
            setTitleOptions([]);
          }}
          onTranslate={handleTranslate}
        />
      ) : null}
      {hasTranslation ? (
        <ResultPane
          blocks={blocks}
          onDownload={handleDownload}
          onTitleChange={setSelectedTitle}
          keywords={keywords}
          titleOptions={titleOptions}
        />
      ) : null}
    </div>
  );
}
