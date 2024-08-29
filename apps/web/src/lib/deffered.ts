// Ponyfill for Promise.withResolvers
export function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;

  const promise = new Promise<T>((resolveCallback, rejectCalllback) => {
    resolve = resolveCallback;
    reject = rejectCalllback;
  });

  return { promise, resolve, reject };
}
