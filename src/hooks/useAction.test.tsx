// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAction } from './useAction';
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
describe('pending actions', () => {
  it('rejects duplicate tasks and drops stale result after reset', async () => {
    const pending = deferred<string>();
    const { result } = renderHook(() => useAction<string>());
    let first!: Promise<string | undefined>;
    act(() => { first = result.current.run(() => pending.promise); });
    expect(result.current.busy).toBe(true);
    expect(await result.current.run(async () => 'duplicate')).toBeUndefined();
    act(() => result.current.reset());
    expect(await result.current.run(async () => 'overlapping')).toBeUndefined();
    await act(async () => { pending.resolve('abandoned'); await first; });
    expect(result.current.result).toBeNull();
    expect(result.current.busy).toBe(false);
  });
  it('does not publish a result after unmount', async () => {
    const pending = deferred<string>();
    const { result, unmount } = renderHook(() => useAction<string>());
    let task!: Promise<string | undefined>;
    act(() => { task = result.current.run(() => pending.promise); });
    unmount(); pending.resolve('late');
    expect(await task).toBeUndefined();
  });
  it('clears previous success on a failed retry', async () => {
    const { result } = renderHook(() => useAction<string>());
    await act(async () => { await result.current.run(async () => 'first'); });
    await act(async () => { await result.current.run(async () => { throw new Error('rejected'); }); });
    await waitFor(() => expect(result.current.error?.message).toBe('rejected'));
    expect(result.current.result).toBeNull();
  });
});
