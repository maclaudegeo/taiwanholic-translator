"use client";

type UploadFormProps = {
  error: string | null;
  file: File | null;
  hasAnalysis: boolean;
  includeTrendSuggestions: boolean;
  isPending: boolean;
  onAnalyze: () => void;
  onFileChange: (file: File | null) => void;
  onToggleTrendSuggestions: (nextValue: boolean) => void;
  stage: "idle" | "ready" | "analyzing" | "keywords" | "translating" | "translated";
  status: string;
};

const steps = [
  "讀取文章",
  "整理關鍵字",
  "準備翻譯"
] as const;

export function UploadForm({
  error,
  file,
  hasAnalysis,
  includeTrendSuggestions,
  isPending,
  onAnalyze,
  onFileChange,
  onToggleTrendSuggestions,
  stage,
  status
}: UploadFormProps) {
  const currentStep =
    stage === "idle" || stage === "ready"
      ? 0
      : stage === "analyzing"
        ? 1
        : stage === "keywords"
          ? 2
          : 3;

  const stepState = (index: number) => {
    const stepNumber = index + 1;

    if (stepNumber < currentStep) {
      return "done";
    }

    if (stepNumber === currentStep && (stage === "analyzing" || stage === "keywords")) {
      return "active";
    }

    if (stage === "translating" || stage === "translated") {
      return "done";
    }

    return "todo";
  };

  return (
    <section className="panel upload-panel" aria-label="Upload and settings">
      <div className="section-heading hero-heading">
        <h1>TaiwanHolic 翻譯小秘書</h1>
        <p className="hero-subtle">
          上傳文章後，系統會先整理文章相關關鍵字與 Google Trend 詞，再幫你翻成自然的日文旅遊文章。
        </p>
      </div>

      <div className="progress-shell" aria-label="Progress">
        {steps.map((step, index) => (
          <div key={step} className={`progress-step progress-${stepState(index)}`}>
            <div className="progress-bullet">{index + 1}</div>
            <div className="progress-copy">
              <strong>{step}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="editor-card">
        <div className="upload-file-box">
          <label className="field-label" htmlFor="docx-file">
            上傳文章
          </label>
          <input
            id="docx-file"
            className="file-input"
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => onFileChange(event.currentTarget.files?.[0] ?? null)}
          />
          <p className="file-status">
            {file ? `已選擇：${file.name}` : "請選擇一份 .docx 文章"}
          </p>
        </div>

        <div className="toggle-row compact-toggle">
          <div>
            <strong>加入 Google Trend 旅遊關鍵字</strong>
            <p className="toggle-copy">把近期日本旅遊搜尋詞一起納入建議。</p>
          </div>
          <input
            type="checkbox"
            checked={includeTrendSuggestions}
            onChange={(event) => onToggleTrendSuggestions(event.currentTarget.checked)}
            aria-label="啟用趨勢詞建議"
          />
        </div>

        <button
          className="primary-button"
          type="button"
          onClick={onAnalyze}
          disabled={isPending}
        >
          {isPending && !hasAnalysis ? "分析中..." : "分析文章"}
        </button>
      </div>

      <div className={`status-card ${isPending ? "status-card-live" : ""}`}>
        <div className="status-card-head">
          <span className="status-label">
            {stage === "analyzing"
              ? "分析中"
              : stage === "keywords"
                ? "分析完成"
                : stage === "translating"
                  ? "翻譯中"
                  : stage === "translated"
                    ? "翻譯完成"
                    : "準備中"}
          </span>
          {isPending ? <span className="status-spinner" aria-hidden="true" /> : null}
        </div>
        <div className="status-row">
          <div className="status-pill" aria-live="polite">
            {status}
          </div>
        </div>
        <p className="status-detail">
          {stage === "analyzing" &&
            "系統正在讀取段落結構、抓文章核心詞，並比對適合的 Google Trend 旅遊搜尋字。"}
          {stage === "keywords" &&
            "關鍵字已整理完成，下一步請挑選你要保留的詞，再開始翻譯。"}
          {stage === "translating" &&
            "系統會優先保留原文意思，再用 TaiwanHolic 參考語氣整理成自然的日文。"}
          {stage === "translated" &&
            "日文結果已完成，下面可以直接查看標題建議、關鍵字使用情況和全文。"}
          {(stage === "idle" || stage === "ready") &&
            "先上傳文章並開始分析，系統才會往下展開關鍵字與翻譯區。"}
        </p>
      </div>

      {error ? <div className="error-box">{error}</div> : null}
    </section>
  );
}
