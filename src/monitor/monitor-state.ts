import type { Animal } from "../model/animal.ts";
import type { PlatformName } from "../model/publishing.ts";
import type { PostedState, SnapshotState } from "../state/state-file.ts";

/**
 * 今回の run でその動物を処理対象にする必要があるかを判定する。
 */
export function shouldProcessAnimal(args: {
  animalId: string;
  previousIds: Set<string>;
  postedState: PostedState;
  enabledPlatforms: PlatformName[];
}): boolean {
  if (!args.previousIds.has(args.animalId)) {
    return true;
  }

  if (args.enabledPlatforms.length === 0) {
    return false;
  }

  const postedRecord = args.postedState.data.records[args.animalId];

  if (!postedRecord) {
    return true;
  }

  return args.enabledPlatforms.some((platform) => !postedRecord.platforms[platform]);
}

/**
 * 一覧ページ上で下にある新規掲載から先に投稿できるよう、候補を DOM 逆順へ並べ替える。
 */
export function orderPublishCandidates(animals: Animal[]): Animal[] {
  return [...animals].reverse();
}

/**
 * 最新取得結果でスナップショットを更新し、変更有無を返す。
 */
export function updateSnapshotState(
  state: SnapshotState,
  animals: Animal[],
  now: string
): boolean {
  const previousById = new Map(state.data.animals.map((animal) => [animal.id, animal] as const));
  const nextAnimals = animals.map((animal) => {
    const previous = previousById.get(animal.id);
    return {
      ...animal,
      firstSeenAt: previous?.firstSeenAt ?? now
    };
  });

  if (sameAnimals(state.data.animals, nextAnimals)) {
    return false;
  }

  state.updatedAt = now;
  state.data.animals = nextAnimals;
  return true;
}

/**
 * スナップショット比較のため、動物配列が同一かを判定する。
 */
export function sameAnimals(left: Animal[], right: Animal[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
