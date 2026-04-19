import type { Animal } from "../domain/animal.ts";

// 投稿文をテンプレート文字列として定義し、差し込み項目だけを置換できるようにする。
export const defaultPostTemplate = [
  "東京都動物愛護相談センターの譲渡動物情報に新しい掲載がありました。",
  "",
  "{{name}}",
  "",
  "管理番号: {{id}}",
  "管理支所: {{branch}}",
  "種類: {{breed}} / 性別: {{sex}} / 毛色: {{coatColor}} / 体重: {{weight}} / 推定年齢: {{estimatedAge}}",
  "詳細: {{detailUrl}}"
].join("\n");

/**
 * 動物情報を投稿文テンプレートへ差し込んで本文を生成する。
 */
export function renderPostText(animal: Animal, template = defaultPostTemplate): string {
  const values: Record<string, string> = {
    id: animal.id,
    name: animal.name,
    branch: animal.branch,
    detailUrl: animal.detailUrl,
    sourceUrl: animal.sourceUrl,
    imageUrl: animal.imageUrl ?? "",
    breed: animal.breed ?? "",
    sex: animal.sex ?? "",
    coatColor: animal.coatColor ?? "",
    weight: animal.weight ?? "",
    estimatedAge: animal.estimatedAge ?? "",
    firstSeenAt: animal.firstSeenAt ?? ""
  };

  const rendered = template.replace(/\{\{([a-zA-Z0-9]+)\}\}/g, (placeholder, key: string) => {
    return values[key] ?? placeholder;
  });

  return rendered
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();

      if (trimmed.length === 0) {
        return false;
      }

      return trimmed.includes("{{") || !/[:：]\s*$/.test(trimmed);
    })
    .join("\n");
}
