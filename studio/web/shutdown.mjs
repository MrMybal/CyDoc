// Wait for the server's acknowledgement before allowing native shutdown/update.
export async function prepareShutdown({ pendingRequests, state, hasDocument, flush, wait = ms => new Promise(resolve => setTimeout(resolve, ms)), now = () => Date.now(), timeout = 10000 }) {
  const deadline = now() + timeout;
  const drain = async () => {
    while (pendingRequests() || hasDocument() && !['saved', 'readOnly'].includes(state())) {
      if (now() >= deadline) throw new Error('UnsavedChanges');
      await wait(50);
    }
  };
  await drain();
  await flush();
  await drain();
}
