import type { PackedAsset } from '../types.js';

export function unpackAsset(asset: PackedAsset): ArrayBuffer {
  const binary = atob(asset.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
