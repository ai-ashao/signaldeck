const STOP = new Set(["the","a","an","and","or","to","of","for","in","on","with","is","are","new","introducing"]);

export function normalizeTitle(input: string) {
  return input
    .toLowerCase()
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, " ")
    .replace(/[“”‘’'"`~!！?？,，.。:：;；()（）\[\]{}<>《》|/\\—–_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function titleTokens(input: string) {
  return new Set(normalizeTitle(input).split(/\s+/).filter((x) => x.length > 1 && !STOP.has(x)));
}

export function titleSimilarity(a: string, b: string) {
  const A = titleTokens(a); const B = titleTokens(b);
  if (!A.size || !B.size) return 0;
  let intersection = 0;
  for (const t of A) if (B.has(t)) intersection++;
  return (2 * intersection) / (A.size + B.size);
}
