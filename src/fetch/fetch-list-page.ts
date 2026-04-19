import { fetchText } from "../util/http.ts";

/**
 * 一覧ページの HTML を取得する。
 */
export async function fetchListPage(
  url: string,
  options: { userAgent: string; timeoutMs: number }
): Promise<string> {
  return fetchText(url, options);
}
