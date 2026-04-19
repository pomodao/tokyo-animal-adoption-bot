// 投稿先の識別子と、SNS 投稿結果の共通表現をまとめる。
export type PlatformName = "bluesky" | "x";

export type PublishResult =
  | {
      ok: true;
      platform: PlatformName;
      remoteId: string;
      url?: string;
    }
  | {
      ok: false;
      platform: PlatformName;
      reason: string;
    };
