import process from "node:process";

// 環境変数の読み込みと必須設定の検証を一箇所に閉じ込める。
export type AppEnv = {
  sourceListUrl: string;
  monitorTimeoutMs: number;
  userAgent: string;
  dryRun: boolean;
  maxImageBytes: number;
  blueskyEnabled: boolean;
  blueskyIdentifier?: string;
  blueskyAppPassword?: string;
  blueskyServiceUrl: string;
};

/**
 * 実行に必要な環境変数を読み込み、アプリ設定へ変換する。
 */
export function loadEnv(): AppEnv {
  const sourceListUrl = process.env.SOURCE_LIST_URL ?? "https://shuyojoho.metro.tokyo.lg.jp/generals/cat";
  const userAgent =
    process.env.USER_AGENT ??
    "tokyo-animal-adoption-bot/1.0 (+https://github.com/owner/repo)";

  const dryRun = process.env.DRY_RUN === "true";
  const monitorTimeoutMs = parseInteger(process.env.FETCH_TIMEOUT_MS, 15_000);
  const maxImageBytes = parseInteger(process.env.MAX_IMAGE_BYTES, 950_000);
  const blueskyServiceUrl = process.env.BLUESKY_SERVICE_URL ?? "https://bsky.social";
  const blueskyIdentifier = process.env.BLUESKY_IDENTIFIER;
  const blueskyAppPassword = process.env.BLUESKY_APP_PASSWORD;
  const blueskyEnabled = process.env.BLUESKY_ENABLED !== "false";

  return {
    sourceListUrl,
    monitorTimeoutMs,
    userAgent,
    dryRun,
    maxImageBytes,
    blueskyEnabled,
    blueskyServiceUrl,
    ...(blueskyIdentifier ? { blueskyIdentifier } : {}),
    ...(blueskyAppPassword ? { blueskyAppPassword } : {})
  };
}

/**
 * 投稿先設定など、実行前に満たすべき前提条件を検証する。
 */
export function validateEnv(env: AppEnv): void {
  const publisherConfigured = Boolean(
    env.blueskyEnabled && env.blueskyIdentifier && env.blueskyAppPassword
  );

  if (!publisherConfigured && !env.dryRun) {
    throw new Error(
      "No supported publisher is configured. Set BLUESKY_IDENTIFIER and BLUESKY_APP_PASSWORD, or enable DRY_RUN=true."
    );
  }
}

/**
 * 数値系の環境変数を安全に読み込み、異常値なら既定値へ戻す。
 */
function parseInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}
