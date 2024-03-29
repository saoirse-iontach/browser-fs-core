var _a;
import { SynchronousFileSystem } from '../filesystem.js';
import { ApiError, ErrorCode } from '../ApiError.js';
import { FileFlag, PreloadFile } from '../file.js';
import { join } from '../emulation/path.js';
import { Cred } from '../cred.js';
import { CreateBackend } from './backend.js';
/**
 * We define our own file to interpose on syncSync() for mirroring purposes.
 */
class MirrorFile extends PreloadFile {
    constructor(fs, path, flag, stat, data) {
        super(fs, path, flag, stat, data);
    }
    syncSync() {
        if (this.isDirty()) {
            this._fs._syncSync(this);
            this.resetDirty();
        }
    }
    closeSync() {
        this.syncSync();
    }
}
/**
 * AsyncMirrorFS mirrors a synchronous filesystem into an asynchronous filesystem
 * by:
 *
 * * Performing operations over the in-memory copy, while asynchronously pipelining them
 *   to the backing store.
 * * During application loading, the contents of the async file system can be reloaded into
 *   the synchronous store, if desired.
 *
 * The two stores will be kept in sync. The most common use-case is to pair a synchronous
 * in-memory filesystem with an asynchronous backing store.
 *
 * Example: Mirroring an IndexedDB file system to an in memory file system. Now, you can use
 * IndexedDB synchronously.
 *
 * ```javascript
 * BrowserFS.configure({
 *   fs: "AsyncMirror",
 *   options: {
 *     sync: { fs: "InMemory" },
 *     async: { fs: "IndexedDB" }
 *   }
 * }, function(e) {
 *   // BrowserFS is initialized and ready-to-use!
 * });
 * ```
 *
 * Or, alternatively:
 *
 * ```javascript
 * BrowserFS.Backend.IndexedDB.Create(function(e, idbfs) {
 *   BrowserFS.Backend.InMemory.Create(function(e, inMemory) {
 *     BrowserFS.Backend.AsyncMirror({
 *       sync: inMemory, async: idbfs
 *     }, function(e, mirrored) {
 *       BrowserFS.initialize(mirrored);
 *     });
 *   });
 * });
 * ```
 */
