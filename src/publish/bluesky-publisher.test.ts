import test from "node:test";
import assert from "node:assert/strict";
import { buildFacets, buildLinkFacets, buildTagFacets } from "./bluesky-publisher.ts";

test("buildLinkFacets creates a link facet for the detail URL", () => {
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

test("buildLinkFacets trims trailing punctuation from URLs", () => {
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

test("buildTagFacets creates tag facets for Japanese and English hashtags", () => {
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

test("buildFacets returns link and tag facets in text order", () => {
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
