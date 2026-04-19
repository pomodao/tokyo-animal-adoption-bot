import { Buffer } from "node:buffer";

// HTTP 取得時のタイムアウトや User-Agent を共通化する。
type FetchOptions = {
  userAgent: string;
  timeoutMs: number;
  accept?: string;
};

/**
 * テキスト系レスポンスをタイムアウト付きで取得する。
 */
export async function fetchText(url: string, options: FetchOptions): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "user-agent": options.userAgent,
      accept: options.accept ?? "text/html,application/xhtml+xml"
    },
    signal: AbortSignal.timeout(options.timeoutMs)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }

  return response.text();
}

/**
 * 画像などのバイナリを取得し、サイズ制限も同時に検証する。
 */
export async function fetchBytes(
  url: string,
  options: FetchOptions & { maxBytes: number }
): Promise<{ bytes: Buffer; contentType: string }> {
  const response = await fetch(url, {
    headers: {
      "user-agent": options.userAgent,
      accept: options.accept ?? "image/*"
    },
    signal: AbortSignal.timeout(options.timeoutMs)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);

  if (bytes.byteLength > options.maxBytes) {
    throw new Error(`Image too large: ${bytes.byteLength} bytes for ${url}`);
  }

  return {
    bytes,
    contentType: response.headers.get("content-type") ?? guessContentType(url)
  };
}

/**
 * 相対 URL と絶対 URL のどちらが来ても絶対 URL に揃える。
 */
export function toAbsoluteUrl(pathOrUrl: string, baseUrl: string): string {
  return new URL(pathOrUrl, baseUrl).toString();
}

/**
 * content-type が取れない場合のために拡張子から簡易推定する。
 */
function guessContentType(url: string): string {
  const lower = url.toLowerCase();

  if (lower.endsWith(".png")) {
    return "image/png";
  }

  if (lower.endsWith(".webp")) {
    return "image/webp";
  }

  if (lower.endsWith(".gif")) {
    return "image/gif";
  }

  return "image/jpeg";
}
