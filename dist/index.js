/**
 * BrowserFS's main module. This is exposed in the browser via the BrowserFS global.
 */
import fs from './emulation/fs.js';
import { FileSystem } from './filesystem.js';
import { backends } from './backends/index.js';
import { ErrorCode, ApiError } from './ApiError.js';
import { Cred } from './cred.js';
import { setCred } from './emulation/shared.js';
/**
 * Initializes BrowserFS with the given file systems.
 */
export function initialize(mounts, uid = 0, gid = 0) {
    setCred(new Cred(uid, gid, uid, gid, uid, gid));
    return fs.initialize(mounts);
}
async function _configure(config) {
    if ('fs' in config || config instanceof FileSystem) {
        // single FS
        config = { '/': config };
    }
    for (let [point, value] of Object.entries(config)) {
        if (typeof value == 'number') {
            //should never happen
            continue;
        }
        if (value instanceof FileSystem) {
            continue;
        }
        if (typeof value == 'string') {
            value = { fs: value };
        }
        config[point] = await getFileSystem(value);
    }
    return initialize(config);
}
export function configure(config, cb) {
    // Promise version
    if (typeof cb != 'function') {
        return _configure(config);
    }
    // Callback version
    _configure(config)
        .then(() => cb())
        .catch(err => cb(err));
    return;
}
async function _getFileSystem({ fs: fsName, options = {} }) {
    if (!fsName) {
        throw new ApiError(ErrorCode.EPERM, 'Missing "fs" property on configuration object.');
    }
    if (typeof options !== 'object' || options === null) {
        throw new ApiError(ErrorCode.EINVAL, 'Invalid "options" property on configuration object.');
    }
    const props = Object.keys(options).filter(k => k != 'fs');
    for (const prop of props) {
        const opt = options[prop];
        if (opt === null || typeof opt !== 'object' || !('fs' in opt)) {
            continue;
        }
        const fs = await _getFileSystem(opt);
        options[prop] = fs;
    }
    const fsc = backends[fsName];
    if (!fsc) {
        throw new ApiError(ErrorCode.EPERM, `File system ${fsName} is not available in BrowserFS.`);
    }
    else {
        return fsc.Create(options);
    }
}
export function getFileSystem(config, cb) {
    // Promise version
    if (typeof cb != 'function') {
        return _getFileSystem(config);
    }
    // Callback version
    _getFileSystem(config)
        .then(fs => cb(null, fs))
        .catch(err => cb(err));
    return;
}
export * from './backends/index.js';
export * from './backends/AsyncStore.js';
export * from './backends/SyncStore.js';
export * from './ApiError.js';
export * from './cred.js';
export * from './FileIndex.js';
export * from './file.js';
export * from './filesystem.js';
export * from './inode.js';
export * from './mutex.js';
export * from './stats.js';
export * from './utils.js';
export { fs };
export default fs;
