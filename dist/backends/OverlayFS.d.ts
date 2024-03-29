import { type FileSystem, BaseFileSystem, FileSystemMetadata } from '../filesystem.js';
import { File, FileFlag, PreloadFile } from '../file.js';
import { Stats } from '../stats.js';
import LockedFS from './Locked.js';
import { Cred } from '../cred.js';
import { type BackendOptions } from './backend.js';
export declare namespace OverlayFS {
    /**
     * Configuration options for OverlayFS instances.
     */
    interface Options {
        /**
         * The file system to write modified files to.
         */
        writable: FileSystem;
        /**
         * The file system that initially populates this file system.
         */
        readable: FileSystem;
    }
}
/**
 * *INTERNAL, DO NOT USE DIRECTLY!*
 *
 * Core OverlayFS class that contains no locking whatsoever. We wrap these objects
 * in a LockedFS to prevent races.
 */
export declare class UnlockedOverlayFS extends BaseFileSystem {
    static isAvailable(): boolean;
    private _writable;
    private _readable;
    private _isInitialized;
    private _deletedFiles;
    private _deleteLog;
    private _deleteLogUpdatePending;
    private _deleteLogUpdateNeeded;
    private _deleteLogError;
    constructor({ writable, readable }: OverlayFS.Options);
    get metadata(): FileSystemMetadata;
    getOverlayedFileSystems(): {
        readable: FileSystem;
        writable: FileSystem;
    };
    _syncAsync(file: PreloadFile<UnlockedOverlayFS>): Promise<void>;
    _syncSync(file: PreloadFile<UnlockedOverlayFS>): void;
    /**
     * **INTERNAL METHOD**
     *
     * Called once to load up metadata stored on the writable file system.
     */
    _initialize(): Promise<void>;
    getDeletionLog(): string;
    restoreDeletionLog(log: string, cred: Cred): void;
    rename(oldPath: string, newPath: string, cred: Cred): Promise<void>;
    renameSync(oldPath: string, newPath: string, cred: Cred): void;
    stat(p: string, cred: Cred): Promise<Stats>;
    statSync(p: string, cred: Cred): Stats;
    open(p: string, flag: FileFlag, mode: number, cred: Cred): Promise<File>;
    openSync(p: string, flag: FileFlag, mode: number, cred: Cred): File;
    unlink(p: string, cred: Cred): Promise<void>;
    unlinkSync(p: string, cred: Cred): void;
    rmdir(p: string, cred: Cred): Promise<void>;
    rmdirSync(p: string, cred: Cred): void;
    mkdir(p: string, mode: number, cred: Cred): Promise<void>;
    mkdirSync(p: string, mode: number, cred: Cred): void;
    readdir(p: string, cred: Cred): Promise<string[]>;
    readdirSync(p: string, cred: Cred): string[];
    exists(p: string, cred: Cred): Promise<boolean>;
    existsSync(p: string, cred: Cred): boolean;
    chmod(p: string, mode: number, cred: Cred): Promise<void>;
    chmodSync(p: string, mode: number, cred: Cred): void;
    chown(p: string, new_uid: number, new_gid: number, cred: Cred): Promise<void>;
    chownSync(p: string, new_uid: number, new_gid: number, cred: Cred): void;
    utimes(p: string, atime: Date, mtime: Date, cred: Cred): Promise<void>;
    utimesSync(p: string, atime: Date, mtime: Date, cred: Cred): void;
    private deletePath;
    private updateLog;
    private _reparseDeletionLog;
    private checkInitialized;
    private checkPath;
    /**
     * With the given path, create the needed parent directories on the writable storage
     * should they not exist. Use modes from the read-only storage.
     */
    private createParentDirectories;
    private createParentDirectoriesAsync;
    /**
     * Helper function:
     * - Ensures p is on writable before proceeding. Throws an error if it doesn't exist.
     * - Calls f to perform operation on writable.
     */
    private operateOnWritable;
    private operateOnWritableAsync;
    /**
     * Copy from readable to writable storage.
     * PRECONDITION: File does not exist on writable storage.
     */
    private copyToWritable;
    private copyToWritableAsync;
}
/**
 * OverlayFS makes a read-only filesystem writable by storing writes on a second,
 * writable file system. Deletes are persisted via metadata stored on the writable
 * file system.
 */
export declare class OverlayFS extends LockedFS<UnlockedOverlayFS> {
    static readonly Name = "OverlayFS";
    static Create: any;
    static readonly Options: BackendOptions;
    static isAvailable(): boolean;
    /**
     * @param options The options to initialize the OverlayFS with
     */
    constructor(options: OverlayFS.Options);
    getOverlayedFileSystems(): OverlayFS.Options;
    getDeletionLog(): string;
    resDeletionLog(): string;
    unwrap(): UnlockedOverlayFS;
    private _initialize;
}
