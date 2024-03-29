/// <reference types="node" resolution-mode="require"/>
import type { Dirent as _Dirent, Dir as _Dir } from 'fs';
import { NoArgCallback, TwoArgCallback } from '../filesystem.js';
import { Stats } from '../stats.js';
export declare class Dirent implements _Dirent {
    name: string;
    protected stats: Stats;
    constructor(name: string, stats: Stats);
    isFile(): boolean;
    isDirectory(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
}
/**
 * A class representing a directory stream.
 */
export declare class Dir implements _Dir {
    readonly path: string;
    protected closed: boolean;
    protected checkClosed(): void;
    protected _entries: Dirent[];
    constructor(path: string);
    /**
     * Asynchronously close the directory's underlying resource handle.
     * Subsequent reads will result in errors.
     */
    close(): Promise<void>;
    close(cb: NoArgCallback): void;
    /**
     * Synchronously close the directory's underlying resource handle.
     * Subsequent reads will result in errors.
     */
    closeSync(): void;
    protected _read(): Promise<Dirent | null>;
    /**
     * Asynchronously read the next directory entry via `readdir(3)` as an `Dirent`.
     * After the read is completed, a value is returned that will be resolved with an `Dirent`, or `null` if there are no more directory entries to read.
     * Directory entries returned by this function are in no particular order as provided by the operating system's underlying directory mechanisms.
     */
    read(): Promise<Dirent | null>;
    read(cb: TwoArgCallback<Dirent | null>): void;
    /**
     * Synchronously read the next directory entry via `readdir(3)` as a `Dirent`.
     * If there are no more directory entries to read, null will be returned.
     * Directory entries returned by this function are in no particular order as provided by the operating system's underlying directory mechanisms.
     */
    readSync(): Dirent | null;
    /**
     * Asynchronously iterates over the directory via `readdir(3)` until all entries have been read.
     */
    [Symbol.asyncIterator](): AsyncIterableIterator<Dirent>;
}
