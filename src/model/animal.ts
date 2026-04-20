// 監視対象ページから抽出した動物スナップショットの基本形。
export type AnimalCategory = "dog" | "cat";

export type AnimalDetails = {
  breed?: string;
  sex?: string;
  coatColor?: string;
  weight?: string;
  estimatedAge?: string;
};

export type Animal = {
  id: string;
  name: string;
  category: AnimalCategory;
  branch: string;
  detailUrl: string;
  imageUrl?: string;
  details?: AnimalDetails;
  sourceUrl: string;
  firstSeenAt?: string;
};
