/**
 * Non-recursive mutex
 * @internal
 */
export default class Mutex {
    constructor() {
        this._locks = new Map();
    }
    lock(path) {
        return new Promise(resolve => {
            if (this._locks.has(path)) {
                this._locks.get(path).push(resolve);
            }
            else {
                this._locks.set(path, []);
            }
        });
    }
    unlock(path) {
        if (!this._locks.has(path)) {
            throw new Error('unlock of a non-locked mutex');
        }
        const next = this._locks.get(path).shift();
        /*
            don't unlock - we want to queue up next for the
            end of the current task execution, but we don't
            want it to be called inline with whatever the
            current stack is.  This way we still get the nice
            behavior that an unlock immediately followed by a
            lock won't cause starvation.
        */
        if (next) {
            setTimeout(next, 0);
            return;
        }
        this._locks.delete(path);
    }
    tryLock(path) {
        if (this._locks.has(path)) {
            return false;
        }
        this._locks.set(path, []);
        return true;
    }
    isLocked(path) {
        return this._locks.has(path);
    }
}
