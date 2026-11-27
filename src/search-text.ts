/** Original UTF-16 ranges for accent-insensitive matches, including combining accents. */
export function searchTextRanges(text: string, terms: string[]): Array<{ start: number; end: number }> {
  let folded = '', offset = 0;
  const starts: number[] = [], ends: number[] = [];
  for (const character of text) {
    const value = character.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();
    if (!value && ends.length) ends[ends.length - 1] = offset + character.length;
    for (let i = 0; i < value.length; i++) { starts.push(offset); ends.push(offset + character.length); }
    folded += value; offset += character.length;
  }
  const ranges: Array<{ start: number; end: number }> = [];
  for (const term of new Set(terms.filter(Boolean))) {
    let position = folded.indexOf(term);
    while (position >= 0) {
      ranges.push({ start: starts[position]!, end: ends[position + term.length - 1]! });
      position = folded.indexOf(term, position + term.length);
    }
  }
  const merged: typeof ranges = [];
  for (const range of ranges.sort((a, b) => a.start - b.start || b.end - a.end)) {
    const previous = merged[merged.length - 1];
    if (previous && previous.end >= range.start) previous.end = Math.max(previous.end, range.end); else merged.push({ ...range });
  }
  return merged;
}

export function searchExcerpt(text: string, terms: string[], length = 180): string {
  const folded=text.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase();
  const found=terms.map(term=>({index:folded.indexOf(term),length:term.length})).filter(item=>item.index>=0).sort((a,b)=>a.index-b.index)[0];
  let match: {start:number;end:number}|undefined;
  if(found){let offset=0,position=0;for(const character of text){const size=character.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase().length;if(!match&&position+size>found.index)match={start:offset,end:offset+character.length};position+=size;offset+=character.length;if(match){match.end=offset;if(position>=found.index+found.length)break;}}}
  let start = Math.max(0, (match?.start || 0) - 45), end = Math.min(text.length, start + length);
  while (start > 0 && start < (match?.start || 0) && !/\s/.test(text[start - 1]!)) start++;
  if (end < text.length) { const space = text.lastIndexOf(' ', end); if (space > start + length / 2 && space >= (match?.end || 0)) end = space; }
  // Never cut a surrogate pair or a combining accent away from its base character.
  if (start && /[\uDC00-\uDFFF\p{M}]/u.test(text[start] || '')) start--;
  while (end < text.length && /[\uDC00-\uDFFF\p{M}]/u.test(text[end] || '')) end++;
  return `${start ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}
