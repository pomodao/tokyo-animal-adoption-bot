import test from "node:test";
import assert from "node:assert/strict";
import { orderPublishCandidates, shouldProcessAnimal, updateSnapshotState } from "./monitor-state.ts";
import type { Animal } from "./animal.ts";
import type { PostedState, SnapshotState } from "../persistence/types.ts";

function createAnimal(overrides: Partial<Animal> = {}): Animal {
  return {
    id: "25ネ16",
    name: "りゅう",
    category: "cat",
    branch: "本所",
    detailUrl: "https://shuyojoho.metro.tokyo.lg.jp/generals/detail/8673",
    sourceUrl: "https://shuyojoho.metro.tokyo.lg.jp/generals/cat",
    ...overrides
  };
}

function createPostedState(): PostedState {
  return {
    version: 1,
    updatedAt: "1970-01-01T00:00:00.000Z",
    data: {
      records: {}
    }
  };
}

function createSnapshotState(animals: Animal[] = []): SnapshotState {
  return {
    version: 1,
    updatedAt: "1970-01-01T00:00:00.000Z",
    data: {
      animals
    }
  };
}

test("新規検知した動物は処理対象になる", () => {
  const result = shouldProcessAnimal({
    animalId: "25ネ16",
    previousIds: new Set(),
    postedState: createPostedState(),
    enabledPlatforms: ["bluesky"]
  });

  assert.equal(result, true);
});

test("既知の動物で有効な投稿先がない場合は処理対象にならない", () => {
  const result = shouldProcessAnimal({
    animalId: "25ネ16",
    previousIds: new Set(["25ネ16"]),
    postedState: createPostedState(),
    enabledPlatforms: []
  });

  assert.equal(result, false);
});

test("既知の動物でも有効な投稿先に未投稿なら処理対象になる", () => {
  const postedState = createPostedState();
  postedState.data.records["25ネ16"] = {
    detectedAt: "2026-04-19T00:00:00.000Z",
    platforms: {}
  };

  const result = shouldProcessAnimal({
    animalId: "25ネ16",
    previousIds: new Set(["25ネ16"]),
    postedState,
    enabledPlatforms: ["bluesky"]
  });

  assert.equal(result, true);
});

test("既知の動物が有効な投稿先すべてに投稿済みなら処理対象にならない", () => {
  const postedState = createPostedState();
  postedState.data.records["25ネ16"] = {
    detectedAt: "2026-04-19T00:00:00.000Z",
    platforms: {
      bluesky: {
        postedAt: "2026-04-19T01:00:00.000Z",
        remoteId: "at://example/post"
      }
    }
  };

  const result = shouldProcessAnimal({
    animalId: "25ネ16",
    previousIds: new Set(["25ネ16"]),
    postedState,
    enabledPlatforms: ["bluesky"]
  });

  assert.equal(result, false);
});

test("投稿候補は DOM の逆順で並び替えられる", () => {
  const ordered = orderPublishCandidates([
    createAnimal({ id: "25ネ16", name: "りゅう" }),
    createAnimal({ id: "25T82", name: "チャナ", branch: "多摩支所" }),
    createAnimal({ id: "25ネ99", name: "モカ" })
  ]);

  assert.deepEqual(
    ordered.map((animal) => animal.id),
    ["25ネ99", "25T82", "25ネ16"]
  );
});

test("スナップショット更新時に既知の動物の firstSeenAt は保持され新規の動物には付与される", () => {
  const state = createSnapshotState([
    createAnimal({
      id: "25ネ16",
      firstSeenAt: "2026-04-18T00:00:00.000Z"
    })
  ]);

  const changed = updateSnapshotState(
    state,
    [
      createAnimal({ id: "25ネ16", name: "りゅう" }),
      createAnimal({ id: "25T82", name: "チャナ", branch: "多摩支所" })
    ],
    "2026-04-19T07:00:00.000Z"
  );

  assert.equal(changed, true);
  assert.equal(state.data.animals[0]?.firstSeenAt, "2026-04-18T00:00:00.000Z");
  assert.equal(state.data.animals[1]?.firstSeenAt, "2026-04-19T07:00:00.000Z");
});

test("スナップショットが変わらない場合は false を返す", () => {
  const animals = [
    createAnimal({
      id: "25ネ16",
      firstSeenAt: "2026-04-18T00:00:00.000Z"
    })
  ];
  const state = createSnapshotState(animals);

  const changed = updateSnapshotState(
    state,
    [
      createAnimal({
        id: "25ネ16",
        firstSeenAt: "2026-04-18T00:00:00.000Z"
      })
    ],
    "2026-04-19T07:00:00.000Z"
  );

  assert.equal(changed, false);
  assert.equal(state.updatedAt, "1970-01-01T00:00:00.000Z");
});
