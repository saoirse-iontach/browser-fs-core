import { FileSystem, FileSystemMetadata } from '../filesystem.js';
import { FileFlag } from '../file.js';
import { Stats } from '../stats.js';
import { File } from '../file.js';
import { Cred } from '../cred.js';
/**
 * This class serializes access to an underlying async filesystem.
 * For example, on an OverlayFS instance with an async lower
 * directory operations like rename and rmdir may involve multiple
 * requests involving both the upper and lower filesystems -- they
 * are not executed in a single atomic step.  OverlayFS uses this
 * LockedFS to avoid having to reason about the correctness of
 * multiple requests interleaving.
 */
export default class LockedFS<T extends FileSystem> implements FileSystem {
    private _fs;
    private _mu;
    protected _ready: Promise<this>;
    constructor(fs: T);
    whenReady(): Promise<this>;
    get metadata(): FileSystemMetadata;
    get fs(): T;
    rename(oldPath: string, newPath: string, cred: Cred): Promise<void>;
    renameSync(oldPath: string, newPath: string, cred: Cred): void;
    stat(p: string, cred: Cred): Promise<Stats>;
    statSync(p: string, cred: Cred): Stats;
    access(p: string, mode: number, cred: Cred): Promise<void>;
    accessSync(p: string, mode: number, cred: Cred): void;
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
    realpath(p: string, cred: Cred): Promise<string>;
    realpathSync(p: string, cred: Cred): string;
    truncate(p: string, len: number, cred: Cred): Promise<void>;
    truncateSync(p: string, len: number, cred: Cred): void;
    readFile(fname: string, flag: FileFlag, cred: Cred): Promise<Uint8Array>;
    readFileSync(fname: string, flag: FileFlag, cred: Cred): Uint8Array;
    writeFile(fname: string, data: Uint8Array, flag: FileFlag, mode: number, cred: Cred): Promise<void>;
    writeFileSync(fname: string, data: Uint8Array, flag: FileFlag, mode: number, cred: Cred): void;
    appendFile(fname: string, data: Uint8Array, flag: FileFlag, mode: number, cred: Cred): Promise<void>;
    appendFileSync(fname: string, data: Uint8Array, flag: FileFlag, mode: number, cred: Cred): void;
    chmod(p: string, mode: number, cred: Cred): Promise<void>;
    chmodSync(p: string, mode: number, cred: Cred): void;
    chown(p: string, new_uid: number, new_gid: number, cred: Cred): Promise<void>;
    chownSync(p: string, new_uid: number, new_gid: number, cred: Cred): void;
    utimes(p: string, atime: Date, mtime: Date, cred: Cred): Promise<void>;
    utimesSync(p: string, atime: Date, mtime: Date, cred: Cred): void;
    link(srcpath: string, dstpath: string, cred: Cred): Promise<void>;
    linkSync(srcpath: string, dstpath: string, cred: Cred): void;
    symlink(srcpath: string, dstpath: string, type: string, cred: Cred): Promise<void>;
    symlinkSync(srcpath: string, dstpath: string, type: string, cred: Cred): void;
    readlink(p: string, cred: Cred): Promise<string>;
    readlinkSync(p: string, cred: Cred): string;
}
