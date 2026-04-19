import type { Animal } from "../domain/animal.ts";
// 永続化する state ファイルの構造を型として定義する。
import type { PlatformName } from "../domain/publishing.ts";

export type StateFile<T> = {
  version: 1;
  updatedAt: string;
  data: T;
};

export type SnapshotData = {
  animals: Animal[];
};

export type PostedPlatformRecord = {
  postedAt: string;
  remoteId: string;
  url?: string;
  imageUrl?: string;
};

export type PostedAnimalRecord = {
  detectedAt: string;
  platforms: Partial<Record<PlatformName, PostedPlatformRecord>>;
};

export type PostedData = {
  records: Record<string, PostedAnimalRecord>;
};

export type SnapshotState = StateFile<SnapshotData>;
export type PostedState = StateFile<PostedData>;