export class AsyncMirror extends SynchronousFileSystem {
    static isAvailable() {
        return true;
    }
    /**
     *
     * Mirrors the synchronous file system into the asynchronous file system.
     *
     * @param sync The synchronous file system to mirror the asynchronous file system to.
     * @param async The asynchronous file system to mirror.
     */
    constructor({ sync, async }) {
        super();
        /**
         * Queue of pending asynchronous operations.
         */
        this._queue = [];
        this._queueRunning = false;
        this._isInitialized = false;
        this._initializeCallbacks = [];
        this._sync = sync;
        this._async = async;
        this._ready = this._initialize();
    }
    get metadata() {
        return {
            ...super.metadata,
            name: AsyncMirror.Name,
            synchronous: true,
            supportsProperties: this._sync.metadata.supportsProperties && this._async.metadata.supportsProperties,
        };
    }
    _syncSync(fd) {
        const stats = fd.getStats();
        this._sync.writeFileSync(fd.getPath(), fd.getBuffer(), FileFlag.getFileFlag('w'), stats.mode, stats.getCred(0, 0));
        this.enqueueOp({
            apiMethod: 'writeFile',
            arguments: [fd.getPath(), fd.getBuffer(), fd.getFlag(), stats.mode, stats.getCred(0, 0)],
        });
    }
    renameSync(oldPath, newPath, cred) {
        this._sync.renameSync(oldPath, newPath, cred);
        this.enqueueOp({
            apiMethod: 'rename',
            arguments: [oldPath, newPath, cred],
        });
    }
    statSync(p, cred) {
        return this._sync.statSync(p, cred);
    }
    openSync(p, flag, mode, cred) {
        // Sanity check: Is this open/close permitted?
        const fd = this._sync.openSync(p, flag, mode, cred);
        fd.closeSync();
        return new MirrorFile(this, p, flag, this._sync.statSync(p, cred), this._sync.readFileSync(p, FileFlag.getFileFlag('r'), cred));
    }
    unlinkSync(p, cred) {
        this._sync.unlinkSync(p, cred);
        this.enqueueOp({
            apiMethod: 'unlink',
            arguments: [p, cred],
        });
    }
    rmdirSync(p, cred) {
        this._sync.rmdirSync(p, cred);
        this.enqueueOp({
            apiMethod: 'rmdir',
            arguments: [p, cred],
        });
    }
    mkdirSync(p, mode, cred) {
        this._sync.mkdirSync(p, mode, cred);
        this.enqueueOp({
            apiMethod: 'mkdir',
            arguments: [p, mode, cred],
        });
    }
    readdirSync(p, cred) {
        return this._sync.readdirSync(p, cred);
    }
    existsSync(p, cred) {
        return this._sync.existsSync(p, cred);
    }
    chmodSync(p, mode, cred) {
        this._sync.chmodSync(p, mode, cred);
        this.enqueueOp({
            apiMethod: 'chmod',
            arguments: [p, mode, cred],
        });
    }
    chownSync(p, new_uid, new_gid, cred) {
        this._sync.chownSync(p, new_uid, new_gid, cred);
        this.enqueueOp({
            apiMethod: 'chown',
            arguments: [p, new_uid, new_gid, cred],
        });
    }
    utimesSync(p, atime, mtime, cred) {
        this._sync.utimesSync(p, atime, mtime, cred);
        this.enqueueOp({
            apiMethod: 'utimes',
            arguments: [p, atime, mtime, cred],
        });
    }
    /**
     * Called once to load up files from async storage into sync storage.
     */
    async _initialize() {
        if (!this._isInitialized) {
            // First call triggers initialization, the rest wait.
            const copyDirectory = async (p, mode) => {
                if (p !== '/') {
                    const stats = await this._async.stat(p, Cred.Root);
                    this._sync.mkdirSync(p, mode, stats.getCred());
                }
                const files = await this._async.readdir(p, Cred.Root);
                for (const file of files) {
                    await copyItem(join(p, file));
                }
            }, copyFile = async (p, mode) => {
                const data = await this._async.readFile(p, FileFlag.getFileFlag('r'), Cred.Root);
                this._sync.writeFileSync(p, data, FileFlag.getFileFlag('w'), mode, Cred.Root);
            }, copyItem = async (p) => {
                const stats = await this._async.stat(p, Cred.Root);
                if (stats.isDirectory()) {
                    await copyDirectory(p, stats.mode);
                }
                else {
                    await copyFile(p, stats.mode);
                }
            };
            try {
                await copyDirectory('/', 0);
                this._isInitialized = true;
            }
            catch (e) {
                this._isInitialized = false;
                throw e;
            }
        }
        return this;
    }
    enqueueOp(op) {
        this._queue.push(op);
        if (!this._queueRunning) {
            this._queueRunning = true;
            const doNextOp = (err) => {
                if (err) {
                    throw new Error(`WARNING: File system has desynchronized. Received following error: ${err}\n$`);
                }
                if (this._queue.length > 0) {
                    const op = this._queue.shift();
                    op.arguments.push(doNextOp);
                    this._async[op.apiMethod].apply(this._async, op.arguments);
                }
                else {
                    this._queueRunning = false;
                }
            };
            doNextOp();
        }
    }
}
_a = AsyncMirror;
AsyncMirror.Name = 'AsyncMirror';
AsyncMirror.Create = CreateBackend.bind(_a);
AsyncMirror.Options = {
    sync: {
        type: 'object',
        description: 'The synchronous file system to mirror the asynchronous file system to.',
        validator: async (v) => {
            if (!v?.metadata.synchronous) {
                throw new ApiError(ErrorCode.EINVAL, `'sync' option must be a file system that supports synchronous operations`);
            }
        },
    },
    async: {
        type: 'object',
        description: 'The asynchronous file system to mirror.',
    },
};
