export type MutexCallback = () => void;
/**
 * Non-recursive mutex
 * @internal
 */
export default class Mutex {
    private _locks;
    lock(path: string): Promise<void>;
    unlock(path: string): void;
    tryLock(path: string): boolean;
    isLocked(path: string): boolean;
}
