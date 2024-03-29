/// <reference types="node" resolution-mode="require"/>
import type * as Node from 'fs';
import { Cred } from './cred.js';
/**
 * Indicates the type of the given file. Applied to 'mode'.
 */
export declare enum FileType {
    FILE,
    DIRECTORY,
    SYMLINK
}
/**
 * Common code used by both Stats and BigIntStats
 */
export declare abstract class StatsCommon<T extends number | bigint> implements Node.StatsBase<T> {
    static Deserialize(data: ArrayBufferLike | ArrayBufferView): StatsCommon<number> | StatsCommon<bigint>;
    protected abstract _isBigint: boolean;
    protected get _typename(): string;
    protected get _typename_inverse(): string;
    protected _convert(arg: number | bigint | string | boolean): T;
    blocks: T;
    mode: T;
    /**
     * ID of device containing file
     */
    dev: T;
    /**
     * inode number
     */
    ino: T;
    /**
     * device ID (if special file)
     */
    rdev: T;
    /**
     * number of hard links
     */
    nlink: T;
    /**
     * blocksize for file system I/O
     */
    blksize: T;
    /**
     * user ID of owner
     */
    uid: T;
    /**
     * group ID of owner
     */
    gid: T;
    /**
     * Some file systems stash data on stats objects.
     */
    fileData: Uint8Array | null;
    atimeMs: T;
    mtimeMs: T;
    ctimeMs: T;
    birthtimeMs: T;
    size: T;
    get atime(): Date;
    get mtime(): Date;
    get ctime(): Date;
    get birthtime(): Date;
    /**
     * Provides information about a particular entry in the file system.
     * @param itemType Type of the item (FILE, DIRECTORY, SYMLINK, or SOCKET)
     * @param size Size of the item in bytes. For directories/symlinks,
     *   this is normally the size of the struct that represents the item.
     * @param mode Unix-style file mode (e.g. 0o644)
     * @param atimeMs time of last access, in milliseconds since epoch
     * @param mtimeMs time of last modification, in milliseconds since epoch
     * @param ctimeMs time of last time file status was changed, in milliseconds since epoch
     * @param uid the id of the user that owns the file
     * @param gid the id of the group that owns the file
     * @param birthtimeMs time of file creation, in milliseconds since epoch
     */
    constructor(itemType?: FileType, size?: number | bigint, mode?: number | bigint, atimeMs?: number | bigint, mtimeMs?: number | bigint, ctimeMs?: number | bigint, uid?: number | bigint, gid?: number | bigint, birthtimeMs?: number | bigint);
    abstract serialize(): Uint8Array;
    /**
     * @return [Boolean] True if this item is a file.
     */
    isFile(): boolean;
    /**
     * @return [Boolean] True if this item is a directory.
     */
    isDirectory(): boolean;
    /**
     * @return [Boolean] True if this item is a symbolic link (only valid through lstat)
     */
    isSymbolicLink(): boolean;
    /**
     * Checks if a given user/group has access to this item
     * @param mode The request access as 4 bits (unused, read, write, execute)
     * @param uid The requesting UID
     * @param gid The requesting GID
     * @returns [Boolean] True if the request has access, false if the request does not
     */
    hasAccess(mode: number, cred: Cred): boolean;
    /**
     * Convert the current stats object into a cred object
     */
    getCred(uid?: number, gid?: number): Cred;
    /**
     * Change the mode of the file. We use this helper function to prevent messing
     * up the type of the file, which is encoded in mode.
     */
    chmod(mode: number): void;
    /**
     * Change the owner user/group of the file.
     * This function makes sure it is a valid UID/GID (that is, a 32 unsigned int)
     */
    chown(uid: number | bigint, gid: number | bigint): void;
    isSocket(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isFIFO(): boolean;
}
/**
 * Implementation of Node's `Stats`.
 *
 * Attribute descriptions are from `man 2 stat'
 * @see http://nodejs.org/api/fs.html#fs_class_fs_stats
 * @see http://man7.org/linux/man-pages/man2/stat.2.html
 */
export declare class Stats extends StatsCommon<number> implements Node.Stats {
    protected _isBigint: boolean;
    /**
     * Clones the stats object.
     */
    static clone(s: Stats): Stats;
    static Deserialize(data: ArrayBufferLike | ArrayBufferView): Stats;
    serialize(): Uint8Array;
}
/**
 * Stats with bigint
 * @todo Implement with bigint instead of wrapping Stats
 */
export declare class BigIntStats extends StatsCommon<bigint> implements Node.BigIntStats {
    protected _isBigint: boolean;
    atimeNs: bigint;
    mtimeNs: bigint;
    ctimeNs: bigint;
    birthtimeNs: bigint;
    /**
     * Clone a stats object.
     */
    static clone(s: BigIntStats | Stats): BigIntStats;
    static Deserialize(data: ArrayBufferLike | ArrayBufferView): Stats;
    serialize(): Uint8Array;
}
