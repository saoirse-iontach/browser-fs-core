import { ApiError, ErrorCode } from '../ApiError.js';
import * as constants from './constants.js';
export { constants };
import { FileFlag } from '../file.js';
import { normalizePath, normalizeMode, getFdForFile, normalizeOptions, fd2file, fdMap, normalizeTime, cred, nop, resolveFS, fixError, mounts } from './shared.js';
import { BigIntStats } from '../stats.js';
import { decode, encode } from '../utils.js';
import { Dirent } from './dir.js';
import { join } from './path.js';
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
async function doOp(...[name, resolveSymlinks, path, ...args]) {
    path = normalizePath(path);
    const { fs, path: resolvedPath } = resolveFS(resolveSymlinks && (await exists(path)) ? await realpath(path) : path);
    try {
        // @ts-expect-error 2556 (since ...args is not correctly picked up as being a tuple)
        return fs[name](resolvedPath, ...args);
    }
    catch (e) {
        throw fixError(e, { [resolvedPath]: path });
    }
}
// fs.promises
/**
 * Renames a file
 * @param oldPath
 * @param newPath
 */
export async function rename(oldPath, newPath) {
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
    }
    catch (e) {
        throw fixError(e, paths);
    }
}
/**
 * Test whether or not the given path exists by checking with the file system.
 * @param path
 */
export async function exists(path) {
    path = normalizePath(path);
    try {
        const { fs, path: resolvedPath } = resolveFS(path);
        return fs.exists(resolvedPath, cred);
    }
    catch (e) {
        if (e.errno == ErrorCode.ENOENT) {
            return false;
        }
        throw e;
    }
}
export async function stat(path, options) {
    const stats = await doOp('stat', true, path, cred);
    return options?.bigint ? BigIntStats.clone(stats) : stats;
}
export async function lstat(path, options) {
    const stats = await doOp('stat', false, path, cred);
    return options?.bigint ? BigIntStats.clone(stats) : stats;
}
// FILE-ONLY METHODS
/**
 * `truncate`.
 * @param path
 * @param len
 */
export async function truncate(path, len = 0) {
    if (len < 0) {
        throw new ApiError(ErrorCode.EINVAL);
    }
    return doOp('truncate', true, path, len, cred);
}
/**
 * `unlink`.
 * @param path
 */
export async function unlink(path) {
    return doOp('unlink', false, path, cred);
}
/**
 * file open.
 * @see http://www.manpagez.com/man/2/open/
 * @param path
 * @param flags
 * @param mode defaults to `0644`
 */
