// 永続化する state ファイルの構造を型として定義する。
import type { Animal } from "../model/animal.ts";
import type { PlatformName } from "../model/publishing.ts";

export type StateFile<T> = {
  version: 1;
  updatedAt: string;
  data: T;
};

type SnapshotData = {
  animals: Animal[];
};

type PostedPlatformRecord = {
  postedAt: string;
  remoteId: string;
  url?: string;
  imageUrl?: string;
};

type PostedAnimalRecord = {
  detectedAt: string;
  platforms: Partial<Record<PlatformName, PostedPlatformRecord>>;
};

type PostedData = {
  records: Record<string, PostedAnimalRecord>;
};

export type SnapshotState = StateFile<SnapshotData>;
export type PostedState = StateFile<PostedData>;
