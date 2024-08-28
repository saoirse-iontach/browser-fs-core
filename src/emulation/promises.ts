import type { ReadStream, WriteStream, FSWatcher, symlink as _symlink, BaseEncodingOptions, BufferEncodingOption, BigIntOptions, StatOptions } from 'node:fs';
import { ApiError, ErrorCode } from '../ApiError.js';

import * as constants from './constants.js';
export { constants };

import { File, FileFlag } from '../file.js';
import { normalizePath, normalizeMode, getFdForFile, normalizeOptions, fd2file, fdMap, normalizeTime, cred, nop, resolveFS, fixError, mounts, PathLike } from './shared.js';
import { FileContents, FileSystem } from '../filesystem.js';
import { BigIntStats, Stats } from '../stats.js';
import { decode, encode } from '../utils.js';
import { Dirent } from './dir.js';
import { join } from './path.js';

type FileSystemMethod = {
	[K in keyof FileSystem]: FileSystem[K] extends (...args) => unknown
		? (name: K, resolveSymlinks: boolean, ...args: Parameters<FileSystem[K]>) => ReturnType<FileSystem[K]>
		: never;
}[keyof FileSystem]; // https://stackoverflow.com/a/76335220/17637456

/**
 * Utility for FS ops. It handles
 * - path normalization (for the first parameter to the FS op)
 * - path translation for errors
 * - FS/mount point resolution
 *
 * It can't be used for functions which may operate on multiple mounted FSs or paths (e.g. `rename`)
 * @param name the function name
 * @param resolveSymlinks whether to resolve symlinks
 * @param args the rest of the parameters are passed to the FS function. Note that the first parameter is required to be a path
 * @returns
 */
async function doOp<M extends FileSystemMethod, RT extends ReturnType<M> = ReturnType<M>>(...[name, resolveSymlinks, path, ...args]: Parameters<M>): Promise<RT> {
	path = normalizePath(path);
	const { fs, path: resolvedPath } = resolveFS(resolveSymlinks && (await exists(path)) ? await realpath(path) : path);
	try {
		// @ts-expect-error 2556 (since ...args is not correctly picked up as being a tuple)
		return fs[name](resolvedPath, ...args) as Promise<RT>;
	} catch (e) {
		throw fixError(e, { [resolvedPath]: path });
	}
}

// fs.promises

/**
 * Renames a file
 * @param oldPath
 * @param newPath
 */
export async function rename(oldPath: PathLike, newPath: PathLike): Promise<void> {
	oldPath = normalizePath(oldPath);
	newPath = normalizePath(newPath);
	const _old = resolveFS(oldPath);
	const _new = resolveFS(newPath);
	const paths = { [_old.path]: oldPath, [_new.path]: newPath };
	try {
		if (_old === _new) {
			return _old.fs.rename(_old.path, _new.path, cred);
		}

		const data = await readFile(oldPath);
		await writeFile(newPath, data);
		await unlink(oldPath);
	} catch (e) {
		throw fixError(e, paths);
	}
}

/**
 * Test whether or not the given path exists by checking with the file system.
 * @param path
 */
export async function exists(path: PathLike): Promise<boolean> {
	path = normalizePath(path);
	try {
		const { fs, path: resolvedPath } = resolveFS(path);
		return fs.exists(resolvedPath, cred);
	} catch (e) {
		if ((e as ApiError).errno == ErrorCode.ENOENT) {
			return false;
		}

		throw e;
	}
}

/**
 * `stat`.
 * @param path
 * @returns Stats
 */
export async function stat(path: PathLike, options: BigIntOptions): Promise<BigIntStats>;
export async function stat(path: PathLike, options?: { bigint?: false }): Promise<Stats>;
export async function stat(path: PathLike, options?: StatOptions): Promise<Stats | BigIntStats> {
	const stats: Stats = await doOp('stat', true, path, cred);
	return options?.bigint ? BigIntStats.clone(stats) : stats;
}

/**
 * `lstat`.
 * `lstat()` is identical to `stat()`, except that if path is a symbolic link,
 * then the link itself is stat-ed, not the file that it refers to.
 * @param path
 * @return [BrowserFS.node.fs.Stats]
 */
