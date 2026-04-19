import { readFile } from "node:fs/promises";
// state ファイルを読み込み、未作成時は安全な初期値へフォールバックする。
import type { PostedState, SnapshotState, StateFile } from "./types.ts";
import { postedFilePath, snapshotFilePath } from "./files.ts";

const initialTimestamp = "1970-01-01T00:00:00.000Z";

/**
 * 動物スナップショット state を読み込み、未作成時は空状態を返す。
 */
export async function loadSnapshotState(): Promise<SnapshotState> {
  return readState(snapshotFilePath, {
    version: 1,
    updatedAt: initialTimestamp,
    data: { animals: [] }
  });
}

/**
 * 投稿済み state を読み込み、未作成時は空状態を返す。
 */
export async function loadPostedState(): Promise<PostedState> {
  return readState(postedFilePath, {
    version: 1,
    updatedAt: initialTimestamp,
    data: { records: {} }
  });
}

/**
 * 単一の state ファイルを読み込み、存在しない場合は初期値へフォールバックする。
 */
async function readState<T>(filePath: string, fallback: StateFile<T>): Promise<StateFile<T>> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<StateFile<T>>;

    if (parsed.version !== 1 || typeof parsed.updatedAt !== "string" || !("data" in parsed)) {
      throw new Error(`Invalid state file: ${filePath}`);
    }

    return parsed as StateFile<T>;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}
