import { fetchText } from "../util/http.ts";

/**
 * 詳細ページの HTML を取得する。
 */
export async function fetchDetailPage(
  url: string,
  options: { userAgent: string; timeoutMs: number }
): Promise<string> {
  return fetchText(url, options);
}
