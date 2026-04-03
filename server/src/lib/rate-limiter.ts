export function createRateLimiter(minDelayMs: number = 2000) {
  let nextAllowed = 0;
  return async () => {
    const now = Date.now();
    if (now < nextAllowed) {
      await Bun.sleep(nextAllowed - now);
    }
    nextAllowed = Date.now() + minDelayMs;
  };
}
