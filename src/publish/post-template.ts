// 投稿文の既定テンプレートを組み立てる。
import type { Animal } from "../model/animal.ts";

export function defaultPostTemplate(animal: Animal): string {
  const detailFragments = [
    ["種類", animal.breed],
    ["性別", animal.sex],
    ["毛色", animal.coatColor],
    ["体重", animal.weight],
    ["推定年齢", animal.estimatedAge]
  ].flatMap(([label, value]) => (value ? [`${label}: ${value}`] : []));
  const detailLine = detailFragments.join(" / ");

  return [
    "東京都動物愛護相談センターの譲渡動物情報に新しい掲載がありました。",
    "",
    `名前: ${animal.name}`,
    "",
    `管理番号: ${animal.id}`,
    `管理支所: ${animal.branch}`,
    ...(detailLine ? [detailLine] : []),
    `詳細: ${animal.detailUrl}`,
    "",
    getHashtags(animal)
  ].join("\n");
}

/**
 * 動物情報から投稿本文を生成する。
 */
export function renderPostText(animal: Animal): string {
  return defaultPostTemplate(animal);
}

/**
 * 動物カテゴリに応じたハッシュタグ行を返す。
 */
function getHashtags(animal: Animal): string {
  if (animal.category === "dog") {
    return "#犬 #いぬ #保護犬 #犬のいる暮らし #里親募集 #dog #dogs #RescueDog #DogsOfBluesky";
  }

  return "#猫 #ねこ #保護猫 #猫のいる暮らし #里親募集 #cat #cats #RescueCat #CatsOfBluesky";
}
