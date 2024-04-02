// Utilities and shared data
import { resolve } from './path.js';
import { ApiError, ErrorCode } from '../ApiError.js';
import { Cred } from '../cred.js';
import { InMemoryFileSystem } from '../backends/InMemory.js';
/**
 * converts Date or number to a fractional UNIX timestamp
 * Grabbed from NodeJS sources (lib/fs.js)
 */
export function _toUnixTimestamp(time) {
    if (typeof time === 'number') {
        return time;
    }
    else if (time instanceof Date) {
        return time.getTime() / 1000;
    }
    throw new Error('Cannot parse time: ' + time);
}
export function normalizeMode(mode, def) {
    switch (typeof mode) {
        case 'number':
            // (path, flag, mode, cb?)
            return mode;
        case 'string':
            // (path, flag, modeString, cb?)
            const trueMode = parseInt(mode, 8);
            if (!isNaN(trueMode)) {
                return trueMode;
            }
            // Invalid string.
            return def;
        default:
            return def;
    }
}
export function normalizeTime(time) {
    if (time instanceof Date) {
        return time;
    }
    if (typeof time === 'number') {
        return new Date(time * 1000);
    }
    throw new ApiError(ErrorCode.EINVAL, `Invalid time.`);
}
export function normalizePath(p) {
    // Node doesn't allow null characters in paths.
    if (p.indexOf('\u0000') >= 0) {
        throw new ApiError(ErrorCode.EINVAL, 'Path must be a string without null bytes.');
    }
    if (p === '') {
        throw new ApiError(ErrorCode.EINVAL, 'Path must not be empty.');
    }
    p = p.replaceAll(/\/+/g, '/');
    return resolve(p);
}
export function normalizeOptions(options, defEnc, defFlag, defMode) {
    // typeof null === 'object' so special-case handing is needed.
    switch (options === null ? 'null' : typeof options) {
        case 'object':
            return {
                encoding: typeof options['encoding'] !== 'undefined' ? options['encoding'] : defEnc,
                flag: typeof options['flag'] !== 'undefined' ? options['flag'] : defFlag,
                mode: normalizeMode(options['mode'], defMode),
            };
        case 'string':
            return {
                encoding: options,
                flag: defFlag,
                mode: defMode,
            };
        case 'null':
        case 'undefined':
        case 'function':
            return {
                encoding: defEnc,
                flag: defFlag,
                mode: defMode,
            };
        default:
            throw new TypeError(`"options" must be a string or an object, got ${typeof options} instead.`);
    }
}
export function nop() {
    // do nothing
}
// credentials
export let cred = Cred.Root;
export function setCred(val) {
    cred = val;
}
// descriptors
export const fdMap = new Map();
let nextFd = 100;
export function getFdForFile(file) {
    const fd = nextFd++;
    fdMap.set(fd, file);
    return fd;
}
export function fd2file(fd) {
    if (!fdMap.has(fd)) {
        throw new ApiError(ErrorCode.EBADF, 'Invalid file descriptor.');
    }
    return fdMap.get(fd);
}
export const mounts = new Map();
/*
Set a default root.
There is a very small but not 0 change that initialize() will try to unmount the default before it is mounted.
This can be fixed by using a top-level await, which is not done to maintain ES6 compatibility.
*/
InMemoryFileSystem.Create().then(fs => mount('/', fs));
/**
 * Gets the file system mounted at `mountPoint`
 */
export function getMount(mountPoint) {
    return mounts.get(mountPoint);
}
/**
 * Gets an object of mount points (keys) and filesystems (values)
 */
export function getMounts() {
    return Object.fromEntries(mounts.entries());
}
/**
 * Mounts the file system at the given mount point.
 */
export function mount(mountPoint, fs) {
    if (mountPoint[0] !== '/') {
        mountPoint = '/' + mountPoint;
    }
    mountPoint = resolve(mountPoint);
    if (mounts.has(mountPoint)) {
        throw new ApiError(ErrorCode.EINVAL, 'Mount point ' + mountPoint + ' is already in use.');
    }
    mounts.set(mountPoint, fs);
}
/**
 * Unmounts the file system at the given mount point.
 */
export function umount(mountPoint) {
    if (mountPoint[0] !== '/') {
        mountPoint = `/${mountPoint}`;
    }
    mountPoint = resolve(mountPoint);
    if (!mounts.has(mountPoint)) {
        throw new ApiError(ErrorCode.EINVAL, 'Mount point ' + mountPoint + ' is already unmounted.');
    }
    mounts.delete(mountPoint);
}
/**
 * Gets the internal FileSystem for the path, then returns it along with the path relative to the FS' root
 */
export function resolveFS(path) {
    const sortedMounts = [...mounts].sort((a, b) => (a[0].length > b[0].length ? -1 : 1)); // decending order of the string length
    for (const [mountPoint, fs] of sortedMounts) {
        // We know path is normalized, so it would be a substring of the mount point.
        if (mountPoint.length <= path.length && path.startsWith(mountPoint)) {
            path = path.slice(mountPoint.length > 1 ? mountPoint.length : 0); // Resolve the path relative to the mount point
            if (path === '') {
                path = '/';
            }
            return { fs, path, mountPoint };
        }
    }
    throw new ApiError(ErrorCode.EIO, 'BrowserFS not initialized with a file system');
}
/**
 * Reverse maps the paths in text from the mounted FileSystem to the global path
 */
export function fixPaths(text, paths) {
    for (const [from, to] of Object.entries(paths)) {
        text = text?.replaceAll(from, to);
    }
    return text;
}
export function fixError(e, paths) {
    if (typeof e.stack == 'string') {
        e.stack = fixPaths(e.stack, paths);
    }
    e.message = fixPaths(e.message, paths);
    return e;
}
export function initialize(mountMapping) {
    if (mountMapping['/']) {
        umount('/');
    }
    for (const [point, fs] of Object.entries(mountMapping)) {
        const FS = fs.constructor;
        if (!FS.isAvailable()) {
            throw new ApiError(ErrorCode.EINVAL, `Can not mount "${point}" since the filesystem is unavailable.`);
        }
        mount(point, fs);
    }
}
