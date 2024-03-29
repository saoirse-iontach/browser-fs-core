/* eslint-disable @typescript-eslint/no-unused-vars */
// disable no-unused-vars since BaseFileSystem uses them a lot
var _a;
import { ApiError, ErrorCode } from './ApiError.js';
import { FileFlag, ActionType } from './file.js';
import * as path from './emulation/path.js';
import { encode } from './utils.js';
/**
 * Structure for a filesystem. **All** BrowserFS FileSystems must implement
 * this.
 *
 * ### Argument Assumptions
 *
 * You can assume the following about arguments passed to each API method:
 *
 * - Every path is an absolute path. `.`, `..`, and other items
 *   are resolved into an absolute form.
 * - All arguments are present. Any optional arguments at the Node API level
 *   have been passed in with their default values.
 */
export class FileSystem {
    constructor(options) {
        // unused
    }
}
/**
 * Basic filesystem class. Most filesystems should extend this class, as it
 * provides default implementations for a handful of methods.
 */
export class BaseFileSystem extends FileSystem {
    constructor(options) {
        super();
        this._ready = Promise.resolve(this);
    }
    get metadata() {
        return {
            name: this.constructor.name,
            readonly: false,
            synchronous: false,
            supportsProperties: false,
            supportsLinks: false,
            totalSpace: 0,
            freeSpace: 0,
        };
    }
    whenReady() {
        return this._ready;
    }
    /**
     * Opens the file at path p with the given flag. The file must exist.
     * @param p The path to open.
     * @param flag The flag to use when opening the file.
     */
    async openFile(p, flag, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    /**
     * Create the file at path p with the given mode. Then, open it with the given
     * flag.
     */
    async createFile(p, flag, mode, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    async open(p, flag, mode, cred) {
        try {
            const stats = await this.stat(p, cred);
            switch (flag.pathExistsAction()) {
                case ActionType.THROW_EXCEPTION:
                    throw ApiError.EEXIST(p);
                case ActionType.TRUNCATE_FILE:
                    // NOTE: In a previous implementation, we deleted the file and
                    // re-created it. However, this created a race condition if another
                    // asynchronous request was trying to read the file, as the file
                    // would not exist for a small period of time.
                    const fd = await this.openFile(p, flag, cred);
                    if (!fd)
                        throw new Error('BFS has reached an impossible code path; please file a bug.');
                    await fd.truncate(0);
                    await fd.sync();
                    return fd;
                case ActionType.NOP:
                    return this.openFile(p, flag, cred);
                default:
                    throw new ApiError(ErrorCode.EINVAL, 'Invalid FileFlag object.');
            }
            // File exists.
        }
        catch (e) {
            // File does not exist.
            switch (flag.pathNotExistsAction()) {
                case ActionType.CREATE_FILE:
                    // Ensure parent exists.
                    const parentStats = await this.stat(path.dirname(p), cred);
                    if (parentStats && !parentStats.isDirectory()) {
                        throw ApiError.ENOTDIR(path.dirname(p));
                    }
                    return this.createFile(p, flag, mode, cred);
                case ActionType.THROW_EXCEPTION:
                    throw ApiError.ENOENT(p);
                default:
                    throw new ApiError(ErrorCode.EINVAL, 'Invalid FileFlag object.');
            }
        }
    }
    async access(p, mode, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    accessSync(p, mode, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    async rename(oldPath, newPath, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    renameSync(oldPath, newPath, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    async stat(p, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    statSync(p, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    /**
     * Opens the file at path p with the given flag. The file must exist.
     * @param p The path to open.
     * @param flag The flag to use when opening the file.
     * @return A File object corresponding to the opened file.
     */
    openFileSync(p, flag, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    /**
     * Create the file at path p with the given mode. Then, open it with the given
     * flag.
     */
    createFileSync(p, flag, mode, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    openSync(p, flag, mode, cred) {
        // Check if the path exists, and is a file.
        let stats;
        try {
            stats = this.statSync(p, cred);
        }
        catch (e) {
            // File does not exist.
            switch (flag.pathNotExistsAction()) {
                case ActionType.CREATE_FILE:
                    // Ensure parent exists.
                    const parentStats = this.statSync(path.dirname(p), cred);
                    if (!parentStats.isDirectory()) {
                        throw ApiError.ENOTDIR(path.dirname(p));
                    }
                    return this.createFileSync(p, flag, mode, cred);
                case ActionType.THROW_EXCEPTION:
                    throw ApiError.ENOENT(p);
                default:
                    throw new ApiError(ErrorCode.EINVAL, 'Invalid FileFlag object.');
            }
        }
        if (!stats.hasAccess(mode, cred)) {
            throw ApiError.EACCES(p);
        }
        // File exists.
        switch (flag.pathExistsAction()) {
            case ActionType.THROW_EXCEPTION:
                throw ApiError.EEXIST(p);
            case ActionType.TRUNCATE_FILE:
                // Delete file.
                this.unlinkSync(p, cred);
                // Create file. Use the same mode as the old file.
                // Node itself modifies the ctime when this occurs, so this action
                // will preserve that behavior if the underlying file system
                // supports those properties.
                return this.createFileSync(p, flag, stats.mode, cred);
            case ActionType.NOP:
                return this.openFileSync(p, flag, cred);
            default:
                throw new ApiError(ErrorCode.EINVAL, 'Invalid FileFlag object.');
        }
    }
    async unlink(p, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    unlinkSync(p, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    async rmdir(p, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    rmdirSync(p, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    async mkdir(p, mode, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    mkdirSync(p, mode, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    async readdir(p, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    readdirSync(p, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    async exists(p, cred) {
        try {
            await this.stat(p, cred);
            return true;
        }
        catch (e) {
            return false;
        }
    }
    existsSync(p, cred) {
        try {
            this.statSync(p, cred);
            return true;
        }
        catch (e) {
            return false;
        }
    }
    async realpath(p, cred) {
        if (this.metadata.supportsLinks) {
            // The path could contain symlinks. Split up the path,
            // resolve any symlinks, return the resolved string.
            const splitPath = p.split(path.sep);
            // TODO: Simpler to just pass through file, find sep and such.
            for (let i = 0; i < splitPath.length; i++) {
                const addPaths = splitPath.slice(0, i + 1);
                splitPath[i] = path.join(...addPaths);
            }
            return splitPath.join(path.sep);
        }
        else {
            // No symlinks. We just need to verify that it exists.
            if (!(await this.exists(p, cred))) {
                throw ApiError.ENOENT(p);
            }
            return p;
        }
    }
    realpathSync(p, cred) {
        if (this.metadata.supportsLinks) {
            // The path could contain symlinks. Split up the path,
            // resolve any symlinks, return the resolved string.
            const splitPath = p.split(path.sep);
            // TODO: Simpler to just pass through file, find sep and such.
            for (let i = 0; i < splitPath.length; i++) {
                const addPaths = splitPath.slice(0, i + 1);
                splitPath[i] = path.join(...addPaths);
            }
            return splitPath.join(path.sep);
        }
        else {
            // No symlinks. We just need to verify that it exists.
            if (this.existsSync(p, cred)) {
                return p;
            }
            else {
                throw ApiError.ENOENT(p);
            }
        }
    }
    async truncate(p, len, cred) {
        const fd = await this.open(p, FileFlag.getFileFlag('r+'), 0o644, cred);
        try {
            await fd.truncate(len);
        }
        finally {
            await fd.close();
        }
    }
    truncateSync(p, len, cred) {
        const fd = this.openSync(p, FileFlag.getFileFlag('r+'), 0o644, cred);
        // Need to safely close FD, regardless of whether or not truncate succeeds.
        try {
            fd.truncateSync(len);
        }
        finally {
            fd.closeSync();
        }
    }
    async readFile(fname, flag, cred) {
        // Get file.
        const fd = await this.open(fname, flag, 0o644, cred);
        try {
            const stat = await fd.stat();
            // Allocate buffer.
            const buf = new Uint8Array(stat.size);
            await fd.read(buf, 0, stat.size, 0);
            await fd.close();
            return buf;
        }
        finally {
            await fd.close();
        }
    }
    readFileSync(fname, flag, cred) {
        // Get file.
        const fd = this.openSync(fname, flag, 0o644, cred);
        try {
            const stat = fd.statSync();
            // Allocate buffer.
            const buf = new Uint8Array(stat.size);
            fd.readSync(buf, 0, stat.size, 0);
            fd.closeSync();
            return buf;
        }
        finally {
            fd.closeSync();
        }
    }
    async writeFile(fname, data, flag, mode, cred) {
        // Get file.
        const fd = await this.open(fname, flag, mode, cred);
        try {
            if (typeof data === 'string') {
                data = encode(data);
            }
            // Write into file.
            await fd.write(data, 0, data.length, 0);
        }
        finally {
            await fd.close();
        }
    }
    writeFileSync(fname, data, flag, mode, cred) {
        // Get file.
        const fd = this.openSync(fname, flag, mode, cred);
        try {
            if (typeof data === 'string') {
                data = encode(data);
            }
            // Write into file.
            fd.writeSync(data, 0, data.length, 0);
        }
        finally {
            fd.closeSync();
        }
    }
    async appendFile(fname, data, flag, mode, cred) {
        const fd = await this.open(fname, flag, mode, cred);
        try {
            if (typeof data === 'string') {
                data = encode(data);
            }
            await fd.write(data, 0, data.length, null);
        }
        finally {
            await fd.close();
        }
    }
    appendFileSync(fname, data, flag, mode, cred) {
        const fd = this.openSync(fname, flag, mode, cred);
        try {
            if (typeof data === 'string') {
                data = encode(data);
            }
            fd.writeSync(data, 0, data.length, null);
        }
        finally {
            fd.closeSync();
        }
    }
    async chmod(p, mode, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    chmodSync(p, mode, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    async chown(p, new_uid, new_gid, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    chownSync(p, new_uid, new_gid, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    async utimes(p, atime, mtime, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    utimesSync(p, atime, mtime, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    async link(srcpath, dstpath, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    linkSync(srcpath, dstpath, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    async symlink(srcpath, dstpath, type, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    symlinkSync(srcpath, dstpath, type, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    async readlink(p, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    readlinkSync(p, cred) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
}
_a = BaseFileSystem;
BaseFileSystem.Name = _a.name;
/**
 * Implements the asynchronous API in terms of the synchronous API.
 */
export class SynchronousFileSystem extends BaseFileSystem {
    get metadata() {
        return { ...super.metadata, synchronous: true };
    }
    async access(p, mode, cred) {
        return this.accessSync(p, mode, cred);
    }
    async rename(oldPath, newPath, cred) {
        return this.renameSync(oldPath, newPath, cred);
    }
    async stat(p, cred) {
        return this.statSync(p, cred);
    }
    async open(p, flags, mode, cred) {
        return this.openSync(p, flags, mode, cred);
    }
    async unlink(p, cred) {
        return this.unlinkSync(p, cred);
    }
    async rmdir(p, cred) {
        return this.rmdirSync(p, cred);
    }
    async mkdir(p, mode, cred) {
        return this.mkdirSync(p, mode, cred);
    }
    async readdir(p, cred) {
        return this.readdirSync(p, cred);
    }
    async chmod(p, mode, cred) {
        return this.chmodSync(p, mode, cred);
    }
    async chown(p, new_uid, new_gid, cred) {
        return this.chownSync(p, new_uid, new_gid, cred);
    }
    async utimes(p, atime, mtime, cred) {
        return this.utimesSync(p, atime, mtime, cred);
    }
    async link(srcpath, dstpath, cred) {
        return this.linkSync(srcpath, dstpath, cred);
    }
    async symlink(srcpath, dstpath, type, cred) {
        return this.symlinkSync(srcpath, dstpath, type, cred);
    }
    async readlink(p, cred) {
        return this.readlinkSync(p, cred);
    }
}
