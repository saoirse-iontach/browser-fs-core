/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
import type { ReadStream, WriteStream, FSWatcher, symlink as _symlink, BaseEncodingOptions, BufferEncodingOption, BigIntOptions } from 'node:fs';
import * as constants from './constants.js';
export { constants };
import { PathLike } from './shared.js';
import { FileContents } from '../filesystem.js';
import { BigIntStats, Stats } from '../stats.js';
import { Dirent } from './dir.js';
/**
 * Renames a file
 * @param oldPath
 * @param newPath
 */
export declare function rename(oldPath: PathLike, newPath: PathLike): Promise<void>;
/**
 * Test whether or not the given path exists by checking with the file system.
 * @param path
 */
export declare function exists(path: PathLike): Promise<boolean>;
/**
 * `stat`.
 * @param path
 * @returns Stats
 */
export declare function stat(path: PathLike, options: BigIntOptions): Promise<BigIntStats>;
export declare function stat(path: PathLike, options?: {
    bigint?: false;
}): Promise<Stats>;
/**
 * `lstat`.
 * `lstat()` is identical to `stat()`, except that if path is a symbolic link,
 * then the link itself is stat-ed, not the file that it refers to.
 * @param path
 * @return [BrowserFS.node.fs.Stats]
 */
export declare function lstat(path: PathLike, options?: {
    bigint?: false;
}): Promise<Stats>;
export declare function lstat(path: PathLike, options: {
    bigint: true;
}): Promise<BigIntStats>;
/**
 * `truncate`.
 * @param path
 * @param len
 */
export declare function truncate(path: PathLike, len?: number): Promise<void>;
/**
 * `unlink`.
 * @param path
 */
export declare function unlink(path: PathLike): Promise<void>;
/**
 * file open.
 * @see http://www.manpagez.com/man/2/open/
 * @param path
 * @param flags
 * @param mode defaults to `0644`
 */
export declare function open(path: PathLike, flag: string, mode?: number | string): Promise<number>;
/**
 * Synchronously reads the entire contents of a file.
 * @param filename
 * @param options
 * options.encoding The string encoding for the file contents. Defaults to `null`.
 * options.flag Defaults to `'r'`.
 * @return Uint8Array
 */
export declare function readFile(filename: PathLike, options?: {
    flag?: string;
}): Promise<Uint8Array>;
export declare function readFile(filename: PathLike, options: {
    encoding: string;
    flag?: string;
}): Promise<string>;
export declare function readFile(filename: PathLike, encoding: string): Promise<string>;
/**
 * Synchronously writes data to a file, replacing the file if it already
 * exists.
 *
 * The encoding option is ignored if data is a buffer.
 * @param filename
 * @param data
 * @param options
 * @option options [String] encoding Defaults to `'utf8'`.
 * @option options [Number] mode Defaults to `0644`.
 * @option options [String] flag Defaults to `'w'`.
 */
export declare function writeFile(filename: PathLike, data: FileContents, options?: {
    encoding?: string;
    mode?: number | string;
    flag?: string;
}): Promise<void>;
export declare function writeFile(filename: PathLike, data: FileContents, encoding?: string): Promise<void>;
export declare function writeFile(filename: PathLike, data: FileContents, options?: {
    encoding?: string;
    mode?: number | string;
    flag?: string;
} | string): Promise<void>;
/**
 * Asynchronously append data to a file, creating the file if it not yet
 * exists.
 *
 * @example Usage example
 *   fs.appendFile('message.txt', 'data to append', function (err) {
 *     if (err) throw err;
 *     console.log('The "data to append" was appended to file!');
 *   });
 * @param filename
 * @param data
 * @param options
 * @option options [String] encoding Defaults to `'utf8'`.
 * @option options [Number] mode Defaults to `0644`.
 * @option options [String] flag Defaults to `'a'`.
 */
export declare function appendFile(filename: PathLike, data: FileContents, options?: {
    encoding?: string;
    mode?: number | string;
    flag?: string;
}): Promise<void>;
export declare function appendFile(filename: PathLike, data: FileContents, encoding?: string): Promise<void>;
/**
 * `fstat`.
 * `fstat()` is identical to `stat()`, except that the file to be stat-ed is
 * specified by the file descriptor `fd`.
 * @param fd
 * @return [BrowserFS.node.fs.Stats]
 */
export declare function fstat(fd: number, options?: {
    bigint?: false;
}): Promise<Stats>;
export declare function fstat(fd: number, options: {
    bigint: true;
}): Promise<BigIntStats>;
/**
 * close.
 * @param fd
 */
export declare function close(fd: number): Promise<void>;
/**
 * ftruncate.
 * @param fd
 * @param len
 */
export declare function ftruncate(fd: number, len?: number): Promise<void>;
/**
 * fsync.
 * @param fd
 */
export declare function fsync(fd: number): Promise<void>;
/**
 * fdatasync.
 * @param fd
 */
export declare function fdatasync(fd: number): Promise<void>;
/**
 * Write buffer to the file specified by `fd`.
 * Note that it is unsafe to use fs.write multiple times on the same file
 * without waiting for it to return.
 * @param fd
 * @param buffer Uint8Array containing the data to write to
 *   the file.
 * @param offset Offset in the buffer to start reading data from.
 * @param length The amount of bytes to write to the file.
 * @param position Offset from the beginning of the file where this
 *   data should be written. If position is null, the data will be written at
 *   the current position.
 */
