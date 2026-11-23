/**
 * Robust fetch wrapper for Sunflower Land community APIs.
 * Automatically handles:
 *  - Configurable timeouts via AbortController (prevents 20-30s hanging sockets)
 *  - 1 automatic fast retry on ECONNRESET / ETIMEDOUT / TLS socket disconnects
 *  - Clean error recovery
 */
export async function sflFetch(
  url: string | URL,
  options: RequestInit & { timeoutMs?: number; retries?: number } = {}
): Promise<Response> {
  const { timeoutMs = 12000, retries = 1, ...init } = options;
  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort(new Error(`Sunflower Land API request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    try {
      const res = await fetch(url.toString(), {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res;
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;

      const isRecoverable =
        err.name === 'AbortError' ||
        err.name === 'TimeoutError' ||
        err.code === 'ECONNRESET' ||
        err.code === 'ETIMEDOUT' ||
        err.cause?.code === 'ECONNRESET' ||
        err.cause?.code === 'ETIMEDOUT' ||
        err.message?.includes('fetch failed') ||
        err.message?.includes('socket') ||
        err.message?.includes('timed out');

      if (attempt < retries && isRecoverable) {
        // Brief delay before retry to allow socket pool to clear
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

