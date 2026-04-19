import { mkdir, writeFile } from "node:fs/promises";
// state ファイル保存時の整形とキー順の安定化をここに集約する。
import { postedFilePath, snapshotFilePath, stateDirectory } from "./files.ts";
import type { PostedState, SnapshotState, StateFile } from "./types.ts";

/**
 * 動物スナップショット state を保存する。
 */
export async function saveSnapshotState(state: SnapshotState): Promise<void> {
  await save(snapshotFilePath, state);
}

/**
 * 投稿済み state を保存する。
 */
export async function savePostedState(state: PostedState): Promise<void> {
  await save(postedFilePath, state);
}

/**
 * 単一の state ファイルを整形済み JSON として保存する。
 */
async function save<T>(filePath: string, state: StateFile<T>): Promise<void> {
  await mkdir(stateDirectory, { recursive: true });
  await writeFile(filePath, JSON.stringify(sortState(state), null, 2) + "\n", "utf8");
}

/**
 * records フィールドのキー順を安定化し、差分を読みやすくする。
 */
function sortState<T>(state: StateFile<T>): StateFile<T> {
  const data = state.data;

  if (isRecordWithRecordField(data)) {
    const sortedInner = Object.fromEntries(
      Object.entries(data.records).sort(([left], [right]) => left.localeCompare(right, "ja"))
    );

    return {
      ...state,
      data: {
        ...data,
        records: sortedInner
      } as T
    };
  }

  return state;
}

/**
 * records フィールドを持つ state かどうかを保存前に判定する。
 */
function isRecordWithRecordField(value: unknown): value is { records: Record<string, unknown> } {
  return typeof value === "object" && value !== null && "records" in value;
}
