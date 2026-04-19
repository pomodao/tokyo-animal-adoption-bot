type Level = "info" | "warn" | "error";

/**
 * 構造化された JSON ログを標準出力または標準エラーへ出す。
 */
export function log(level: Level, message: string, details?: Record<string, unknown>): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(details ? { details } : {}),
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
    return;
  }

  console.log(line);
}
