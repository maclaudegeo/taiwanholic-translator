export function formatServiceError(error: unknown, fallbackMessage: string) {
  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  const rawMessage = error.message || "";
  const normalized = rawMessage.toLowerCase();

  if (
    normalized.includes("429") ||
    normalized.includes("quota") ||
    normalized.includes("billing") ||
    normalized.includes("rate limit")
  ) {
    return "目前翻譯服務的 API 額度已用完，請檢查 OpenAI 帳號的 billing 或 quota 設定後再試一次。";
  }

  if (
    normalized.includes("openai_api_key is missing") ||
    normalized.includes("incorrect api key") ||
    normalized.includes("invalid api key")
  ) {
    return "目前伺服器的 OpenAI API key 設定有問題，請確認 .env.local 內的 API key 是否正確。";
  }

  return rawMessage.trim() || fallbackMessage;
}
