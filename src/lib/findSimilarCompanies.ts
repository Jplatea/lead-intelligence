import type { Company } from "../types";

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) => [i, ...Array(cols - 1).fill(0)]);
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[rows - 1][cols - 1];
}

// Live "is this already in the database" check while typing a company name
// (new-client draft, or renaming an existing one) - catches exact repeats,
// one being a prefix/substring of the other, and close typos, without
// blocking creation: it's a heads-up for the rep to notice, not a hard
// duplicate guard.
export function findSimilarCompanies(query: string, companies: Company[], excludeId?: string, limit = 5): Company[] {
  const q = normalize(query);
  if (q.length < 3) return [];

  return companies
    .filter((c) => c.id !== excludeId && c.name.trim())
    .map((c) => {
      const n = normalize(c.name);
      const related = n === q || n.includes(q) || q.includes(n);
      const score = n === q ? 0 : related ? 1 : levenshtein(n, q);
      return { company: c, score, related: related || score <= 2 };
    })
    .filter((x) => x.related)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((x) => x.company);
}