export async function open(path, flag, mode = 0o644) {
    const file = await doOp('open', true, path, FileFlag.getFileFlag(flag), normalizeMode(mode, 0o644), cred);
    return getFdForFile(file);
}
export async function readFile(filename, arg2 = {}) {
    const options = normalizeOptions(arg2, null, 'r', null);
    const flag = FileFlag.getFileFlag(options.flag);
    if (!flag.isReadable()) {
        throw new ApiError(ErrorCode.EINVAL, 'Flag passed to readFile must allow for reading.');
    }
    const data = await doOp('readFile', true, filename, flag, cred);
    switch (options.encoding) {
        case 'utf8':
        case 'utf-8':
            return decode(data);
        default:
            return data;
    }
}
export async function writeFile(filename, data, arg3) {
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
export async function appendFile(filename, data, arg3) {
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
export async function fstat(fd, options) {
    const stats = await fd2file(fd).stat();
    return options?.bigint ? BigIntStats.clone(stats) : stats;
}
/**
 * close.
 * @param fd
 */
export async function close(fd) {
    await fd2file(fd).close();
    fdMap.delete(fd);
    return;
}
/**
 * ftruncate.
 * @param fd
 * @param len
 */
export async function ftruncate(fd, len = 0) {
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
export async function fsync(fd) {
    return fd2file(fd).sync();
}
/**
 * fdatasync.
 * @param fd
 */
export async function fdatasync(fd) {
    return fd2file(fd).datasync();
}
export async function write(fd, arg2, arg3, arg4, arg5) {
    let buffer, offset = 0, length, position;
    if (typeof arg2 === 'string') {
        // Signature 1: (fd, string, [position?, [encoding?]])
        position = typeof arg3 === 'number' ? arg3 : null;
        const encoding = (typeof arg4 === 'string' ? arg4 : 'utf8');
        offset = 0;
        buffer = encode(arg2, encoding);
        length = buffer.length;
    }
    else {
        // Signature 2: (fd, buffer, offset, length, position?)
        buffer = arg2;
        offset = arg3;
        length = arg4;
        position = typeof arg5 === 'number' ? arg5 : null;
    }
    const file = fd2file(fd);
    if (position === undefined || position === null) {
        position = file.getPos();
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
export async function read(fd, buffer, offset, length, position) {
    const file = fd2file(fd);
    if (isNaN(+position)) {
        position = file.getPos();
    }
    return file.read(buffer, offset, length, position);
}
/**
 * `fchown`.
 * @param fd
 * @param uid
 * @param gid
 */
export async function fchown(fd, uid, gid) {
    return fd2file(fd).chown(uid, gid);
}
/**
 * `fchmod`.
 * @param fd
 * @param mode
 */
export async function fchmod(fd, mode) {
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
export async function futimes(fd, atime, mtime) {
    return fd2file(fd).utimes(normalizeTime(atime), normalizeTime(mtime));
}
// DIRECTORY-ONLY METHODS
/**
 * `rmdir`.
 * @param path
 */
export async function rmdir(path) {
    return doOp('rmdir', true, path, cred);
}
/**
 * `mkdir`.
 * @param path
 * @param mode defaults to `0777`
 */
export async function mkdir(path, mode) {
    return doOp('mkdir', true, path, normalizeMode(mode, 0o777), cred);
}
export async function readdir(path, options) {
    path = normalizePath(path);
    const entries = await doOp('readdir', true, path, cred);
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
    const values = [];
    for (const entry of entries) {
        values.push(options?.withFileTypes ? new Dirent(entry, await stat(join(path, entry))) : entry);
    }
    return values;
}
// SYMLINK METHODS
/**
 * `link`.
 * @param srcpath
 * @param dstpath
 */
export async function link(srcpath, dstpath) {
    dstpath = normalizePath(dstpath);
    return doOp('link', false, srcpath, dstpath, cred);
}
/**
 * `symlink`.
 * @param srcpath
 * @param dstpath
 * @param type can be either `'dir'` or `'file'` (default is `'file'`)
 */
export async function symlink(srcpath, dstpath, type = 'file') {
    if (!['file', 'dir', 'junction'].includes(type)) {
        throw new ApiError(ErrorCode.EINVAL, 'Invalid type: ' + type);
    }
    dstpath = normalizePath(dstpath);
    return doOp('symlink', false, srcpath, dstpath, type, cred);
}
export async function readlink(path, options) {
    const encoding = typeof options == 'object' ? options.encoding : options;
    const value = await doOp('readlink', false, path, cred);
    if (encoding === 'buffer') {
        return encode(value);
    }
    else {
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
export async function chown(path, uid, gid) {
    return doOp('chown', true, path, uid, gid, cred);
}
/**
 * `lchown`.
 * @param path
 * @param uid
 * @param gid
 */
export async function lchown(path, uid, gid) {
    return doOp('chown', false, path, uid, gid, cred);
}
/**
 * `chmod`.
 * @param path
 * @param mode
 */
export async function chmod(path, mode) {
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
export async function lchmod(path, mode) {
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
export async function utimes(path, atime, mtime) {
    return doOp('utimes', true, path, normalizeTime(atime), normalizeTime(mtime), cred);
}
/**
 * Change file timestamps of the file referenced by the supplied path.
 * @param path
 * @param atime
 * @param mtime
 */
export async function lutimes(path, atime, mtime) {
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
export async function realpath(path, options) {
    path = normalizePath(path);
    const { fs, path: resolvedPath, mountPoint } = resolveFS(path);
    try {
        const stats = await fs.stat(resolvedPath, cred);
        if (!stats.isSymbolicLink()) {
            return path;
        }
        const dst = mountPoint + normalizePath(await fs.readlink(resolvedPath, cred));
        return realpath(dst);
    }
    catch (e) {
        throw fixError(e, { [resolvedPath]: path });
    }
}
export async function watchFile(filename, arg2, listener = nop) {
    throw new ApiError(ErrorCode.ENOTSUP);
}
export async function unwatchFile(filename, listener = nop) {
    throw new ApiError(ErrorCode.ENOTSUP);
}
export async function watch(filename, arg2, listener = nop) {
    throw new ApiError(ErrorCode.ENOTSUP);
}
/**
 * `access`.
 * @param path
 * @param mode
 */
export async function access(path, mode = 0o600) {
    return doOp('access', true, path, mode, cred);
}
export async function createReadStream(path, options) {
    throw new ApiError(ErrorCode.ENOTSUP);
}
export async function createWriteStream(path, options) {
    throw new ApiError(ErrorCode.ENOTSUP);
}
export async function rm(path) {
    throw new ApiError(ErrorCode.ENOTSUP);
}
export async function mkdtemp(path) {
    throw new ApiError(ErrorCode.ENOTSUP);
}
export async function copyFile(path) {
    throw new ApiError(ErrorCode.ENOTSUP);
}