export async function lstat(path: PathLike, options?: { bigint?: false }): Promise<Stats>;
export async function lstat(path: PathLike, options: { bigint: true }): Promise<BigIntStats>;
export async function lstat(path: PathLike, options?: StatOptions): Promise<Stats | BigIntStats> {
	const stats: Stats = await doOp('stat', false, path, cred);
	return options?.bigint ? BigIntStats.clone(stats) : stats;
}

// FILE-ONLY METHODS

/**
 * `truncate`.
 * @param path
 * @param len
 */
export async function truncate(path: PathLike, len: number = 0): Promise<void> {
	if (len < 0) {
		throw new ApiError(ErrorCode.EINVAL);
	}
	return doOp('truncate', true, path, len, cred);
}

/**
 * `unlink`.
 * @param path
 */
export async function unlink(path: PathLike): Promise<void> {
	return doOp('unlink', false, path, cred);
}

/**
 * file open.
 * @see http://www.manpagez.com/man/2/open/
 * @param path
 * @param flags
 * @param mode defaults to `0644`
 */
export async function open(path: PathLike, flag: string, mode: number | string = 0o644): Promise<number> {
	const file: File = await doOp('open', true, path, FileFlag.getFileFlag(flag), normalizeMode(mode, 0o644), cred);
	return getFdForFile(file);
}

/**
 * Synchronously reads the entire contents of a file.
 * @param filename
 * @param options
 * options.encoding The string encoding for the file contents. Defaults to `null`.
 * options.flag Defaults to `'r'`.
 * @return Uint8Array
 */
export async function readFile(filename: PathLike, options?: { flag?: string }): Promise<Uint8Array>;
export async function readFile(filename: PathLike, options: { encoding: string; flag?: string }): Promise<string>;
export async function readFile(filename: PathLike, encoding: string): Promise<string>;
export async function readFile(filename: PathLike, arg2 = {}): Promise<Uint8Array | string> {
	const options = normalizeOptions(arg2, null, 'r', null);
	const flag = FileFlag.getFileFlag(options.flag);
	if (!flag.isReadable()) {
		throw new ApiError(ErrorCode.EINVAL, 'Flag passed to readFile must allow for reading.');
	}
	const data: Uint8Array = await doOp('readFile', true, filename, flag, cred);
	switch (options.encoding) {
		case 'utf8':
		case 'utf-8':
			return decode(data);
		default:
			return data;
	}
}

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
export async function writeFile(filename: PathLike, data: FileContents, options?: { encoding?: string; mode?: number | string; flag?: string }): Promise<void>;
export async function writeFile(filename: PathLike, data: FileContents, encoding?: string): Promise<void>;
export async function writeFile(filename: PathLike, data: FileContents, options?: { encoding?: string; mode?: number | string; flag?: string } | string): Promise<void>;
export async function writeFile(filename: PathLike, data: FileContents, arg3?: { encoding?: string; mode?: number | string; flag?: string } | string): Promise<void> {
	const options = normalizeOptions(arg3, 'utf8', 'w', 0o644);
	const flag = FileFlag.getFileFlag(options.flag);
	if (!flag.isWriteable()) {
		throw new ApiError(ErrorCode.EINVAL, 'Flag passed to writeFile must allow for writing.');
	}
	if (typeof data != 'string' && !options.encoding) {
		throw new ApiError(ErrorCode.EINVAL, 'Encoding not specified');
	}
	const encodedData = typeof data == 'string' ? encode(data) : data;
	return doOp('writeFile', true, filename, encodedData, flag, options.mode, cred);
}

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
export async function appendFile(filename: PathLike, data: FileContents, options?: { encoding?: string; mode?: number | string; flag?: string }): Promise<void>;
export async function appendFile(filename: PathLike, data: FileContents, encoding?: string): Promise<void>;
export async function appendFile(filename: PathLike, data: FileContents, arg3?): Promise<void> {
	const options = normalizeOptions(arg3, 'utf8', 'a', 0o644);
	const flag = FileFlag.getFileFlag(options.flag);
	if (!flag.isAppendable()) {
		throw new ApiError(ErrorCode.EINVAL, 'Flag passed to appendFile must allow for appending.');
	}
	if (typeof data != 'string' && !options.encoding) {
		throw new ApiError(ErrorCode.EINVAL, 'Encoding not specified');
	}
	const encodedData = typeof data == 'string' ? encode(data) : data;
	return doOp('appendFile', true, filename, encodedData, flag, options.mode, cred);
}

