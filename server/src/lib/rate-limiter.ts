export function createRateLimiter(minDelayMs: number = 2000) {
  let lastRequest = 0;
  return async () => {
    const now = Date.now();
    const elapsed = now - lastRequest;
    if (elapsed < minDelayMs) {
      await Bun.sleep(minDelayMs - elapsed);
    }
    lastRequest = Date.now();
  };
}
