import test from "node:test";
import assert from "node:assert/strict";
import { defaultPostTemplate, renderPostText } from "./post-template.ts";

test("renderPostText renders the default template with animal values", () => {
  const text = renderPostText({
    id: "25ネ16",
    name: "りゅう",
    branch: "本所",
    detailUrl: "https://shuyojoho.metro.tokyo.lg.jp/generals/detail/8673",
    sourceUrl: "https://shuyojoho.metro.tokyo.lg.jp/generals/cat",
    imageUrl: "https://shuyojoho.metro.tokyo.lg.jp/img/upload/69bb6dab255ca.jpg",
    breed: "雑種",
    sex: "オス",
    coatColor: "キジ白",
    weight: "4.2kg",
    estimatedAge: "3歳くらい",
    firstSeenAt: "2026-04-19T07:29:46.835Z"
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
      "#猫 #ねこ #保護猫 #猫のいる暮らし #里親募集 #cat #cats #RescueCat #CatsOfBluesky"
    ].join("\n")
  );
});

test("renderPostText omits only missing fragments in a slash-delimited line", () => {
  const text = defaultPostTemplate(
    {
      id: "25ネ16",
      name: "りゅう",
      branch: "本所",
      detailUrl: "https://shuyojoho.metro.tokyo.lg.jp/generals/detail/8673",
      sourceUrl: "https://shuyojoho.metro.tokyo.lg.jp/generals/cat",
      sex: "オス",
      estimatedAge: "3歳くらい"
    }
  );

  assert.match(text, /性別: オス \/ 推定年齢: 3歳くらい/);
  assert.doesNotMatch(text, /種類:/);
  assert.doesNotMatch(text, /毛色:/);
});

test("defaultPostTemplate omits the detail line when all optional attributes are absent", () => {
  const text = defaultPostTemplate({
    id: "25ネ16",
    name: "りゅう",
    branch: "本所",
    detailUrl: "https://shuyojoho.metro.tokyo.lg.jp/generals/detail/8673",
    sourceUrl: "https://shuyojoho.metro.tokyo.lg.jp/generals/cat"
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
      "#猫 #ねこ #保護猫 #猫のいる暮らし #里親募集 #cat #cats #RescueCat #CatsOfBluesky"
    ].join("\n")
  );
});
