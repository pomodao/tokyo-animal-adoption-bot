/**
 * 不定形の例外値をログや通知に使える文字列へ変換する。
 */
export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
