import test from "node:test";
import assert from "node:assert/strict";
import { defaultPostTemplate, renderPostText } from "./post-template.ts";

test("既定テンプレートで動物情報から投稿文を生成できる", () => {
  const text = renderPostText({
    id: "25ネ16",
    name: "りゅう",
    category: "cat",
    branch: "本所",
    detailUrl: "https://shuyojoho.metro.tokyo.lg.jp/generals/detail/8673",
    sourceUrl: "https://shuyojoho.metro.tokyo.lg.jp/generals/cat",
    imageUrl: "https://shuyojoho.metro.tokyo.lg.jp/img/upload/69bb6dab255ca.jpg",
    breed: "雑種",
    sex: "オス",
    coatColor: "キジ白",
    weight: "4.2kg",
    estimatedAge: "3歳くらい",
    firstSeenAt: "2026-04-19T07:29:46.835Z",
  });

  assert.equal(
    text,
    [
      "東京都動物愛護相談センターの譲渡動物情報に新しい掲載がありました。",
      "",
      "名前: りゅう",
      "",
      "管理番号: 25ネ16",
      "管理支所: 本所",
      "種類: 雑種 / 性別: オス / 毛色: キジ白 / 体重: 4.2kg / 推定年齢: 3歳くらい",
      "詳細: https://shuyojoho.metro.tokyo.lg.jp/generals/detail/8673",
      "",
      "#猫 #ねこ #保護猫 #猫のいる暮らし #里親募集 #cat #cats #RescueCat #CatsOfBluesky",
    ].join("\n"),
  );
});

test("スラッシュ区切りの詳細行では欠けている断片だけが省略される", () => {
  const text = defaultPostTemplate({
    id: "25ネ16",
    name: "りゅう",
    category: "cat",
    branch: "本所",
    detailUrl: "https://shuyojoho.metro.tokyo.lg.jp/generals/detail/8673",
    sourceUrl: "https://shuyojoho.metro.tokyo.lg.jp/generals/cat",
    sex: "オス",
    estimatedAge: "3歳くらい",
  });

  assert.match(text, /性別: オス \/ 推定年齢: 3歳くらい/);
  assert.doesNotMatch(text, /種類:/);
  assert.doesNotMatch(text, /毛色:/);
});

test("任意属性がすべてない場合は詳細属性行を出さない", () => {
  const text = defaultPostTemplate({
    id: "25ネ16",
    name: "りゅう",
    category: "cat",
    branch: "本所",
    detailUrl: "https://shuyojoho.metro.tokyo.lg.jp/generals/detail/8673",
    sourceUrl: "https://shuyojoho.metro.tokyo.lg.jp/generals/cat",
  });

  assert.equal(
    text,
    [
      "東京都動物愛護相談センターの譲渡動物情報に新しい掲載がありました。",
      "",
      "名前: りゅう",
      "",
      "管理番号: 25ネ16",
      "管理支所: 本所",
      "詳細: https://shuyojoho.metro.tokyo.lg.jp/generals/detail/8673",
      "",
      "#猫 #ねこ #保護猫 #猫のいる暮らし #里親募集 #cat #cats #RescueCat #CatsOfBluesky",
    ].join("\n"),
  );
});

test("犬投稿では犬向けハッシュタグへ切り替わる", () => {
  const text = defaultPostTemplate({
    id: "25犬1",
    name: "ポチ",
    category: "dog",
    branch: "本所",
    detailUrl: "https://shuyojoho.metro.tokyo.lg.jp/generals/detail/9999",
    sourceUrl: "https://shuyojoho.metro.tokyo.lg.jp/generals/",
  });

  assert.match(
    text,
    /#犬 #いぬ #保護犬 #犬のいる暮らし #里親募集 #dog #dogs #RescueDog #DogsOfBluesky/,
  );
  assert.doesNotMatch(text, /#猫 #ねこ #保護猫/);
});
