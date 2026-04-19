import test from "node:test";
import assert from "node:assert/strict";
import { buildFacets, buildLinkFacets, buildTagFacets } from "./bluesky-publisher.ts";

test("詳細 URL からリンク facet を生成できる", () => {
  const text = [
    "東京都動物愛護相談センターの譲渡動物情報に新しい掲載がありました。",
    "名前: りゅう",
    "詳細: https://shuyojoho.metro.tokyo.lg.jp/generals/detail/8673"
  ].join("\n");

  assert.deepEqual(buildLinkFacets(text), [
    {
      index: {
        byteStart: Buffer.byteLength(
          "東京都動物愛護相談センターの譲渡動物情報に新しい掲載がありました。\n名前: りゅう\n詳細: ",
          "utf8"
        ),
        byteEnd: Buffer.byteLength(text, "utf8")
      },
      features: [
        {
          $type: "app.bsky.richtext.facet#link",
          uri: "https://shuyojoho.metro.tokyo.lg.jp/generals/detail/8673"
        }
      ]
    }
  ]);
});

test("URL 末尾の句読点はリンク facet の範囲から除外される", () => {
  const text = "詳細: https://example.com/cat/123.";

  assert.deepEqual(buildLinkFacets(text), [
    {
      index: {
        byteStart: Buffer.byteLength("詳細: ", "utf8"),
        byteEnd: Buffer.byteLength("詳細: https://example.com/cat/123", "utf8")
      },
      features: [
        {
          $type: "app.bsky.richtext.facet#link",
          uri: "https://example.com/cat/123"
        }
      ]
    }
  ]);
});

test("URL の直後に空行があってもリンク facet の範囲は正しく保たれる", () => {
  const text = [
    "東京都動物愛護相談センターの譲渡動物情報に新しい掲載がありました。",
    "詳細: https://shuyojoho.metro.tokyo.lg.jp/generals/detail/8673",
    "",
    "#保護猫"
  ].join("\n");

  assert.deepEqual(buildLinkFacets(text), [
    {
      index: {
        byteStart: Buffer.byteLength(
          "東京都動物愛護相談センターの譲渡動物情報に新しい掲載がありました。\n詳細: ",
          "utf8"
        ),
        byteEnd: Buffer.byteLength(
          "東京都動物愛護相談センターの譲渡動物情報に新しい掲載がありました。\n詳細: https://shuyojoho.metro.tokyo.lg.jp/generals/detail/8673",
          "utf8"
        )
      },
      features: [
        {
          $type: "app.bsky.richtext.facet#link",
          uri: "https://shuyojoho.metro.tokyo.lg.jp/generals/detail/8673"
        }
      ]
    }
  ]);
});

test("日本語と英語のハッシュタグから tag facet を生成できる", () => {
  const text = "#保護猫 #RescueCat";

  assert.deepEqual(buildTagFacets(text), [
    {
      index: {
        byteStart: 0,
        byteEnd: Buffer.byteLength("#保護猫", "utf8")
      },
      features: [
        {
          $type: "app.bsky.richtext.facet#tag",
          tag: "保護猫"
        }
      ]
    },
    {
      index: {
        byteStart: Buffer.byteLength("#保護猫 ", "utf8"),
        byteEnd: Buffer.byteLength("#保護猫 #RescueCat", "utf8")
      },
      features: [
        {
          $type: "app.bsky.richtext.facet#tag",
          tag: "RescueCat"
        }
      ]
    }
  ]);
});

test("link facet と tag facet は本文中の順序で返される", () => {
  const text = "詳細: https://example.com/cat/123 #保護猫";

  assert.deepEqual(buildFacets(text), [
    {
      index: {
        byteStart: Buffer.byteLength("詳細: ", "utf8"),
        byteEnd: Buffer.byteLength("詳細: https://example.com/cat/123", "utf8")
      },
      features: [
        {
          $type: "app.bsky.richtext.facet#link",
          uri: "https://example.com/cat/123"
        }
      ]
    },
    {
      index: {
        byteStart: Buffer.byteLength("詳細: https://example.com/cat/123 ", "utf8"),
        byteEnd: Buffer.byteLength("詳細: https://example.com/cat/123 #保護猫", "utf8")
      },
      features: [
        {
          $type: "app.bsky.richtext.facet#tag",
          tag: "保護猫"
        }
      ]
    }
  ]);
});
