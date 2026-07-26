export function normalizeSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
    .replace(/\s+/g, ' ');
}

export function searchRelevance(value, rawQuery) {
  const text = normalizeSearch(value);
  const query = normalizeSearch(rawQuery);
  if (!query) return 0;
  if (!text) return Number.POSITIVE_INFINITY;
  if (text === query) return 0;
  if (text.startsWith(`${query} `)) return 1;

  const words = text.split(' ');
  if (words.slice(1).includes(query)) return 2;
  if (text.startsWith(query)) return 3;
  if (words.some((word) => word.startsWith(query))) return 4;
  if (text.includes(query)) return 5;
  return Number.POSITIVE_INFINITY;
}

export function rankByRelevance(items, rawQuery, getValues) {
  const query = normalizeSearch(rawQuery);
  if (!query) return items;

  return items
    .map((item, originalIndex) => {
      const extracted = getValues(item);
      const values = Array.isArray(extracted) ? extracted : [extracted];
      const score = values.reduce((best, value, fieldIndex) => {
        const fieldScore = searchRelevance(value, query);
        return Math.min(best, Number.isFinite(fieldScore) ? fieldScore + (fieldIndex * 10) : fieldScore);
      }, Number.POSITIVE_INFINITY);
      return { item, originalIndex, score };
    })
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => a.score - b.score || a.originalIndex - b.originalIndex)
    .map((entry) => entry.item);
}
