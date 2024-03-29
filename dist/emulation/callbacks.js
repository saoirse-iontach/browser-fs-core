import { ApiError, ErrorCode } from '../ApiError.js';
import { nop, normalizeMode } from './shared.js';
import * as promises from './promises.js';
import { R_OK } from './constants.js';
import { decode, encode } from '../utils.js';
/**
 * Asynchronous rename. No arguments other than a possible exception are given
 * to the completion callback.
 * @param oldPath
 * @param newPath
 * @param callback
 */
export function rename(oldPath, newPath, cb = nop) {
    promises
        .rename(oldPath, newPath)
        .then(() => cb())
        .catch(cb);
}
/**
 * Test whether or not the given path exists by checking with the file system.
 * Then call the callback argument with either true or false.
 * @example Sample invocation
 *   fs.exists('/etc/passwd', function (exists) {
 *     util.debug(exists ? "it's there" : "no passwd!");
 *   });
 * @param path
 * @param callback
 */
export function exists(path, cb = nop) {
    promises
        .exists(path)
        .then(cb)
        .catch(() => cb(false));
}
export function stat(path, options, callback = nop) {
    callback = typeof options == 'function' ? options : callback;
    promises
        .stat(path, typeof options != 'function' ? options : {})
        .then(stats => callback(null, stats))
        .catch(callback);
}
export function lstat(path, options, callback = nop) {
    callback = typeof options == 'function' ? options : callback;
    promises
        .lstat(path, typeof options != 'function' ? options : {})
        .then(stats => callback(null, stats))
        .catch(callback);
}
export function truncate(path, arg2 = 0, cb = nop) {
    cb = typeof arg2 === 'function' ? arg2 : cb;
    const len = typeof arg2 === 'number' ? arg2 : 0;
    promises
        .truncate(path, len)
        .then(() => cb())
        .catch(cb);
}
/**
 * Asynchronous `unlink`.
 * @param path
 * @param callback
 */
export function unlink(path, cb = nop) {
    promises
        .unlink(path)
        .then(() => cb())
        .catch(cb);
}
export function open(path, flag, arg2, cb = nop) {
    const mode = normalizeMode(arg2, 0o644);
    cb = typeof arg2 === 'function' ? arg2 : cb;
    promises
        .open(path, flag, mode)
        .then(fd => cb(null, fd))
        .catch(cb);
}
export function readFile(filename, arg2 = {}, cb = nop) {
    cb = typeof arg2 === 'function' ? arg2 : cb;
    promises.readFile(filename, typeof arg2 === 'function' ? null : arg2);
}
export function writeFile(filename, data, arg3 = {}, cb = nop) {
    cb = typeof arg3 === 'function' ? arg3 : cb;
    promises.writeFile(filename, data, typeof arg3 === 'function' ? undefined : arg3);
}
export function appendFile(filename, data, arg3, cb = nop) {
    cb = typeof arg3 === 'function' ? arg3 : cb;
    promises.appendFile(filename, data, typeof arg3 === 'function' ? null : arg3);
}
export function fstat(fd, options, cb = nop) {
    cb = typeof options == 'function' ? options : cb;
    promises
        .fstat(fd, typeof options != 'function' ? options : {})
        .then(stats => cb(null, stats))
        .catch(cb);
}
/**
 * Asynchronous close.
 * @param fd
 * @param callback
 */
export function close(fd, cb = nop) {
    promises
        .close(fd)
        .then(() => cb())
        .catch(cb);
}
export function ftruncate(fd, arg2, cb = nop) {
    const length = typeof arg2 === 'number' ? arg2 : 0;
    cb = typeof arg2 === 'function' ? arg2 : cb;
    promises.ftruncate(fd, length);
}
/**
 * Asynchronous fsync.
 * @param fd
 * @param callback
 */
export function fsync(fd, cb = nop) {
    promises
        .fsync(fd)
        .then(() => cb())
        .catch(cb);
}
/**
 * Asynchronous fdatasync.
 * @param fd
 * @param callback
 */
