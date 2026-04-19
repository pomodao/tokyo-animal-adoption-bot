// HTML 断片から比較や投稿に使いやすい素朴な文字列へ整形する。
const namedEntities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: " "
};

/**
 * HTML 断片からタグだけを除去し、改行は可能な範囲で維持する。
 */
export function stripTags(value: string): string {
  return value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
}

/**
 * 最低限の HTML エンティティをデコードする。
 */
export function decodeHtml(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (entity, token: string) => {
    if (token.startsWith("#x") || token.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(token.slice(2), 16));
    }

    if (token.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(token.slice(1), 10));
    }

    return namedEntities[token] ?? entity;
  });
}

/**
 * 比較や出力に使いやすいよう空白と改行を正規化する。
 */
export function normalizeWhitespace(value: string): string {
  return value.replace(/\r/g, "").replace(/[ \t\u3000]+/g, " ").replace(/\n+/g, "\n").trim();
}

/**
 * HTML 断片をテキストとして取り出し、空白も整える。
 */
export function extractText(value: string): string {
  return normalizeWhitespace(decodeHtml(stripTags(value)));
}

/**
 * 抽出したテキストを 1 行へ潰して扱いやすくする。
 */
export function singleLine(value: string): string {
  return normalizeWhitespace(extractText(value).replace(/\n+/g, " "));
}