// FILE DESCRIPTOR METHODS

/**
 * `fstat`.
 * `fstat()` is identical to `stat()`, except that the file to be stat-ed is
 * specified by the file descriptor `fd`.
 * @param fd
 * @return [BrowserFS.node.fs.Stats]
 */
export async function fstat(fd: number, options?: { bigint?: false }): Promise<Stats>;
export async function fstat(fd: number, options: { bigint: true }): Promise<BigIntStats>;
export async function fstat(fd: number, options?: StatOptions): Promise<Stats | BigIntStats> {
	const stats: Stats = await fd2file(fd).stat();
	return options?.bigint ? BigIntStats.clone(stats) : stats;
}

/**
 * close.
 * @param fd
 */
export async function close(fd: number): Promise<void> {
	await fd2file(fd).close();
	fdMap.delete(fd);
	return;
}

/**
 * ftruncate.
 * @param fd
 * @param len
 */
export async function ftruncate(fd: number, len: number = 0): Promise<void> {
	const file = fd2file(fd);
	if (len < 0) {
		throw new ApiError(ErrorCode.EINVAL);
	}
	return file.truncate(len);
}

/**
 * fsync.
 * @param fd
 */
export async function fsync(fd: number): Promise<void> {
	return fd2file(fd).sync();
}

/**
 * fdatasync.
 * @param fd
 */
export async function fdatasync(fd: number): Promise<void> {
	return fd2file(fd).datasync();
}

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
export async function write(fd: number, buffer: Uint8Array, offset: number, length: number, position?: number): Promise<number>;
export async function write(fd: number, data: string, position?: number | null, encoding?: BufferEncoding): Promise<number>;
export async function write(fd: number, arg2: Uint8Array | string, arg3?: number, arg4?: BufferEncoding | number, arg5?: number): Promise<number> {
	let buffer: Uint8Array,
		offset: number = 0,
		length: number,
		position: number | null;
	if (typeof arg2 === 'string') {
		// Signature 1: (fd, string, [position?, [encoding?]])
		position = typeof arg3 === 'number' ? arg3 : null;
		const encoding = (typeof arg4 === 'string' ? arg4 : 'utf8') as BufferEncoding;
		offset = 0;
		buffer = encode(arg2, encoding);
		length = buffer.length;
	} else {
		// Signature 2: (fd, buffer, offset, length, position?)
		buffer = arg2;
		offset = arg3;
		length = arg4 as number;
		position = typeof arg5 === 'number' ? arg5 : null;
	}

	const file = fd2file(fd);
	if (position === undefined || position === null) {
		position = file.getPos()!;
	}
	return file.write(buffer, offset, length, position);
}

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
export async function read(fd: number, buffer: Uint8Array, offset: number, length: number, position?: number): Promise<{ bytesRead: number; buffer: Uint8Array }> {
	const file = fd2file(fd);
	if (isNaN(+position)) {
		position = file.getPos()!;
	}

	return file.read(buffer, offset, length, position);
}

/**
 * `fchown`.
 * @param fd
 * @param uid
 * @param gid
 */
export async function fchown(fd: number, uid: number, gid: number): Promise<void> {
	return fd2file(fd).chown(uid, gid);
}

/**
 * `fchmod`.
 * @param fd
 * @param mode
 */
export async function fchmod(fd: number, mode: number | string): Promise<void> {
	const numMode = typeof mode === 'string' ? parseInt(mode, 8) : mode;
	return fd2file(fd).chmod(numMode);
}

/**
 * Change the file timestamps of a file referenced by the supplied file
 * descriptor.
 * @param fd
 * @param atime
 * @param mtime
 */