export function fdatasync(fd, cb = nop) {
    promises
        .fdatasync(fd)
        .then(() => cb())
        .catch(cb);
}
export function write(fd, arg2, arg3, arg4, arg5, cb = nop) {
    let buffer, offset, length, position = null, encoding;
    if (typeof arg2 === 'string') {
        // Signature 1: (fd, string, [position?, [encoding?]], cb?)
        encoding = 'utf8';
        switch (typeof arg3) {
            case 'function':
                // (fd, string, cb)
                cb = arg3;
                break;
            case 'number':
                // (fd, string, position, encoding?, cb?)
                position = arg3;
                encoding = (typeof arg4 === 'string' ? arg4 : 'utf8');
                cb = typeof arg5 === 'function' ? arg5 : cb;
                break;
            default:
                // ...try to find the callback and get out of here!
                cb = typeof arg4 === 'function' ? arg4 : typeof arg5 === 'function' ? arg5 : cb;
                cb(new ApiError(ErrorCode.EINVAL, 'Invalid arguments.'));
                return;
        }
        buffer = encode(arg2);
        offset = 0;
        length = buffer.length;
        const _cb = cb;
        promises
            .write(fd, buffer, offset, length, position)
            .then(bytesWritten => _cb(null, bytesWritten, decode(buffer)))
            .catch(_cb);
    }
    else {
        // Signature 2: (fd, buffer, offset, length, position?, cb?)
        buffer = arg2;
        offset = arg3;
        length = arg4;
        position = typeof arg5 === 'number' ? arg5 : null;
        const _cb = (typeof arg5 === 'function' ? arg5 : cb);
        promises
            .write(fd, buffer, offset, length, position)
            .then(bytesWritten => _cb(null, bytesWritten, buffer))
            .catch(_cb);
    }
}
/**
 * Read data from the file specified by `fd`.
 * @param buffer The buffer that the data will be
 *   written to.
 * @param offset The offset within the buffer where writing will
 *   start.
 * @param length An integer specifying the number of bytes to read.
 * @param position An integer specifying where to begin reading from
 *   in the file. If position is null, data will be read from the current file
 *   position.
 * @param callback The number is the number of bytes read
 */
export function read(fd, buffer, offset, length, position, cb = nop) {
    promises
        .read(fd, buffer, offset, length, position)
        .then(({ bytesRead, buffer }) => cb(null, bytesRead, buffer))
        .catch(cb);
}
/**
 * Asynchronous `fchown`.
 * @param fd
 * @param uid
 * @param gid
 * @param callback
 */
export function fchown(fd, uid, gid, cb = nop) {
    promises
        .fchown(fd, uid, gid)
        .then(() => cb())
        .catch(cb);
}
/**
 * Asynchronous `fchmod`.
 * @param fd
 * @param mode
 * @param callback
 */
export function fchmod(fd, mode, cb) {
    promises
        .fchmod(fd, mode)
        .then(() => cb())
        .catch(cb);
}
/**
 * Change the file timestamps of a file referenced by the supplied file
 * descriptor.
 * @param fd
 * @param atime
 * @param mtime
 * @param callback
 */
export function futimes(fd, atime, mtime, cb = nop) {
    promises
        .futimes(fd, atime, mtime)
        .then(() => cb())
        .catch(cb);
}
/**
 * Asynchronous `rmdir`.
 * @param path
 * @param callback
 */
export function rmdir(path, cb = nop) {
    promises
        .rmdir(path)
        .then(() => cb())
        .catch(cb);
}
/**
 * Asynchronous `mkdir`.
 * @param path
 * @param mode defaults to `0777`
 * @param callback
 */
export function mkdir(path, mode, cb = nop) {
    promises
        .mkdir(path, mode)
        .then(() => cb())
        .catch(cb);
}
export function readdir(path, _options, cb = nop) {
    cb = typeof _options == 'function' ? _options : cb;
    const options = typeof _options != 'function' ? _options : {};
    promises
        .readdir(path, options)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then(entries => cb(null, entries))
        .catch(cb);
}
/**
 * Asynchronous `link`.
 * @param srcpath
 * @param dstpath
 * @param callback
 */
