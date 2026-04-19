// 監視のメインフローをまとめ、取得・差分判定・投稿・状態保存を直列で実行する。
import process from "node:process";
import type { Animal } from "../model/animal.ts";
import {
  orderPublishCandidates,
  shouldProcessAnimal,
  updateSnapshotState,
} from "../monitor/decision.ts";
import type { PlatformName } from "../model/publishing.ts";
import { fetchDetailPage, fetchImage, fetchListPage } from "../monitor/fetch.ts";
import { parseDetailPage } from "../monitor/parse/detail-page.ts";
import { parseListPage } from "../monitor/parse/list-page.ts";
import { createBlueskyPublisher } from "../publish/bluesky-publisher.ts";
import { renderPostText } from "../publish/post-template.ts";
import { loadEnv, validateEnv } from "../shared/env.ts";
import { toErrorMessage } from "../shared/error.ts";
import { log } from "../shared/logging.ts";
import { loadPostedState, loadSnapshotState } from "../persistence/load-state.ts";
import { savePostedState, saveSnapshotState } from "../persistence/save-state.ts";
import type { PostedState } from "../persistence/state-file.ts";

/**
 * 監視の 1 run を実行し、取得・差分判定・投稿・状態保存までをまとめて行う。
 */
async function main(): Promise<void> {
  const env = loadEnv();
  const now = new Date().toISOString();
  const snapshotState = await loadSnapshotState();
  const postedState = await loadPostedState();

  try {
    validateEnv(env);

    log("info", "Starting monitor run", {
      sourceListUrls: env.sourceListUrls,
      dryRun: env.dryRun,
    });

    let animals = await loadAnimalsFromSourceLists(env);
    animals = await enrichAnimalsWithImages(animals, env);

    const previousIds = new Set(snapshotState.data.animals.map((animal) => animal.id));
    const enabledPlatforms = getEnabledPlatforms(env);
    let candidates = orderPublishCandidates(
      animals.filter((animal) =>
        shouldProcessAnimal({
          animalId: animal.id,
          previousIds,
          postedState,
          enabledPlatforms,
        }),
      ),
    );
    candidates = await enrichAnimalsWithDetailData(candidates, env);

    log("info", "Parsed list page", {
      animalCount: animals.length,
      candidateCount: candidates.length,
      enabledPlatforms,
    });

    let publishedCount = 0;

    if (!env.dryRun) {
      const publishers = await createPublishers(env);

      for (const animal of candidates) {
        publishedCount += await publishAnimal(animal, publishers, postedState, env);
      }
    } else {
      for (const animal of candidates) {
        log("info", "Dry run: would publish animal update", {
          animalId: animal.id,
          detailUrl: animal.detailUrl,
        });
      }
    }

    const snapshotChanged = updateSnapshotState(snapshotState, animals, now);
    const postedChanged = publishedCount > 0;

    await Promise.all([
      ...(snapshotChanged ? [saveSnapshotState(snapshotState)] : []),
      ...(postedChanged ? [savePostedState(postedState)] : []),
    ]);

    log("info", "Monitor run completed", {
      publishedCandidates: candidates.length,
      publishedCount,
      snapshotChanged,
      postedChanged,
      dryRun: env.dryRun,
    });
  } catch (error) {
    const message = toErrorMessage(error);
    log("error", "Monitor run failed", { error: message });
    throw error;
  }
}

type Publisher = Awaited<ReturnType<typeof createBlueskyPublisher>>;

/**
 * 設定された複数の一覧ページを順に取得し、抽出結果をまとめる。
 */
async function loadAnimalsFromSourceLists(env: ReturnType<typeof loadEnv>): Promise<Animal[]> {
  const animals: Animal[] = [];

  for (const sourceListUrl of env.sourceListUrls) {
    const listHtml = await fetchListPage(sourceListUrl, {
      userAgent: env.userAgent,
      timeoutMs: env.monitorTimeoutMs,
    });
    const parsed = parseListPage(listHtml, sourceListUrl);

    animals.push(...parsed);

    log("info", "Parsed source list page", {
      sourceListUrl,
      animalCount: parsed.length,
    });
  }

  return animals;
}

/**
 * 利用可能な投稿先設定から実際の publisher を初期化する。
 */
async function createPublishers(env: ReturnType<typeof loadEnv>): Promise<Publisher[]> {
  const publishers: Publisher[] = [];

  if (env.blueskyEnabled && env.blueskyIdentifier && env.blueskyAppPassword) {
    publishers.push(
      await createBlueskyPublisher({
        serviceUrl: env.blueskyServiceUrl,
        identifier: env.blueskyIdentifier,
        appPassword: env.blueskyAppPassword,
        userAgent: env.userAgent,
        timeoutMs: env.monitorTimeoutMs,
      }),
    );
  }

  return publishers;
}

