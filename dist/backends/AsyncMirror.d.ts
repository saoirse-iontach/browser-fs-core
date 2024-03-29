import { type FileSystem, SynchronousFileSystem, FileSystemMetadata } from '../filesystem.js';
import { File, FileFlag, PreloadFile } from '../file.js';
import { Stats } from '../stats.js';
import { Cred } from '../cred.js';
import { type BackendOptions } from './backend.js';
export declare namespace AsyncMirror {
    /**
     * Configuration options for the AsyncMirror file system.
     */
    interface Options {
        /**
         * The synchronous file system to mirror the asynchronous file system to.
         */
        sync: FileSystem;
        /**
         * The asynchronous file system to mirror.
         */
        async: FileSystem;
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
export declare class AsyncMirror extends SynchronousFileSystem {
    static readonly Name = "AsyncMirror";
    static Create: any;
    static readonly Options: BackendOptions;
    static isAvailable(): boolean;
    /**
     * Queue of pending asynchronous operations.
     */
    private _queue;
    private _queueRunning;
    private _sync;
    private _async;
    private _isInitialized;
    private _initializeCallbacks;
    /**
     *
     * Mirrors the synchronous file system into the asynchronous file system.
     *
     * @param sync The synchronous file system to mirror the asynchronous file system to.
     * @param async The asynchronous file system to mirror.
     */
    constructor({ sync, async }: AsyncMirror.Options);
    get metadata(): FileSystemMetadata;
    _syncSync(fd: PreloadFile<AsyncMirror>): void;
    renameSync(oldPath: string, newPath: string, cred: Cred): void;
    statSync(p: string, cred: Cred): Stats;
    openSync(p: string, flag: FileFlag, mode: number, cred: Cred): File;
    unlinkSync(p: string, cred: Cred): void;
    rmdirSync(p: string, cred: Cred): void;
    mkdirSync(p: string, mode: number, cred: Cred): void;
    readdirSync(p: string, cred: Cred): string[];
    existsSync(p: string, cred: Cred): boolean;
    chmodSync(p: string, mode: number, cred: Cred): void;
    chownSync(p: string, new_uid: number, new_gid: number, cred: Cred): void;
    utimesSync(p: string, atime: Date, mtime: Date, cred: Cred): void;
    /**
     * Called once to load up files from async storage into sync storage.
     */
    private _initialize;
    private enqueueOp;
}
