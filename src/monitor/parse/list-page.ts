// 一覧ページのカード群を動物スナップショットへ変換する。
import type { Animal } from "../../model/animal.ts";
import { toAbsoluteUrl } from "../../shared/http.ts";
import { singleLine } from "../../shared/text.ts";

/**
 * 一覧ページ HTML 全体から動物カードを配列として抽出する。
 */
export function parseListPage(html: string, sourceUrl: string): Animal[] {
  const chunks = html.split('<div class="topMainBox">').slice(1);

  if (chunks.length === 0) {
    return [];
  }

  return chunks.map((chunk, index) => parseAnimalCard(chunk, sourceUrl, index));
}

/**
 * 個々のカード断片から動物 1 件分の情報を取り出す。
 */
function parseAnimalCard(chunk: string, sourceUrl: string, index: number): Animal {
  const detailPath = matchOrThrow(chunk, /<a href="([^"]+)">/, `detail URL for card ${index}`);
  const imagePath = matchOptional(chunk, /<img src="([^"]+)"/);
  const id = singleLine(
    matchOrThrow(chunk, /<h2>\s*管理番号[\s\u3000]*([^<]+?)\s*<span>/, `management number for card ${index}`)
  );
  const name = singleLine(
    matchOrThrow(chunk, /<dt>\s*名前\s*<\/dt>\s*<dd>([\s\S]*?)<\/dd>/, `name for card ${index}`)
  );
  const branch = singleLine(
    matchOrThrow(
      chunk,
      /<dt>\s*管理支所\s*<\/dt>\s*<dd>([\s\S]*?)<\/dd>/,
      `branch for card ${index}`
    )
  );

  return {
    id,
    name,
    category: detectAnimalCategory(sourceUrl),
    branch,
    detailUrl: toAbsoluteUrl(detailPath, sourceUrl),
    sourceUrl,
    ...(imagePath ? { imageUrl: toAbsoluteUrl(imagePath, sourceUrl) } : {})
  };
}

/**
 * 正規表現に一致しない場合は文脈付きエラーにする。
 */
function matchOrThrow(value: string, pattern: RegExp, label: string): string {
  const matched = pattern.exec(value);

  if (!matched?.[1]) {
    throw new Error(`Could not extract ${label}`);
  }

  return matched[1];
}

/**
 * 一致しない可能性がある値を任意項目として取り出す。
 */
function matchOptional(value: string, pattern: RegExp): string | undefined {
  return pattern.exec(value)?.[1];
}

/**
 * 一覧 URL から監視対象カテゴリを判定する。
 */
function detectAnimalCategory(sourceUrl: string): Animal["category"] {
  return sourceUrl.endsWith("/cat") ? "cat" : "dog";
}