export async function futimes(fd: number, atime: number | Date, mtime: number | Date): Promise<void> {
	return fd2file(fd).utimes(normalizeTime(atime), normalizeTime(mtime));
}

// DIRECTORY-ONLY METHODS

/**
 * `rmdir`.
 * @param path
 */
export async function rmdir(path: PathLike): Promise<void> {
	return doOp('rmdir', true, path, cred);
}

/**
 * `mkdir`.
 * @param path
 * @param mode defaults to `0777`
 */
export async function mkdir(path: PathLike, mode?: number | string): Promise<void> {
	return doOp('mkdir', true, path, normalizeMode(mode, 0o777), cred);
}

/**
 * `readdir`. Reads the contents of a directory.
 * @param path
 */
export async function readdir(path: PathLike, options: { withFileTypes?: false }): Promise<string[]>;
export async function readdir(path: PathLike, options: { withFileTypes: true }): Promise<Dirent[]>;
export async function readdir(path: PathLike, options?: { withFileTypes?: boolean }): Promise<string[] | Dirent[]> {
	path = normalizePath(path);
	const entries: string[] = await doOp('readdir', true, path, cred);
	const points = [...mounts.keys()];
	for (const point of points) {
		if (point.startsWith(path)) {
			const entry = point.slice(path.length);
			if (entry.includes('/') || entry.length == 0) {
				// ignore FSs mounted in subdirectories and any FS mounted to `path`.
				continue;
			}
			entries.push(entry);
		}
	}
	const values: (string | Dirent)[] = [];
	for (const entry of entries) {
		values.push(options?.withFileTypes ? new Dirent(entry, await stat(join(path, entry))) : entry);
	}
	return values as string[] | Dirent[];
}

// SYMLINK METHODS

/**
 * `link`.
 * @param srcpath
 * @param dstpath
 */
export async function link(srcpath: PathLike, dstpath: PathLike): Promise<void> {
	dstpath = normalizePath(dstpath);
	return doOp('link', false, srcpath, dstpath, cred);
}

/**
 * `symlink`.
 * @param srcpath
 * @param dstpath
 * @param type can be either `'dir'` or `'file'` (default is `'file'`)
 */
export async function symlink(srcpath: PathLike, dstpath: PathLike, type: _symlink.Type = 'file'): Promise<void> {
	if (!['file', 'dir', 'junction'].includes(type)) {
		throw new ApiError(ErrorCode.EINVAL, 'Invalid type: ' + type);
	}
	dstpath = normalizePath(dstpath);
	return doOp('symlink', false, srcpath, dstpath, type, cred);
}

/**
 * readlink.
 * @param path
 */
export async function readlink(path: PathLike, options?: BaseEncodingOptions | BufferEncoding): Promise<string>;
export async function readlink(path: PathLike, options: BufferEncodingOption): Promise<Uint8Array>;
export async function readlink(path: PathLike, options?: BaseEncodingOptions | string): Promise<string | Uint8Array>;
export async function readlink(path: PathLike, options?: BufferEncodingOption | BaseEncodingOptions | string): Promise<string | Uint8Array> {
	const encoding = typeof options == 'object' ? options.encoding : options;
	const value: string = await doOp('readlink', false, path, cred);
	if (encoding === 'buffer') {
		return encode(value);
	} else {
		return value;
	}
}

// PROPERTY OPERATIONS

/**
 * `chown`.
 * @param path
 * @param uid
 * @param gid
 */
export async function chown(path: PathLike, uid: number, gid: number): Promise<void> {
	return doOp('chown', true, path, uid, gid, cred);
}

/**
 * `lchown`.
 * @param path
 * @param uid
 * @param gid
 */
export async function lchown(path: PathLike, uid: number, gid: number): Promise<void> {
	return doOp('chown', false, path, uid, gid, cred);
}

/**
 * `chmod`.
 * @param path
 * @param mode
 */
export async function chmod(path: PathLike, mode: string | number): Promise<void> {
	const numMode = normalizeMode(mode, -1);
	if (numMode < 0) {
		throw new ApiError(ErrorCode.EINVAL, `Invalid mode.`);
	}
	return doOp('chmod', true, path, numMode, cred);
}

