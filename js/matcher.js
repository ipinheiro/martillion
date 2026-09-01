const ARTICLE = /^(the|a|an)\s+/;

export function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(ARTICLE, "");
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const previous = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = previous;
    }
  }
  return row[b.length];
}

function tolerance(length) {
  if (length >= 10) return 2;
  if (length >= 5) return 1;
  return 0;
}

function candidatesFor(entry) {
  return [entry.answer, ...entry.aliases].map(normalize);
}

export function matchAnswer(input, answers) {
  const norm = normalize(input ?? "");
  if (!norm) return { points: 0, answer: null };
  for (const entry of answers) {
    if (candidatesFor(entry).includes(norm)) return { points: entry.tier, answer: entry.answer };
  }
  for (const entry of answers) {
    for (const candidate of candidatesFor(entry)) {
      if (levenshtein(norm, candidate) <= tolerance(candidate.length)) {
        return { points: entry.tier, answer: entry.answer };
      }
    }
  }
  return { points: 15, answer: null };
}