export function link(srcpath, dstpath, cb = nop) {
    promises
        .link(srcpath, dstpath)
        .then(() => cb())
        .catch(cb);
}
export function symlink(srcpath, dstpath, arg3, cb = nop) {
    const type = typeof arg3 === 'string' ? arg3 : 'file';
    cb = typeof arg3 === 'function' ? arg3 : cb;
    promises
        .symlink(srcpath, dstpath, typeof arg3 === 'function' ? null : arg3)
        .then(() => cb())
        .catch(cb);
}
export function readlink(path, options, callback = nop) {
    callback = typeof options == 'function' ? options : callback;
    promises
        .readlink(path)
        .then(result => callback(null, result))
        .catch(callback);
}
/**
 * Asynchronous `chown`.
 * @param path
 * @param uid
 * @param gid
 * @param callback
 */
export function chown(path, uid, gid, cb = nop) {
    promises
        .chown(path, uid, gid)
        .then(() => cb())
        .catch(cb);
}
/**
 * Asynchronous `lchown`.
 * @param path
 * @param uid
 * @param gid
 * @param callback
 */
export function lchown(path, uid, gid, cb = nop) {
    promises
        .lchown(path, uid, gid)
        .then(() => cb())
        .catch(cb);
}
/**
 * Asynchronous `chmod`.
 * @param path
 * @param mode
 * @param callback
 */
export function chmod(path, mode, cb = nop) {
    promises
        .chmod(path, mode)
        .then(() => cb())
        .catch(cb);
}
/**
 * Asynchronous `lchmod`.
 * @param path
 * @param mode
 * @param callback
 */
export function lchmod(path, mode, cb = nop) {
    promises
        .lchmod(path, mode)
        .then(() => cb())
        .catch(cb);
}
/**
 * Change file timestamps of the file referenced by the supplied path.
 * @param path
 * @param atime
 * @param mtime
 * @param callback
 */
export function utimes(path, atime, mtime, cb = nop) {
    promises
        .utimes(path, atime, mtime)
        .then(() => cb())
        .catch(cb);
}
/**
 * Change file timestamps of the file referenced by the supplied path.
 * @param path
 * @param atime
 * @param mtime
 * @param callback
 */
export function lutimes(path, atime, mtime, cb = nop) {
    promises
        .lutimes(path, atime, mtime)
        .then(() => cb())
        .catch(cb);
}
export function realpath(path, arg2, cb = nop) {
    cb = typeof arg2 === 'function' ? arg2 : cb;
    promises
        .realpath(path, typeof arg2 === 'function' ? null : arg2)
        .then(result => cb(null, result))
        .catch(cb);
}
export function access(path, arg2, cb = nop) {
    const mode = typeof arg2 === 'number' ? arg2 : R_OK;
    cb = typeof arg2 === 'function' ? arg2 : cb;
    promises
        .access(path, typeof arg2 === 'function' ? null : arg2)
        .then(() => cb())
        .catch(cb);
}
export function watchFile(filename, arg2, listener = nop) {
    throw new ApiError(ErrorCode.ENOTSUP);
}
export function unwatchFile(filename, listener = nop) {
    throw new ApiError(ErrorCode.ENOTSUP);
}
export function watch(filename, arg2, listener = nop) {
    throw new ApiError(ErrorCode.ENOTSUP);
}
export function createReadStream(path, options) {
    throw new ApiError(ErrorCode.ENOTSUP);
}
export function createWriteStream(path, options) {
    throw new ApiError(ErrorCode.ENOTSUP);
}
export function rm(path) {
    new ApiError(ErrorCode.ENOTSUP);
}
export function mkdtemp(path) {
    new ApiError(ErrorCode.ENOTSUP);
}
export function copyFile(src, dest, flags, callback) {
    new ApiError(ErrorCode.ENOTSUP);
}
export function readv(path) {
    new ApiError(ErrorCode.ENOTSUP);
}
export function writev(fd, buffers, position, cb) {
    throw new ApiError(ErrorCode.ENOTSUP);
}
export function opendir(path) {
    throw new ApiError(ErrorCode.ENOTSUP);
}
