import { Cred } from '../cred.js';
import { PreloadFile, File, FileFlag } from '../file.js';
import { BaseFileSystem } from '../filesystem.js';
import { Stats } from '../stats.js';
/**
 * Represents an *asynchronous* key-value store.
 */
export interface AsyncKeyValueStore {
    /**
     * The name of the key-value store.
     */
    name(): string;
    /**
     * Empties the key-value store completely.
     */
    clear(): Promise<void>;
    /**
     * Begins a read-write transaction.
     */
    beginTransaction(type: 'readwrite'): AsyncKeyValueRWTransaction;
    /**
     * Begins a read-only transaction.
     */
    beginTransaction(type: 'readonly'): AsyncKeyValueROTransaction;
    beginTransaction(type: string): AsyncKeyValueROTransaction;
}
/**
 * Represents an asynchronous read-only transaction.
 */
export interface AsyncKeyValueROTransaction {
    /**
     * Retrieves the data at the given key.
     * @param key The key to look under for data.
     */
    get(key: string): Promise<Uint8Array>;
}
/**
 * Represents an asynchronous read-write transaction.
 */
export interface AsyncKeyValueRWTransaction extends AsyncKeyValueROTransaction {
    /**
     * Adds the data to the store under the given key. Overwrites any existing
     * data.
     * @param key The key to add the data under.
     * @param data The data to add to the store.
     * @param overwrite If 'true', overwrite any existing data. If 'false',
     *   avoids writing the data if the key exists.
     */
    put(key: string, data: Uint8Array, overwrite: boolean): Promise<boolean>;
    /**
     * Deletes the data at the given key.
     * @param key The key to delete from the store.
     */
    del(key: string): Promise<void>;
    /**
     * Commits the transaction.
     */
    commit(): Promise<void>;
    /**
     * Aborts and rolls back the transaction.
     */
    abort(): Promise<void>;
}
export declare class AsyncKeyValueFile extends PreloadFile<AsyncKeyValueFileSystem> implements File {
    constructor(_fs: AsyncKeyValueFileSystem, _path: string, _flag: FileFlag, _stat: Stats, contents?: Uint8Array);
    sync(): Promise<void>;
    close(): Promise<void>;
}
/**
 * An "Asynchronous key-value file system". Stores data to/retrieves data from
 * an underlying asynchronous key-value store.
 */
export declare class AsyncKeyValueFileSystem extends BaseFileSystem {
    static isAvailable(): boolean;
    protected store: AsyncKeyValueStore;
    private _cache;
    constructor(cacheSize: number);
    /**
     * Initializes the file system. Typically called by subclasses' async
     * constructors.
     */
    init(store: AsyncKeyValueStore): Promise<void>;
    getName(): string;
    isReadOnly(): boolean;
    supportsSymlinks(): boolean;
    supportsProps(): boolean;
    supportsSynch(): boolean;
    /**
     * Delete all contents stored in the file system.
     */
    empty(): Promise<void>;
    access(p: string, mode: number, cred: Cred): Promise<void>;
    /**
     * @todo Make rename compatible with the cache.
     */
    rename(oldPath: string, newPath: string, cred: Cred): Promise<void>;
    stat(p: string, cred: Cred): Promise<Stats>;
    createFile(p: string, flag: FileFlag, mode: number, cred: Cred): Promise<File>;
    openFile(p: string, flag: FileFlag, cred: Cred): Promise<File>;
    unlink(p: string, cred: Cred): Promise<void>;
    rmdir(p: string, cred: Cred): Promise<void>;
    mkdir(p: string, mode: number, cred: Cred): Promise<void>;
    readdir(p: string, cred: Cred): Promise<string[]>;
    chmod(p: string, mode: number, cred: Cred): Promise<void>;
    chown(p: string, new_uid: number, new_gid: number, cred: Cred): Promise<void>;
    _sync(p: string, data: Uint8Array, stats: Stats): Promise<void>;
    /**
     * Checks if the root directory exists. Creates it if it doesn't.
     */
    private makeRootDirectory;
    /**
     * Helper function for findINode.
     * @param parent The parent directory of the file we are attempting to find.
     * @param filename The filename of the inode we are attempting to find, minus
     *   the parent.
     */
    private _findINode;
    /**
     * Finds the Inode of the given path.
     * @param p The path to look up.
     * @todo memoize/cache
     */
    private findINode;
    /**
     * Given the ID of a node, retrieves the corresponding Inode.
     * @param tx The transaction to use.
     * @param p The corresponding path to the file (used for error messages).
     * @param id The ID to look up.
     */
    private getINode;
    /**
     * Given the Inode of a directory, retrieves the corresponding directory
     * listing.
     */
    private getDirListing;
    /**
     * Adds a new node under a random ID. Retries 5 times before giving up in
     * the exceedingly unlikely chance that we try to reuse a random GUID.
     */
    private addNewNode;
    /**
     * Commits a new file (well, a FILE or a DIRECTORY) to the file system with
     * the given mode.
     * Note: This will commit the transaction.
     * @param p The path to the new file.
     * @param type The type of the new file.
     * @param mode The mode to create the new file with.
     * @param cred The UID/GID to create the file with
     * @param data The data to store at the file's data node.
     */
    private commitNewFile;
    /**
     * Remove all traces of the given path from the file system.
     * @param p The path to remove from the file system.
     * @param isDir Does the path belong to a directory, or a file?
     * @todo Update mtime.
     */
    /**
     * Remove all traces of the given path from the file system.
     * @param p The path to remove from the file system.
     * @param isDir Does the path belong to a directory, or a file?
     * @todo Update mtime.
     */
    private removeEntry;
}