export declare function write(fd: number, buffer: Uint8Array, offset: number, length: number, position?: number): Promise<number>;
export declare function write(fd: number, data: string, position?: number | null, encoding?: BufferEncoding): Promise<number>;
/**
 * Read data from the file specified by `fd`.
 * @param fd
 * @param buffer The buffer that the data will be
 *   written to.
 * @param offset The offset within the buffer where writing will
 *   start.
 * @param length An integer specifying the number of bytes to read.
 * @param position An integer specifying where to begin reading from
 *   in the file. If position is null, data will be read from the current file
 *   position.
 */
export declare function read(fd: number, buffer: Uint8Array, offset: number, length: number, position?: number): Promise<{
    bytesRead: number;
    buffer: Uint8Array;
}>;
/**
 * `fchown`.
 * @param fd
 * @param uid
 * @param gid
 */
export declare function fchown(fd: number, uid: number, gid: number): Promise<void>;
/**
 * `fchmod`.
 * @param fd
 * @param mode
 */
export declare function fchmod(fd: number, mode: number | string): Promise<void>;
/**
 * Change the file timestamps of a file referenced by the supplied file
 * descriptor.
 * @param fd
 * @param atime
 * @param mtime
 */
export declare function futimes(fd: number, atime: number | Date, mtime: number | Date): Promise<void>;
/**
 * `rmdir`.
 * @param path
 */
export declare function rmdir(path: PathLike): Promise<void>;
/**
 * `mkdir`.
 * @param path
 * @param mode defaults to `0777`
 */
export declare function mkdir(path: PathLike, mode?: number | string): Promise<void>;
/**
 * `readdir`. Reads the contents of a directory.
 * @param path
 */
export declare function readdir(path: PathLike, options: {
    withFileTypes?: false;
}): Promise<string[]>;
export declare function readdir(path: PathLike, options: {
    withFileTypes: true;
}): Promise<Dirent[]>;
/**
 * `link`.
 * @param srcpath
 * @param dstpath
 */
export declare function link(srcpath: PathLike, dstpath: PathLike): Promise<void>;
/**
 * `symlink`.
 * @param srcpath
 * @param dstpath
 * @param type can be either `'dir'` or `'file'` (default is `'file'`)
 */
export declare function symlink(srcpath: PathLike, dstpath: PathLike, type?: _symlink.Type): Promise<void>;
/**
 * readlink.
 * @param path
 */
export declare function readlink(path: PathLike, options?: BaseEncodingOptions | BufferEncoding): Promise<string>;
export declare function readlink(path: PathLike, options: BufferEncodingOption): Promise<Uint8Array>;
export declare function readlink(path: PathLike, options?: BaseEncodingOptions | string): Promise<string | Uint8Array>;
/**
 * `chown`.
 * @param path
 * @param uid
 * @param gid
 */
export declare function chown(path: PathLike, uid: number, gid: number): Promise<void>;
/**
 * `lchown`.
 * @param path
 * @param uid
 * @param gid
 */
export declare function lchown(path: PathLike, uid: number, gid: number): Promise<void>;
/**
 * `chmod`.
 * @param path
 * @param mode
 */
export declare function chmod(path: PathLike, mode: string | number): Promise<void>;
/**
 * `lchmod`.
 * @param path
 * @param mode
 */
export declare function lchmod(path: PathLike, mode: number | string): Promise<void>;
/**
 * Change file timestamps of the file referenced by the supplied path.
 * @param path
 * @param atime
 * @param mtime
 */
export declare function utimes(path: PathLike, atime: number | Date, mtime: number | Date): Promise<void>;
/**
 * Change file timestamps of the file referenced by the supplied path.
 * @param path
 * @param atime
 * @param mtime
 */
export declare function lutimes(path: PathLike, atime: number | Date, mtime: number | Date): Promise<void>;
/**
 * `realpath`.
 * @param path
 * @param options
 * @return resolved path
 *
 * Note: This *Can not* use doOp since doOp depends on it
 */
export declare function realpath(path: PathLike, options?: BaseEncodingOptions): Promise<string>;
export declare function watchFile(filename: PathLike, listener: (curr: Stats, prev: Stats) => void): Promise<void>;
export declare function watchFile(filename: PathLike, options: {
    persistent?: boolean;
    interval?: number;
}, listener: (curr: Stats, prev: Stats) => void): Promise<void>;
export declare function unwatchFile(filename: PathLike, listener?: (curr: Stats, prev: Stats) => void): Promise<void>;
export declare function watch(filename: PathLike, listener?: (event: string, filename: PathLike) => any): Promise<FSWatcher>;
export declare function watch(filename: PathLike, options: {
    persistent?: boolean;
}, listener?: (event: string, filename: string) => any): Promise<FSWatcher>;
/**
 * `access`.
 * @param path
 * @param mode
 */
export declare function access(path: PathLike, mode?: number): Promise<void>;
export declare function createReadStream(path: PathLike, options?: {
    flags?: string;
    encoding?: string;
    fd?: number;
    mode?: number;
    autoClose?: boolean;
}): Promise<ReadStream>;
export declare function createWriteStream(path: PathLike, options?: {
    flags?: string;
    encoding?: string;
    fd?: number;
    mode?: number;
}): Promise<WriteStream>;
export declare function rm(path: PathLike): Promise<void>;
export declare function mkdtemp(path: PathLike): Promise<void>;
export declare function copyFile(path: PathLike): Promise<void>;
