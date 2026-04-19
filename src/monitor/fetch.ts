import { fetchBytes, fetchText } from "../shared/http.ts";

/**
 * 一覧ページの HTML を取得する。
 */
export async function fetchListPage(
  url: string,
  options: { userAgent: string; timeoutMs: number }
): Promise<string> {
  return fetchText(url, options);
}

/**
 * 詳細ページの HTML を取得する。
 */
export async function fetchDetailPage(
  url: string,
  options: { userAgent: string; timeoutMs: number }
): Promise<string> {
  return fetchText(url, options);
}

/**
 * 投稿に使う画像をバイト列として取得する。
 */
export async function fetchImage(
  url: string,
  options: { userAgent: string; timeoutMs: number; maxBytes: number }
): Promise<{ bytes: Buffer; contentType: string }> {
  return fetchBytes(url, options);
}
