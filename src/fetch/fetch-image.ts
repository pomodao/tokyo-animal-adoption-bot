import { fetchBytes } from "../util/http.ts";

/**
 * 投稿に使う画像をバイト列として取得する。
 */
export async function fetchImage(
  url: string,
  options: { userAgent: string; timeoutMs: number; maxBytes: number }
): Promise<{ bytes: Buffer; contentType: string }> {
  return fetchBytes(url, options);
}
