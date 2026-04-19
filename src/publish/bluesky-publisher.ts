import type { Animal } from "../domain/animal.ts";
// Bluesky への認証、画像アップロード、投稿作成をまとめたアダプター。
import type { PublishResult } from "../domain/publishing.ts";

type Session = {
  did: string;
  accessJwt: string;
};

type BlobResponse = {
  blob: unknown;
};

type Facet = {
  index: {
    byteStart: number;
    byteEnd: number;
  };
  features: Array<
    | {
        $type: "app.bsky.richtext.facet#link";
        uri: string;
      }
    | {
        $type: "app.bsky.richtext.facet#tag";
        tag: string;
      }
  >;
};

export type BlueskyPublisher = {
  platform: "bluesky";
  publishAnimalUpdate(args: {
    animal: Animal;
    text: string;
    image?: {
      bytes: Buffer;
      contentType: string;
      alt: string;
    };
  }): Promise<PublishResult>;
};

/**
 * Bluesky 投稿に必要な認証と投稿処理を備えた publisher を生成する。
 */
export async function createBlueskyPublisher(config: {
  serviceUrl: string;
  identifier: string;
  appPassword: string;
  userAgent: string;
  timeoutMs: number;
}): Promise<BlueskyPublisher> {
  const session = await createSession(config);

  return {
    platform: "bluesky",
    async publishAnimalUpdate({ animal, text, image }) {
      let embed: Record<string, unknown> | undefined;
      const facets = buildFacets(text);

      if (image) {
        try {
          const uploaded = await uploadBlob({
            serviceUrl: config.serviceUrl,
            accessJwt: session.accessJwt,
            bytes: image.bytes,
            contentType: image.contentType,
            userAgent: config.userAgent,
            timeoutMs: config.timeoutMs
          });

          embed = {
            $type: "app.bsky.embed.images",
            images: [
              {
                alt: image.alt,
                image: uploaded.blob
              }
            ]
          };
        } catch (error) {
          console.warn(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              level: "warn",
              message: "Failed to upload image to Bluesky, falling back to text-only post",
              details: {
                animalId: animal.id,
                error: error instanceof Error ? error.message : String(error)
              }
            })
          );
        }
      }

      const response = await fetch(`${config.serviceUrl}/xrpc/com.atproto.repo.createRecord`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.accessJwt}`,
          "content-type": "application/json",
          "user-agent": config.userAgent
        },
        body: JSON.stringify({
          repo: session.did,
          collection: "app.bsky.feed.post",
          record: {
            $type: "app.bsky.feed.post",
            text,
            ...(facets.length > 0 ? { facets } : {}),
            createdAt: new Date().toISOString(),
            ...(embed ? { embed } : {})
          }
        }),
        signal: AbortSignal.timeout(config.timeoutMs)
      });

      if (!response.ok) {
        const body = await response.text();
        return {
          ok: false,
          platform: "bluesky",
          reason: `Bluesky createRecord failed with HTTP ${response.status}: ${body}`
        };
      }

      const body = (await response.json()) as { uri?: string };

      if (!body.uri) {
        return {
          ok: false,
          platform: "bluesky",
          reason: "Bluesky createRecord response did not contain uri"
        };
      }

      return {
        ok: true,
        platform: "bluesky",
        remoteId: body.uri
      };
    }
  };
}

/**
 * 投稿本文中の URL とハッシュタグへ Bluesky の facet を付ける。
 */
export function buildFacets(text: string): Facet[] {
  return [...buildLinkFacets(text), ...buildTagFacets(text)].sort(
    (left, right) => left.index.byteStart - right.index.byteStart
  );
}

/**
 * 投稿本文中の URL へ Bluesky の link facet を付ける。
 */
export function buildLinkFacets(text: string): Facet[] {
  const facets: Facet[] = [];

  for (const matched of text.matchAll(/https?:\/\/[^\s]+/g)) {
    const rawUrl = matched[0];
    const start = matched.index;

    if (typeof start !== "number") {
      continue;
    }

    const url = rawUrl.replace(/[),.!?]+$/g, "");

    if (url.length === 0) {
      continue;
    }

    facets.push({
      index: {
        byteStart: Buffer.byteLength(text.slice(0, start), "utf8"),
        byteEnd: Buffer.byteLength(text.slice(0, start + url.length), "utf8")
      },
      features: [
        {
          $type: "app.bsky.richtext.facet#link",
          uri: url
        }
      ]
    });
  }

  return facets;
}

/**
 * 投稿本文中のハッシュタグへ Bluesky の tag facet を付ける。
 */
export function buildTagFacets(text: string): Facet[] {
  const facets: Facet[] = [];

  for (const matched of text.matchAll(/(?:^|\s)(#[^\d\s]\S*)(?=\s|$)/gu)) {
    const rawTag = matched[1];
    const matchedText = matched[0];
    const start = matched.index;

    if (typeof start !== "number" || !rawTag) {
      continue;
    }

    const tagText = rawTag.replace(/\p{P}+$/gu, "");

    if (tagText.length <= 1) {
      continue;
    }

    const tagStart = start + matchedText.indexOf(rawTag);
    const tag = tagText.slice(1);

    facets.push({
      index: {
        byteStart: Buffer.byteLength(text.slice(0, tagStart), "utf8"),
        byteEnd: Buffer.byteLength(text.slice(0, tagStart + tagText.length), "utf8")
      },
      features: [
        {
          $type: "app.bsky.richtext.facet#tag",
          tag
        }
      ]
    });
  }

  return facets;
}

/**
 * Bluesky API にログインし、投稿用セッションを作る。
 */
async function createSession(config: {
  serviceUrl: string;
  identifier: string;
  appPassword: string;
  userAgent: string;
  timeoutMs: number;
}): Promise<Session> {
  const response = await fetch(`${config.serviceUrl}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": config.userAgent
    },
    body: JSON.stringify({
      identifier: config.identifier,
      password: config.appPassword
    }),
    signal: AbortSignal.timeout(config.timeoutMs)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Bluesky session creation failed with HTTP ${response.status}: ${body}`);
  }

  const body = (await response.json()) as { did?: string; accessJwt?: string };

  if (!body.did || !body.accessJwt) {
    throw new Error("Bluesky session response did not contain did/accessJwt");
  }

  return {
    did: body.did,
    accessJwt: body.accessJwt
  };
}

/**
 * Bluesky へ画像をアップロードし、投稿 embed に使う blob を返す。
 */
async function uploadBlob(config: {
  serviceUrl: string;
  accessJwt: string;
  bytes: Buffer;
  contentType: string;
  userAgent: string;
  timeoutMs: number;
}): Promise<BlobResponse> {
  const response = await fetch(`${config.serviceUrl}/xrpc/com.atproto.repo.uploadBlob`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.accessJwt}`,
      "content-type": config.contentType,
      "user-agent": config.userAgent
    },
    body: new Uint8Array(config.bytes),
    signal: AbortSignal.timeout(config.timeoutMs)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Bluesky uploadBlob failed with HTTP ${response.status}: ${body}`);
  }

  return (await response.json()) as BlobResponse;
}
