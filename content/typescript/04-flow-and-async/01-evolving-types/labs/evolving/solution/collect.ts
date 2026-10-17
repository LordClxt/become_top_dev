export function range(start: number, limit: number) {
  const nums = [];
  for (let i = start; i < limit; i++) nums.push(i);
  return nums;
}

export function tokenize(text: string) {
  const tokens = [];
  for (const word of text.split(' ')) {
    if (word === '') continue;
    tokens.push(/^\d+$/.test(word) ? Number(word) : word);
  }
  return tokens;
}

export function parseOrNull(text: string) {
  let result = null;
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value === 'number') result = value;
  } catch {
    // texte invalide : result reste null
  }
  return result;
}

export function squaresOf(xs: readonly number[]) {
  const out = [];
  for (const x of xs) out.push(x * x);
  return out;
}
