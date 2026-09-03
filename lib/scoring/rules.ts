const POSITIVE: Array<[RegExp, number]> = [
  [/\b(skill|skills)\b/i, 15], [/\bmcp\b/i, 15], [/\bagent(s)?\b/i, 12],
  [/\bcodex\b/i, 10], [/\bclaude\b/i, 10], [/\b(open source|open-source|github)\b/i, 10],
  [/\b(free|免费)\b/i, 8], [/\b(video|image|browser|automation|workflow|coding|developer)\b/i, 7],
  [/\b(release|launch|introduc|发布|上线|开源)\b/i, 8],
];
const NEGATIVE: Array<[RegExp, number]> = [
  [/\b(funding|raises?|valuation|融资|估值)\b/i, -18],
  [/\b(ceo said|interview|访谈|表示)\b/i, -8],
  [/\b(paper|arxiv|论文)\b/i, -10],
];

export function ruleScore(event: any, sources: any[]) {
  const text = `${event.canonical_title} ${event.summary || ""}`;
  let score = Math.min(15, Math.max(0, (event.source_count - 1) * 5));
  const ageHours = Math.max(0, (Date.now() - new Date(event.last_seen_at).getTime()) / 36e5);
  if (ageHours <= 24) score += 15; else if (ageHours <= 72) score += 10; else if (ageHours > 168) score -= 10;
  for (const [re, n] of POSITIVE) if (re.test(text)) score += n;
  for (const [re, n] of NEGATIVE) if (re.test(text)) score += n;
  const metrics = sources.map(s => { try { return JSON.parse(s.metrics || '{}') } catch { return {} } });
  const upvotes = Math.max(0, ...metrics.map((m:any) => Number(m.upvotes || 0)));
  const comments = Math.max(0, ...metrics.map((m:any) => Number(m.comments || 0)));
  if (upvotes >= 100) score += 12; else if (upvotes >= 30) score += 6;
  if (comments >= 50) score += 7; else if (comments >= 10) score += 3;
  return Math.max(-100, Math.min(100, score));
}
