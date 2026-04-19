import type { Animal } from "../domain/animal.ts";
import { toAbsoluteUrl } from "../util/http.ts";
import { singleLine } from "../util/text.ts";

type AnimalDetail = Pick<
  Animal,
  "imageUrl" | "breed" | "sex" | "coatColor" | "weight" | "estimatedAge"
>;

/**
 * 詳細ページ HTML から画像 URL と投稿補足に使う属性を取り出す。
 */
export function parseDetailPage(html: string, detailUrl: string): AnimalDetail {
  const imagePath = /<p id="mainPhoto">[\s\S]*?<img[^>]+src="([^"]+)"/.exec(html)?.[1];
  const breed = extractDetailText(html, "種類");
  const sex = extractDetailText(html, "性別");
  const coatColor = extractDetailText(html, "毛色");
  const weight = extractDetailText(html, "体重");
  const estimatedAge = extractDetailText(html, "推定年齢");

  return {
    ...(imagePath ? { imageUrl: toAbsoluteUrl(imagePath, detailUrl) } : {}),
    ...(breed ? { breed } : {}),
    ...(sex ? { sex } : {}),
    ...(coatColor ? { coatColor } : {}),
    ...(weight ? { weight } : {}),
    ...(estimatedAge ? { estimatedAge } : {})
  };
}

/**
 * 後方互換のため、詳細ページ画像だけが必要な呼び出し元向け API も残す。
 */
export function parseDetailPageImage(html: string, detailUrl: string): string | undefined {
  return parseDetailPage(html, detailUrl).imageUrl;
}

/**
 * 詳細ページ内の見出しラベルに対応する値を、表形式と定義リスト形式の両方から探す。
 */
function extractDetailText(html: string, label: string): string | undefined {
  const escapedLabel = escapeForRegExp(label);
  const patterns = [
    new RegExp(
      `<th[^>]*>\\s*${escapedLabel}\\s*<\\/th>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`,
      "i"
    ),
    new RegExp(
      `<dt[^>]*>\\s*${escapedLabel}\\s*<\\/dt>\\s*<dd[^>]*>([\\s\\S]*?)<\\/dd>`,
      "i"
    )
  ];

  for (const pattern of patterns) {
    const value = pattern.exec(html)?.[1];

    if (!value) {
      continue;
    }

    const normalized = singleLine(value);

    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

/**
 * ラベル文字列を安全に正規表現へ埋め込む。
 */
function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
