/** Returns a promise that resolves after the specified number of milliseconds. */
export const sleep = (ms: number): Promise<void> =>
  new Promise((r, _) => setTimeout(r, ms));

export const clean = (s: string | undefined | null): string =>
  (s ?? "").replace(/\s+/g, " ").trim();

export const errMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

/**
 * Runs a given worker func on an array of items with limited concurrency.
 * @param items The array of items to process.
 * @param worker The async function to run on each item.
 * @param concurrency The maximum number of concurrent workers.
 * @param delayMs The delay in milliseconds between each worker invocation.
 * @returns A promise that resolves to an array of results from the worker function.
 */
export async function runConcurrently<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency: number,
  delayMs: number,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const runners = Array.from({ length: concurrency }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i] as T, i);
      await sleep(delayMs);
    }
  });
  await Promise.all(runners);
  return results;
}
