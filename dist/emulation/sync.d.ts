/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
import { FileContents } from '../filesystem.js';
import { BigIntStats, Stats } from '../stats.js';
import type { symlink, ReadSyncOptions, BaseEncodingOptions, BufferEncodingOption } from 'fs';
import type * as Node from 'fs';
import { PathLike } from './shared.js';
import { Dir, Dirent } from './dir.js';
/**
 * Synchronous rename.
 * @param oldPath
 * @param newPath
 */
export declare function renameSync(oldPath: PathLike, newPath: PathLike): void;
/**
 * Test whether or not the given path exists by checking with the file system.
 * @param path
 */
export declare function existsSync(path: PathLike): boolean;
/**
 * Synchronous `stat`.
 * @param path
 * @returns Stats
 */
export declare function statSync(path: PathLike, options?: {
    bigint: false;
}): Stats;
export declare function statSync(path: PathLike, options: {
    bigint: true;
}): BigIntStats;
/**
 * Synchronous `lstat`.
 * `lstat()` is identical to `stat()`, except that if path is a symbolic link,
 * then the link itself is stat-ed, not the file that it refers to.
 * @param path
 */
export declare function lstatSync(path: PathLike, options?: {
    bigint: false;
}): Stats;
export declare function lstatSync(path: PathLike, options: {
    bigint: true;
}): BigIntStats;
/**
 * Synchronous `truncate`.
 * @param path
 * @param len
 */
export declare function truncateSync(path: PathLike, len?: number): void;
/**
 * Synchronous `unlink`.
 * @param path
 */
export declare function unlinkSync(path: PathLike): void;
/**
 * Synchronous file open.
 * @see http://www.manpagez.com/man/2/open/
 * @param path
 * @param flags
 * @param mode defaults to `0644`
 * @returns file descriptor
 */
export declare function openSync(path: PathLike, flag: string, mode?: number | string): number;
/**
 * Synchronously reads the entire contents of a file.
 * @param filename
 * @param options
 * @option options encoding The string encoding for the file contents. Defaults to `null`.
 * @option options flag Defaults to `'r'`.
 * @returns file contents
 */
export declare function readFileSync(filename: string, options?: {
    flag?: string;
}): Uint8Array;
export declare function readFileSync(filename: string, options: {
    encoding: string;
    flag?: string;
}): string;
export declare function readFileSync(filename: string, encoding: string): string;
/**
 * Synchronously writes data to a file, replacing the file if it already
 * exists.
 *
 * The encoding option is ignored if data is a buffer.
 * @param filename
 * @param data
 * @param options
 * @option options encoding Defaults to `'utf8'`.
 * @option options mode Defaults to `0644`.
 * @option options flag Defaults to `'w'`.
 */
export declare function writeFileSync(filename: string, data: FileContents, options?: Node.WriteFileOptions): void;
export declare function writeFileSync(filename: string, data: FileContents, encoding?: string): void;
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
 * @option options encoding Defaults to `'utf8'`.
 * @option options mode Defaults to `0644`.
 * @option options flag Defaults to `'a'`.
 */
export declare function appendFileSync(filename: string, data: FileContents, options?: Node.WriteFileOptions): void;
export declare function appendFileSync(filename: string, data: FileContents, encoding?: string): void;
/**
 * Synchronous `fstat`.
 * `fstat()` is identical to `stat()`, except that the file to be stat-ed is
 * specified by the file descriptor `fd`.
 * @param fd
 */
export declare function fstatSync(fd: number, options?: {
    bigint?: false;
}): Stats;
export declare function fstatSync(fd: number, options: {
    bigint: true;
}): BigIntStats;
/**
 * Synchronous close.
 * @param fd
 */
export declare function closeSync(fd: number): void;
/**
 * Synchronous ftruncate.
 * @param fd
 * @param len
 */
export declare function ftruncateSync(fd: number, len?: number): void;
/**
 * Synchronous fsync.
 * @param fd
 */
export declare function fsyncSync(fd: number): void;
/**
 * Synchronous fdatasync.
 * @param fd
 */
export declare function fdatasyncSync(fd: number): void;
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
export declare function writeSync(fd: number, buffer: Uint8Array, offset: number, length: number, position?: number | null): number;
export declare function writeSync(fd: number, data: string, position?: number | null, encoding?: BufferEncoding): number;
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
export declare function readSync(fd: number, buffer: Uint8Array, opts?: ReadSyncOptions): number;
export declare function readSync(fd: number, buffer: Uint8Array, offset: number, length: number, position?: number): number;
/**
 * Synchronous `fchown`.
 * @param fd
 * @param uid
 * @param gid
 */
