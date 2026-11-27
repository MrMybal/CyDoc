// A Yjs state vector does not advance for deletions. Check the saved text too.
export async function bodyDigest(body) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
  return Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, '0')).join('');
}

export async function acknowledgesSavedState(message, read, hash = bodyDigest) {
  const before = read();
  if (message.vector !== before.vector || typeof message.bodyHash !== 'string') return false;
  const digest = await hash(before.body);
  const after = read();
  return digest === message.bodyHash && before.document === after.document
    && before.vector === after.vector && before.body === after.body;
}
