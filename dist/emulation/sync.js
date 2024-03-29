import { ApiError, ErrorCode } from '../ApiError.js';
import { FileFlag } from '../file.js';
import { BigIntStats } from '../stats.js';
import { normalizePath, cred, getFdForFile, normalizeMode, normalizeOptions, fdMap, fd2file, normalizeTime, resolveFS, fixError, mounts, } from './shared.js';
import { decode, encode } from '../utils.js';
import { Dirent } from './dir.js';
import { join } from './path.js';
function doOp(...[name, resolveSymlinks, path, ...args]) {
    path = normalizePath(path);
    const { fs, path: resolvedPath } = resolveFS(resolveSymlinks && existsSync(path) ? realpathSync(path) : path);
    try {
        // @ts-expect-error 2556 (since ...args is not correctly picked up as being a tuple)
        return fs[name](resolvedPath, ...args);
    }
    catch (e) {
        throw fixError(e, { [resolvedPath]: path });
    }
}
/**
 * Synchronous rename.
 * @param oldPath
 * @param newPath
 */
export function renameSync(oldPath, newPath) {
    oldPath = normalizePath(oldPath);
    newPath = normalizePath(newPath);
    const _old = resolveFS(oldPath);
    const _new = resolveFS(newPath);
    const paths = { [_old.path]: oldPath, [_new.path]: newPath };
    try {
        if (_old === _new) {
            return _old.fs.renameSync(_old.path, _new.path, cred);
        }
        const data = readFileSync(oldPath);
        writeFileSync(newPath, data);
        unlinkSync(oldPath);
    }
    catch (e) {
        throw fixError(e, paths);
    }
}
renameSync;
/**
 * Test whether or not the given path exists by checking with the file system.
 * @param path
 */
export function existsSync(path) {
    path = normalizePath(path);
    try {
        const { fs, path: resolvedPath } = resolveFS(path);
        return fs.existsSync(resolvedPath, cred);
    }
    catch (e) {
        if (e.errno == ErrorCode.ENOENT) {
            return false;
        }
        throw e;
    }
}
existsSync;
export function statSync(path, options) {
    const stats = doOp('statSync', true, path, cred);
    return options?.bigint ? BigIntStats.clone(stats) : stats;
}
statSync;
export function lstatSync(path, options) {
    const stats = doOp('statSync', false, path, cred);
    return options?.bigint ? BigIntStats.clone(stats) : stats;
}
lstatSync;
/**
 * Synchronous `truncate`.
 * @param path
 * @param len
 */
export function truncateSync(path, len = 0) {
    if (len < 0) {
        throw new ApiError(ErrorCode.EINVAL);
    }
    return doOp('truncateSync', true, path, len, cred);
}
truncateSync;
/**
 * Synchronous `unlink`.
 * @param path
 */
export function unlinkSync(path) {
    return doOp('unlinkSync', false, path, cred);
}
unlinkSync;
/**
 * Synchronous file open.
 * @see http://www.manpagez.com/man/2/open/
 * @param path
 * @param flags
 * @param mode defaults to `0644`
 * @returns file descriptor
 */
export function openSync(path, flag, mode = 0o644) {
    const file = doOp('openSync', true, path, FileFlag.getFileFlag(flag), normalizeMode(mode, 0o644), cred);
    return getFdForFile(file);
}
openSync;
export function readFileSync(filename, arg2 = {}) {
    const options = normalizeOptions(arg2, null, 'r', null);
    const flag = FileFlag.getFileFlag(options.flag);
    if (!flag.isReadable()) {
        throw new ApiError(ErrorCode.EINVAL, 'Flag passed to readFile must allow for reading.');
    }
    const data = doOp('readFileSync', true, filename, flag, cred);
    switch (options.encoding) {
        case 'utf8':
        case 'utf-8':
            return decode(data);
        default:
            return data;
    }
}
readFileSync;
export function writeFileSync(filename, data, arg3) {
    const options = normalizeOptions(arg3, 'utf8', 'w', 0o644);
    const flag = FileFlag.getFileFlag(options.flag);
    if (!flag.isWriteable()) {
        throw new ApiError(ErrorCode.EINVAL, 'Flag passed to writeFile must allow for writing.');
    }
    if (typeof data != 'string' && !options.encoding) {
        throw new ApiError(ErrorCode.EINVAL, 'Encoding not specified');
    }
    const encodedData = typeof data == 'string' ? encode(data) : data;
    return doOp('writeFileSync', true, filename, encodedData, flag, options.mode, cred);
}
writeFileSync;
export function appendFileSync(filename, data, arg3) {
    const options = normalizeOptions(arg3, 'utf8', 'a', 0o644);
    const flag = FileFlag.getFileFlag(options.flag);
    if (!flag.isAppendable()) {
        throw new ApiError(ErrorCode.EINVAL, 'Flag passed to appendFile must allow for appending.');
    }
    if (typeof data != 'string' && !options.encoding) {
        throw new ApiError(ErrorCode.EINVAL, 'Encoding not specified');
    }
    const encodedData = typeof data == 'string' ? encode(data) : data;
    return doOp('appendFileSync', true, filename, encodedData, flag, options.mode, cred);
}
appendFileSync;
export function fstatSync(fd, options) {
    const stats = fd2file(fd).statSync();
    return options?.bigint ? BigIntStats.clone(stats) : stats;
}
fstatSync;
/**
 * Synchronous close.
 * @param fd
 */