export declare function fchownSync(fd: number, uid: number, gid: number): void;
/**
 * Synchronous `fchmod`.
 * @param fd
 * @param mode
 */
export declare function fchmodSync(fd: number, mode: number | string): void;
/**
 * Change the file timestamps of a file referenced by the supplied file
 * descriptor.
 * @param fd
 * @param atime
 * @param mtime
 */
export declare function futimesSync(fd: number, atime: number | Date, mtime: number | Date): void;
/**
 * Synchronous `rmdir`.
 * @param path
 */
export declare function rmdirSync(path: PathLike): void;
/**
 * Synchronous `mkdir`.
 * @param path
 * @param mode defaults to o777
 * @todo Implement recursion
 */
export declare function mkdirSync(path: PathLike, options: Node.MakeDirectoryOptions & {
    recursive: true;
}): string;
export declare function mkdirSync(path: PathLike, options?: Node.Mode | (Node.MakeDirectoryOptions & {
    recursive?: false;
})): void;
/**
 * Synchronous `readdir`. Reads the contents of a directory.
 * @param path
 */
export declare function readdirSync(path: PathLike, options: {
    encoding?: BufferEncoding;
    withFileTypes?: false;
} | BufferEncoding): string[];
export declare function readdirSync(path: PathLike, options: {
    encoding: 'buffer';
    withFileTypes?: false;
} | 'buffer'): Uint8Array[];
export declare function readdirSync(path: PathLike, options: {
    withFileTypes: true;
}): Dirent[];
/**
 * Synchronous `link`.
 * @param srcpath
 * @param dstpath
 */
export declare function linkSync(srcpath: PathLike, dstpath: PathLike): void;
/**
 * Synchronous `symlink`.
 * @param srcpath
 * @param dstpath
 * @param type can be either `'dir'` or `'file'` (default is `'file'`)
 */
export declare function symlinkSync(srcpath: PathLike, dstpath: PathLike, type?: symlink.Type): void;
/**
 * Synchronous readlink.
 * @param path
 */
export declare function readlinkSync(path: PathLike, options?: BufferEncodingOption): Uint8Array;
export declare function readlinkSync(path: PathLike, options: BaseEncodingOptions | BufferEncoding): string;
/**
 * Synchronous `chown`.
 * @param path
 * @param uid
 * @param gid
 */
export declare function chownSync(path: PathLike, uid: number, gid: number): void;
/**
 * Synchronous `lchown`.
 * @param path
 * @param uid
 * @param gid
 */
export declare function lchownSync(path: PathLike, uid: number, gid: number): void;
/**
 * Synchronous `chmod`.
 * @param path
 * @param mode
 */
export declare function chmodSync(path: PathLike, mode: string | number): void;
/**
 * Synchronous `lchmod`.
 * @param path
 * @param mode
 */
export declare function lchmodSync(path: PathLike, mode: number | string): void;
/**
 * Change file timestamps of the file referenced by the supplied path.
 * @param path
 * @param atime
 * @param mtime
 */
export declare function utimesSync(path: PathLike, atime: number | Date, mtime: number | Date): void;
/**
 * Change file timestamps of the file referenced by the supplied path.
 * @param path
 * @param atime
 * @param mtime
 */
export declare function lutimesSync(path: PathLike, atime: number | Date, mtime: number | Date): void;
/**
 * Synchronous `realpath`.
 * @param path
 * @param cache An object literal of mapped paths that can be used to
 *   force a specific path resolution or avoid additional `fs.stat` calls for
 *   known real paths.
 * @returns the real path
 */
export declare function realpathSync(path: PathLike, options: BufferEncodingOption): Uint8Array;
export declare function realpathSync(path: PathLike, options?: BaseEncodingOptions | BufferEncoding): string;
/**
 * Synchronous `access`.
 * @param path
 * @param mode
 */
export declare function accessSync(path: PathLike, mode?: number): void;
export declare function rmSync(path: PathLike): void;
export declare function mkdtempSync(prefix: string, options: BufferEncodingOption): Uint8Array;
export declare function mkdtempSync(prefix: string, options?: BaseEncodingOptions | BufferEncoding): string;
export declare function copyFileSync(src: string, dest: string, flags?: number): void;
export declare function readvSync(fd: number, buffers: readonly Uint8Array[], position?: number): number;
export declare function writevSync(fd: number, buffers: readonly Uint8Array[], position?: number): number;
export declare function opendirSync(path: PathLike, options?: Node.OpenDirOptions): Dir;