/**
 * 一覧で画像 URL が取れなかった動物だけ詳細ページで補完する。
 */
async function enrichAnimalsWithImages(
  animals: Animal[],
  env: ReturnType<typeof loadEnv>,
): Promise<Animal[]> {
  const result: Animal[] = [];

  for (const animal of animals) {
    if (animal.imageUrl) {
      result.push(animal);
      continue;
    }

    try {
      const detailHtml = await fetchDetailPage(animal.detailUrl, {
        userAgent: env.userAgent,
        timeoutMs: env.monitorTimeoutMs,
      });
      const detailImageUrl = parseDetailPage(detailHtml, animal.detailUrl).imageUrl;
      result.push({
        ...animal,
        ...(detailImageUrl ? { imageUrl: detailImageUrl } : {}),
      });
    } catch (error) {
      log("warn", "Failed to enrich animal with detail-page image", {
        animalId: animal.id,
        detailUrl: animal.detailUrl,
        error: toErrorMessage(error),
      });
      result.push(animal);
    }
  }

  return result;
}

/**
 * 投稿候補について、詳細ページにしかない属性を補完する。
 */
async function enrichAnimalsWithDetailData(
  animals: Animal[],
  env: ReturnType<typeof loadEnv>,
): Promise<Animal[]> {
  const result: Animal[] = [];

  for (const animal of animals) {
    try {
      const detailHtml = await fetchDetailPage(animal.detailUrl, {
        userAgent: env.userAgent,
        timeoutMs: env.monitorTimeoutMs,
      });
      const detail = parseDetailPage(detailHtml, animal.detailUrl);
      result.push({
        ...animal,
        ...detail,
      });
    } catch (error) {
      log("warn", "Failed to enrich animal with detail-page attributes", {
        animalId: animal.id,
        detailUrl: animal.detailUrl,
        error: toErrorMessage(error),
      });
      result.push(animal);
    }
  }

  return result;
}

/**
 * 現在の設定から有効な投稿先の一覧を返す。
 */
function getEnabledPlatforms(env: ReturnType<typeof loadEnv>): PlatformName[] {
  const platforms: PlatformName[] = [];

  if (env.blueskyEnabled && env.blueskyIdentifier && env.blueskyAppPassword) {
    platforms.push("bluesky");
  }

  return platforms;
}

/**
 * 1 匹分の更新を有効な投稿先へ投稿し、成功件数を返す。
 */
async function publishAnimal(
  animal: Animal,
  publishers: Publisher[],
  postedState: PostedState,
  env: ReturnType<typeof loadEnv>,
): Promise<number> {
  const record = postedState.data.records[animal.id] ?? {
    detectedAt: new Date().toISOString(),
    platforms: {},
  };
  let publishCount = 0;

  for (const publisher of publishers) {
    if (record.platforms[publisher.platform]) {
      continue;
    }

    const text = renderPostText(animal);
    const image = await loadImageForPost(animal, env);
    const publishArgs = {
      animal,
      text,
    } as const;
    const result = await publisher.publishAnimalUpdate({
      ...publishArgs,
      ...(image
        ? {
            image: {
              bytes: image.bytes,
              contentType: image.contentType,
              alt: `${animal.name} の掲載画像（管理番号 ${animal.id}）`,
            },
          }
        : {}),
    });

    if (!result.ok) {
      throw new Error(`${publisher.platform} publish failed for ${animal.id}: ${result.reason}`);
    }

    record.platforms[publisher.platform] = {
      postedAt: new Date().toISOString(),
      remoteId: result.remoteId,
      ...(result.url ? { url: result.url } : {}),
      ...(animal.imageUrl ? { imageUrl: animal.imageUrl } : {}),
    };

    postedState.data.records[animal.id] = record;
    publishCount += 1;

    log("info", "Published animal update", {
      animalId: animal.id,
      platform: publisher.platform,
      remoteId: result.remoteId,
    });
  }

  return publishCount;
}

/**
 * 投稿用画像を取得し、失敗時は本文のみ投稿へフォールバックする。
 */
async function loadImageForPost(
  animal: Animal,
  env: ReturnType<typeof loadEnv>,
): Promise<{ bytes: Buffer; contentType: string } | undefined> {
  if (!animal.imageUrl) {
    return undefined;
  }

  try {
    return await fetchImage(animal.imageUrl, {
      userAgent: env.userAgent,
      timeoutMs: env.monitorTimeoutMs,
      maxBytes: env.maxImageBytes,
    });
  } catch (error) {
    log("warn", "Failed to fetch image for post, falling back to text-only post", {
      animalId: animal.id,
      imageUrl: animal.imageUrl,
      error: toErrorMessage(error),
    });
    return undefined;
  }
}

void main().catch((error) => {
  process.exitCode = 1;
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
});
