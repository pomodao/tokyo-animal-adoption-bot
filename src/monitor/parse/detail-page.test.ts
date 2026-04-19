// 詳細ページパーサーの正常系と画像なしケースを固定 fixture で検証する。
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDetailPage, parseDetailPageImage } from "./detail-page.ts";

const fixtureDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), "__fixtures__");
const detailUrl = "https://shuyojoho.metro.tokyo.lg.jp/generals/detail/8673";

test("詳細ページからメイン画像 URL と動物属性を抽出できる", async () => {
  const html = await readFile(path.join(fixtureDirectory, "detail-page.html"), "utf8");

  const detail = parseDetailPage(html, detailUrl);

  assert.deepEqual(detail, {
    imageUrl: "https://shuyojoho.metro.tokyo.lg.jp/img/upload/69bb6dab255ca.jpg",
    breed: "雑種",
    sex: "オス",
    coatColor: "キジ白",
    weight: "4.2kg",
    estimatedAge: "3歳くらい"
  });
});

test("画像がない場合は詳細ページ画像の抽出結果が undefined になる", () => {
  const imageUrl = parseDetailPageImage("<div id=\"mainPhoto\"></div>", detailUrl);

  assert.equal(imageUrl, undefined);
});

test("詳細ページでは取得できた属性だけを返す", () => {
  const detail = parseDetailPage(
    [
      "<dl>",
      "<dt>種類</dt><dd>日本猫</dd>",
      "<dt>性別</dt><dd>メス</dd>",
      "</dl>"
    ].join(""),
    detailUrl
  );

  assert.deepEqual(detail, {
    breed: "日本猫",
    sex: "メス"
  });
});
