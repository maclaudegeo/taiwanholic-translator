function getProviderLabel() {
  const rawOrder = process.env.LLM_PROVIDER_ORDER?.trim() || "openai,gemini";
  const providers = rawOrder
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const activeLabels = providers
    .map((provider) => {
      if (provider === "openai" && process.env.OPENAI_API_KEY) {
        return "OpenAI";
      }

      if (provider === "gemini" && process.env.GEMINI_API_KEY) {
        return "Gemini";
      }

      return null;
    })
    .filter((label): label is "OpenAI" | "Gemini" => label !== null);

  if (activeLabels.length === 0) {
    return "模型服務";
  }

  if (activeLabels.length === 1) {
    return activeLabels[0];
  }

  return activeLabels.join(" / ");
}

export function formatServiceError(error: unknown, fallbackMessage: string) {
  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  const rawMessage = error.message || "";
  const normalized = rawMessage.toLowerCase();

  if (
    normalized.includes("all model providers failed") ||
    normalized.includes("resource_exhausted") ||
    normalized.includes("too many requests") ||
    normalized.includes("429") ||
    normalized.includes("quota") ||
    normalized.includes("billing") ||
    normalized.includes("rate limit")
  ) {
    const providerLabel = getProviderLabel();
    return `目前翻譯服務暫時無法使用，可能是 ${providerLabel} 限流、quota 用完，或 billing 設定有問題，請稍後再試或檢查 API 設定。`;
  }

  if (
    normalized.includes("gemini_api_key is missing") ||
    normalized.includes("openai_api_key is missing") ||
    normalized.includes("incorrect api key") ||
    normalized.includes("invalid api key")
  ) {
    return "目前伺服器的模型 API key 設定有問題，請確認 .env.local 或 Vercel 環境變數內的 API key 是否正確。";
  }

  if (normalized.includes("no model provider is configured")) {
    return "目前還沒有設定可用的模型服務，請先加入 OpenAI 或 Gemini 的 API key。";
  }

  return rawMessage.trim() || fallbackMessage;
}