/**
 * `lchmod`.
 * @param path
 * @param mode
 */
export async function lchmod(path: PathLike, mode: number | string): Promise<void> {
	const numMode = normalizeMode(mode, -1);
	if (numMode < 1) {
		throw new ApiError(ErrorCode.EINVAL, `Invalid mode.`);
	}
	return doOp('chmod', false, normalizePath(path), numMode, cred);
}

/**
 * Change file timestamps of the file referenced by the supplied path.
 * @param path
 * @param atime
 * @param mtime
 */
export async function utimes(path: PathLike, atime: number | Date, mtime: number | Date): Promise<void> {
	return doOp('utimes', true, path, normalizeTime(atime), normalizeTime(mtime), cred);
}

/**
 * Change file timestamps of the file referenced by the supplied path.
 * @param path
 * @param atime
 * @param mtime
 */
export async function lutimes(path: PathLike, atime: number | Date, mtime: number | Date): Promise<void> {
	return doOp('utimes', false, path, normalizeTime(atime), normalizeTime(mtime), cred);
}

/**
 * `realpath`.
 * @param path
 * @param options
 * @return resolved path
 *
 * Note: This *Can not* use doOp since doOp depends on it
 */
export async function realpath(path: PathLike, options?: BaseEncodingOptions): Promise<string> {
	path = normalizePath(path);
	const { fs, path: resolvedPath, mountPoint } = resolveFS(path);
	try {
		const stats = await fs.stat(resolvedPath, cred);
		if (!stats.isSymbolicLink()) {
			return path;
		}
		const dst = mountPoint + normalizePath(await fs.readlink(resolvedPath, cred));
		return realpath(dst);
	} catch (e) {
		throw fixError(e, { [resolvedPath]: path });
	}
}

export async function watchFile(filename: PathLike, listener: (curr: Stats, prev: Stats) => void): Promise<void>;
export async function watchFile(filename: PathLike, options: { persistent?: boolean; interval?: number }, listener: (curr: Stats, prev: Stats) => void): Promise<void>;
export async function watchFile(filename: PathLike, arg2: any, listener: (curr: Stats, prev: Stats) => void = nop): Promise<void> {
	throw new ApiError(ErrorCode.ENOTSUP);
}

export async function unwatchFile(filename: PathLike, listener: (curr: Stats, prev: Stats) => void = nop): Promise<void> {
	throw new ApiError(ErrorCode.ENOTSUP);
}

export async function watch(filename: PathLike, listener?: (event: string, filename: PathLike) => any): Promise<FSWatcher>;
export async function watch(filename: PathLike, options: { persistent?: boolean }, listener?: (event: string, filename: string) => any): Promise<FSWatcher>;
export async function watch(filename: PathLike, arg2: any, listener: (event: string, filename: string) => any = nop): Promise<FSWatcher> {
	throw new ApiError(ErrorCode.ENOTSUP);
}

/**
 * `access`.
 * @param path
 * @param mode
 */
export async function access(path: PathLike, mode: number = 0o600): Promise<void> {
	return doOp('access', true, path, mode, cred);
}

export async function createReadStream(
	path: PathLike,
	options?: {
		flags?: string;
		encoding?: string;
		fd?: number;
		mode?: number;
		autoClose?: boolean;
	}
): Promise<ReadStream> {
	throw new ApiError(ErrorCode.ENOTSUP);
}

export async function createWriteStream(
	path: PathLike,
	options?: {
		flags?: string;
		encoding?: string;
		fd?: number;
		mode?: number;
	}
): Promise<WriteStream> {
	throw new ApiError(ErrorCode.ENOTSUP);
}

export async function rm(path: PathLike) {
	throw new ApiError(ErrorCode.ENOTSUP);
}

export async function mkdtemp(path: PathLike) {
	throw new ApiError(ErrorCode.ENOTSUP);
}

export async function copyFile(path: PathLike) {
	throw new ApiError(ErrorCode.ENOTSUP);
}
