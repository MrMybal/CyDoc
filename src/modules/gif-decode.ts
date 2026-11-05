export interface GifFrame { rgba: Uint8ClampedArray; duration: number }
export interface GifAnimation { width: number; height: number; frames: GifFrame[]; loops: number }

/** GIF87a/89a raster decoder. No DOM, network, eval, or platform codec dependency. */
export function decodeGif(bytes: Uint8Array, maxDecodedBytes = 64 * 1024 * 1024): GifAnimation {
  let offset = 0;
  const byte = () => { if (offset >= bytes.length) throw new Error('Truncated GIF'); return bytes[offset++]!; };
  const word = () => byte() | byte() << 8;
  const take = (size: number) => { if (offset + size > bytes.length) throw new Error('Truncated GIF block'); const data = bytes.subarray(offset, offset + size); offset += size; return data; };
  const header = String.fromCharCode(...take(6));
  if (!['GIF87a', 'GIF89a'].includes(header)) throw new Error('Invalid GIF header');
  const width = word(), height = word(), flags = byte(), background = byte(); byte();
  if (!width || !height || width * height * 4 > maxDecodedBytes) throw new Error('GIF dimensions exceed the memory budget');
  const table = (bits: number) => take(3 * (1 << bits));
  const global = flags & 128 ? table((flags & 7) + 1) : undefined;
  const blocks = () => { const chunks: Uint8Array[] = []; let size, count = 0; while ((size = byte())) { chunks.push(take(size)); count += size; } const result = new Uint8Array(count); let pos = 0; for (const chunk of chunks) { result.set(chunk, pos); pos += chunk.length; } return result; };
  const canvas = new Uint8ClampedArray(width * height * 4), frames: GifFrame[] = [];
  let disposal = 0, delay = 100, transparent = -1, loops = 0;
  let previous: { disposal: number; x: number; y: number; w: number; h: number; transparent: number; restore?: Uint8ClampedArray } | undefined;
  let trailer = false;
  while (offset < bytes.length) {
    const kind = byte();
    if (kind === 0x3b) { trailer = true; break; }
    if (kind === 0x21) {
      const label = byte();
      if (label === 0xf9) { if (byte() !== 4) throw new Error('Invalid GIF control extension'); const packed = byte(); disposal = packed >> 2 & 7; delay = Math.max(20, word() * 10); const index = byte(); transparent = packed & 1 ? index : -1; if (byte() !== 0) throw new Error('Invalid GIF control terminator'); }
      else { const extension = blocks(); if (label === 0xff && String.fromCharCode(...extension.subarray(0, 11)) === 'NETSCAPE2.0' && extension.length >= 14) loops = extension[12]! | extension[13]! << 8; }
      continue;
    }
    if (kind !== 0x2c) throw new Error('Unsupported GIF block');
    const x = word(), y = word(), w = word(), h = word(), packed = byte();
    if (!w || !h || x + w > width || y + h > height) throw new Error('GIF frame outside canvas');
    if ((frames.length + 2) * width * height * 4 > maxDecodedBytes || frames.length >= 1000) throw new Error('GIF frames exceed the memory budget');
    const colors = packed & 128 ? table((packed & 7) + 1) : global;
    if (!colors) throw new Error('GIF has no color table');
    if (!frames.length && transparent < 0 && global && background * 3 + 2 < global.length) for (let i = 0; i < canvas.length; i += 4) { canvas.set(global.subarray(background * 3, background * 3 + 3), i); canvas[i + 3] = 255; }
    if (previous?.disposal === 3 && previous.restore) canvas.set(previous.restore);
    if (previous?.disposal === 2) for (let py = previous.y; py < previous.y + previous.h; py++) for (let px = previous.x; px < previous.x + previous.w; px++) {
      const i = (py * width + px) * 4;
      if (previous.transparent < 0 && global && background * 3 + 2 < global.length) { canvas.set(global.subarray(background * 3, background * 3 + 3), i); canvas[i + 3] = 255; } else canvas.fill(0, i, i + 4);
    }
    const restore = disposal === 3 ? canvas.slice() : undefined;
    const indices = lzw(blocksAfterCodeSize(), w * h);
    function blocksAfterCodeSize() { const minimum = byte(); return { minimum, data: blocks() }; }
    const rows: number[] = [];
    if (packed & 64) for (const [start, step] of [[0, 8], [4, 8], [2, 4], [1, 2]]) for (let row = start!; row < h; row += step!) rows.push(row);
    else for (let row = 0; row < h; row++) rows.push(row);
    for (let row = 0; row < h; row++) for (let col = 0; col < w; col++) {
      const color = indices[row * w + col]!; if (color === transparent) continue;
      if (color * 3 + 2 >= colors.length) throw new Error('Invalid GIF color index');
      const target = ((y + rows[row]!) * width + x + col) * 4;
      canvas.set(colors.subarray(color * 3, color * 3 + 3), target); canvas[target + 3] = 255;
    }
    frames.push({ rgba: canvas.slice(), duration: delay });
    previous = { disposal, x, y, w, h, transparent, restore };
    disposal = 0; delay = 100; transparent = -1;
  }
  if (!trailer || !frames.length) throw new Error('Incomplete GIF');
  return { width, height, frames, loops };
}

function lzw({ minimum, data }: { minimum: number; data: Uint8Array }, count: number) {
  if (minimum < 2 || minimum > 8) throw new Error('Invalid GIF LZW code size');
  const clear = 1 << minimum, end = clear + 1, prefix = new Int16Array(4096), suffix = new Uint8Array(4096), stack = new Uint8Array(4097), output = new Uint8Array(count);
  for (let i = 0; i < clear; i++) suffix[i] = i;
  let size = minimum + 1, available = end + 1, bit = 0, old = -1, first = 0, used = 0, ended = false;
  while (bit + size <= data.length * 8) {
    let code = 0; for (let i = 0; i < size; i++, bit++) code |= (data[bit >> 3]! >> (bit & 7) & 1) << i;
    if (code === clear) { size = minimum + 1; available = end + 1; old = -1; continue; }
    if (code === end) { ended = true; break; }
    const incoming = code; let top = 0;
    if (code > available || code >= 4096 || (code === available && old < 0)) throw new Error('Invalid GIF LZW code');
    if (code === available) { stack[top++] = first; code = old; }
    let depth = 0;
    while (code >= clear) { if (code >= available || ++depth > 4096) throw new Error('Invalid GIF LZW dictionary'); stack[top++] = suffix[code]!; code = prefix[code]!; }
    first = suffix[code]!; stack[top++] = first;
    while (top) { if (used >= count) throw new Error('Too many GIF pixels'); output[used++] = stack[--top]!; }
    if (old >= 0 && available < 4096) { prefix[available] = old; suffix[available++] = first; if (available === 1 << size && size < 12) size++; }
    old = incoming;
  }
  if (!ended || used !== count) throw new Error('Incomplete GIF raster');
  return output;
}