export function closeSync(fd) {
    fd2file(fd).closeSync();
    fdMap.delete(fd);
}
closeSync;
/**
 * Synchronous ftruncate.
 * @param fd
 * @param len
 */
export function ftruncateSync(fd, len = 0) {
    const file = fd2file(fd);
    if (len < 0) {
        throw new ApiError(ErrorCode.EINVAL);
    }
    file.truncateSync(len);
}
ftruncateSync;
/**
 * Synchronous fsync.
 * @param fd
 */
export function fsyncSync(fd) {
    fd2file(fd).syncSync();
}
fsyncSync;
/**
 * Synchronous fdatasync.
 * @param fd
 */
export function fdatasyncSync(fd) {
    fd2file(fd).datasyncSync();
}
fdatasyncSync;
export function writeSync(fd, arg2, arg3, arg4, arg5) {
    let buffer, offset = 0, length, position;
    if (typeof arg2 === 'string') {
        // Signature 1: (fd, string, [position?, [encoding?]])
        position = typeof arg3 === 'number' ? arg3 : null;
        const encoding = (typeof arg4 === 'string' ? arg4 : 'utf8');
        offset = 0;
        buffer = encode(arg2);
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
    return file.writeSync(buffer, offset, length, position);
}
writeSync;
export function readSync(fd, buffer, opts, length, position) {
    const file = fd2file(fd);
    let offset = opts;
    if (typeof opts == 'object') {
        ({ offset, length, position } = opts);
    }
    if (isNaN(+position)) {
        position = file.getPos();
    }
    return file.readSync(buffer, offset, length, position);
}
readSync;
/**
 * Synchronous `fchown`.
 * @param fd
 * @param uid
 * @param gid
 */
export function fchownSync(fd, uid, gid) {
    fd2file(fd).chownSync(uid, gid);
}
fchownSync;
/**
 * Synchronous `fchmod`.
 * @param fd
 * @param mode
 */
export function fchmodSync(fd, mode) {
    const numMode = typeof mode === 'string' ? parseInt(mode, 8) : mode;
    fd2file(fd).chmodSync(numMode);
}
fchmodSync;
/**
 * Change the file timestamps of a file referenced by the supplied file
 * descriptor.
 * @param fd
 * @param atime
 * @param mtime
 */
export function futimesSync(fd, atime, mtime) {
    fd2file(fd).utimesSync(normalizeTime(atime), normalizeTime(mtime));
}
futimesSync;
// DIRECTORY-ONLY METHODS
/**
 * Synchronous `rmdir`.
 * @param path
 */
export function rmdirSync(path) {
    return doOp('rmdirSync', true, path, cred);
}
rmdirSync;
export function mkdirSync(path, options) {
    const mode = typeof options == 'number' || typeof options == 'string' ? options : options?.mode;
    const recursive = typeof options == 'object' && options?.recursive;
    doOp('mkdirSync', true, path, normalizeMode(mode, 0o777), cred);
}
mkdirSync;
export function readdirSync(path, options) {
    path = normalizePath(path);
    const entries = doOp('readdirSync', true, path, cred);
    for (const mount of mounts.keys()) {
        if (!mount.startsWith(path)) {
            continue;
        }
        const entry = mount.slice(path.length);
        if (entry.includes('/') || entry.length == 0) {
            // ignore FSs mounted in subdirectories and any FS mounted to `path`.
            continue;
        }
        entries.push(entry);
    }
    return entries.map((entry) => {
        if (typeof options == 'object' && options?.withFileTypes) {
            return new Dirent(entry, statSync(join(path, entry)));
        }
        if (options == 'buffer' || (typeof options == 'object' && options.encoding == 'buffer')) {
            return encode(entry);
        }
        return entry;
    });
}
readdirSync;
// SYMLINK METHODS
/**
 * Synchronous `link`.
 * @param srcpath
 * @param dstpath
 */
export function linkSync(srcpath, dstpath) {
    dstpath = normalizePath(dstpath);
    return doOp('linkSync', false, srcpath, dstpath, cred);
}
linkSync;
/**
 * Synchronous `symlink`.
 * @param srcpath
 * @param dstpath
 * @param type can be either `'dir'` or `'file'` (default is `'file'`)
 */
export function symlinkSync(srcpath, dstpath, type) {
    if (!['file', 'dir', 'junction'].includes(type)) {
        throw new ApiError(ErrorCode.EINVAL, 'Invalid type: ' + type);
    }
    dstpath = normalizePath(dstpath);
    return doOp('symlinkSync', false, srcpath, dstpath, type, cred);
}
symlinkSync;
export function readlinkSync(path, options) {
    const value = doOp('readlinkSync', false, path, cred);
    return encode(value, typeof options == 'object' ? options.encoding : options);
}
readlinkSync;
// PROPERTY OPERATIONS
/**
 * Synchronous `chown`.
 * @param path
 * @param uid
 * @param gid
 */
export function chownSync(path, uid, gid) {
    doOp('chownSync', true, path, uid, gid, cred);
}
chownSync;
/**
 * Synchronous `lchown`.
 * @param path
 * @param uid
 * @param gid
 */
export function lchownSync(path, uid, gid) {
    doOp('chownSync', false, path, uid, gid, cred);
}
lchownSync;
/**
 * Synchronous `chmod`.
 * @param path
 * @param mode
 */
export function chmodSync(path, mode) {
    const numMode = normalizeMode(mode, -1);
    if (numMode < 0) {
        throw new ApiError(ErrorCode.EINVAL, `Invalid mode.`);
    }
    doOp('chmodSync', true, path, numMode, cred);
}
chmodSync;
/**
 * Synchronous `lchmod`.
 * @param path
 * @param mode
 */
export function lchmodSync(path, mode) {
    const numMode = normalizeMode(mode, -1);
    if (numMode < 1) {
        throw new ApiError(ErrorCode.EINVAL, `Invalid mode.`);
    }
    doOp('chmodSync', false, path, numMode, cred);
}
lchmodSync;
/**
 * Change file timestamps of the file referenced by the supplied path.
 * @param path
 * @param atime
 * @param mtime
 */
export function utimesSync(path, atime, mtime) {
    doOp('utimesSync', true, path, normalizeTime(atime), normalizeTime(mtime), cred);
}
utimesSync;
/**
 * Change file timestamps of the file referenced by the supplied path.
 * @param path
 * @param atime
 * @param mtime
 */
export function lutimesSync(path, atime, mtime) {
    doOp('utimesSync', false, path, normalizeTime(atime), normalizeTime(mtime), cred);
}
lutimesSync;
export function realpathSync(path, options) {
    path = normalizePath(path);
    const { fs, path: resolvedPath, mountPoint } = resolveFS(path);
    try {
        const stats = fs.statSync(resolvedPath, cred);
        if (!stats.isSymbolicLink()) {
            return path;
        }
        const dst = normalizePath(mountPoint + fs.readlinkSync(resolvedPath, cred));
        return realpathSync(dst);
    }
    catch (e) {
        throw fixError(e, { [resolvedPath]: path });
    }
}
realpathSync;
/**
 * Synchronous `access`.
 * @param path
 * @param mode
 */
export function accessSync(path, mode = 0o600) {
    return doOp('accessSync', true, path, mode, cred);
}
accessSync;
export function rmSync(path) {
    throw new ApiError(ErrorCode.ENOTSUP);
}
rmSync;
export function mkdtempSync(prefix, options) {
    throw new ApiError(ErrorCode.ENOTSUP);
}
mkdtempSync;
export function copyFileSync(src, dest, flags) {
    throw new ApiError(ErrorCode.ENOTSUP);
}
copyFileSync;
export function readvSync(fd, buffers, position) {
    throw new ApiError(ErrorCode.ENOTSUP);
}
readvSync;
export function writevSync(fd, buffers, position) {
    throw new ApiError(ErrorCode.ENOTSUP);
}
writevSync;
export function opendirSync(path, options) {
    throw new ApiError(ErrorCode.ENOTSUP);
}
opendirSync;
