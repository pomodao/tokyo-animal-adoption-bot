// 一覧ページパーサーの抽出結果と壊れた入力時の失敗を fixture で検証する。
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseListPage } from "./list-page.ts";

const fixtureDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), "__fixtures__");
const sourceUrl = "https://shuyojoho.metro.tokyo.lg.jp/generals/cat";

test("一覧ページ fixture から動物情報を抽出できる", async () => {
  const html = await readFile(path.join(fixtureDirectory, "list-page.html"), "utf8");
  const animals = parseListPage(html, sourceUrl);

  assert.equal(animals.length, 2);
  assert.deepEqual(animals[0], {
    id: "25ネ16",
    name: "りゅう",
    category: "cat",
    branch: "本所",
    detailUrl: "https://shuyojoho.metro.tokyo.lg.jp/generals/detail/8673",
    imageUrl: "https://shuyojoho.metro.tokyo.lg.jp/img/upload/69bb6dab255ca.jpg",
    sourceUrl,
  });
  assert.deepEqual(animals[1], {
    id: "25T82",
    name: "チャナ",
    category: "cat",
    branch: "多摩支所",
    detailUrl: "https://shuyojoho.metro.tokyo.lg.jp/generals/detail/8667",
    imageUrl: "https://shuyojoho.metro.tokyo.lg.jp/img/upload/69b26c84a2c30.jpg",
    sourceUrl,
  });
});

test("動物カードがない一覧ページでは空配列を返す", () => {
  const animals = parseListPage(
    ["<html><body>", "<h3>現在、譲渡動物情報はありません。</h3>", "</body></html>"].join(""),
    "https://shuyojoho.metro.tokyo.lg.jp/generals/",
  );

  assert.deepEqual(animals, []);
});

test("犬一覧ページの動物には dog カテゴリが付く", () => {
  const animals = parseListPage(
    `
      <div class="topMainBox">
        <div class="imgWrapper">
          <p><a href="/generals/detail/9999"><img src="/img/upload/test.jpg" /></a></p>
          <h2>管理番号 25犬1 <span>詳細</span></h2>
        </div>
        <dl>
          <dt>名前</dt>
          <dd>ポチ</dd>
          <dt>管理支所</dt>
          <dd>本所</dd>
        </dl>
      </div>
    `,
    "https://shuyojoho.metro.tokyo.lg.jp/generals/",
  );

  assert.equal(animals[0]?.category, "dog");
});

test("必須項目が欠けている一覧カードでは例外を投げる", () => {
  const brokenHtml = `
    <div class="topMainBox">
      <div class="imgWrapper">
        <p><a href="/generals/detail/9999"><img src="/img/upload/test.jpg" /></a></p>
        <h2>管理番号 25ネ99 <span>詳細</span></h2>
      </div>
      <dl>
        <dt>名前</dt>
        <dd>テスト</dd>
      </dl>
    </div>
  `;

  assert.throws(() => parseListPage(brokenHtml, sourceUrl), /Could not extract branch/);
});
