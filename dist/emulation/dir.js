import { readdir } from './promises.js';
import { ApiError, ErrorCode } from '../ApiError.js';
import { readdirSync } from './sync.js';
export class Dirent {
    constructor(name, stats) {
        this.name = name;
        this.stats = stats;
    }
    isFile() {
        return this.stats.isFile();
    }
    isDirectory() {
        return this.stats.isDirectory();
    }
    isBlockDevice() {
        return this.stats.isBlockDevice();
    }
    isCharacterDevice() {
        return this.stats.isCharacterDevice();
    }
    isSymbolicLink() {
        return this.stats.isSymbolicLink();
    }
    isFIFO() {
        return this.stats.isFIFO();
    }
    isSocket() {
        return this.stats.isSocket();
    }
}
/**
 * A class representing a directory stream.
 */
export class Dir {
    checkClosed() {
        if (this.closed) {
            throw new ApiError(ErrorCode.EBADF, 'Can not use closed Dir');
        }
    }
    constructor(path) {
        this.path = path;
        this.closed = false;
    }
    close(cb) {
        this.closed = true;
        if (!cb) {
            return Promise.resolve();
        }
        cb();
    }
    /**
     * Synchronously close the directory's underlying resource handle.
     * Subsequent reads will result in errors.
     */
    closeSync() {
        this.closed = true;
    }
    async _read() {
        if (!this._entries) {
            this._entries = await readdir(this.path, { withFileTypes: true });
        }
        if (this._entries.length == 0) {
            return null;
        }
        return this._entries.shift();
    }
    read(cb) {
        if (!cb) {
            return this._read();
        }
        this._read().then(value => cb(null, value));
    }
    /**
     * Synchronously read the next directory entry via `readdir(3)` as a `Dirent`.
     * If there are no more directory entries to read, null will be returned.
     * Directory entries returned by this function are in no particular order as provided by the operating system's underlying directory mechanisms.
     */
    readSync() {
        if (!this._entries) {
            this._entries = readdirSync(this.path, { withFileTypes: true });
        }
        if (this._entries.length == 0) {
            return null;
        }
        return this._entries.shift();
    }
    /**
     * Asynchronously iterates over the directory via `readdir(3)` until all entries have been read.
     */
    [Symbol.asyncIterator]() {
        const _this = this;
        return {
            [Symbol.asyncIterator]: this[Symbol.asyncIterator],
            async next() {
                const value = await _this._read();
                if (value != null) {
                    return { done: false, value };
                }
                await _this.close();
                return { done: true, value: undefined };
            },
        };
    }
}
