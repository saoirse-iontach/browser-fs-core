var _a;
import { BaseFileSystem } from '../filesystem.js';
import { ApiError, ErrorCode } from '../ApiError.js';
import { FileFlag, ActionType, PreloadFile } from '../file.js';
import { Stats } from '../stats.js';
import LockedFS from './Locked.js';
import { resolve, dirname } from '../emulation/path.js';
import { Cred } from '../cred.js';
import { CreateBackend } from './backend.js';
import { decode, encode } from '../utils.js';
/**
 * @internal
 */
const deletionLogPath = '/.deletedFiles.log';
/**
 * Given a read-only mode, makes it writable.
 * @internal
 */
function makeModeWritable(mode) {
    return 0o222 | mode;
}
/**
 * @internal
 */
function getFlag(f) {
    return FileFlag.getFileFlag(f);
}
/**
 * Overlays a RO file to make it writable.
 */
class OverlayFile extends PreloadFile {
    constructor(fs, path, flag, stats, data) {
        super(fs, path, flag, stats, data);
    }
    async sync() {
        if (!this.isDirty()) {
            return;
        }
        await this._fs._syncAsync(this);
        this.resetDirty();
    }
    syncSync() {
        if (this.isDirty()) {
            this._fs._syncSync(this);
            this.resetDirty();
        }
    }
    async close() {
        await this.sync();
    }
    closeSync() {
        this.syncSync();
    }
}
/**
 * *INTERNAL, DO NOT USE DIRECTLY!*
 *
 * Core OverlayFS class that contains no locking whatsoever. We wrap these objects
 * in a LockedFS to prevent races.
 */
export class UnlockedOverlayFS extends BaseFileSystem {
    static isAvailable() {
        return true;
    }
    constructor({ writable, readable }) {
        super();
        this._isInitialized = false;
        this._deletedFiles = {};
        this._deleteLog = '';
        // If 'true', we have scheduled a delete log update.
        this._deleteLogUpdatePending = false;
        // If 'true', a delete log update is needed after the scheduled delete log
        // update finishes.
        this._deleteLogUpdateNeeded = false;
        // If there was an error updating the delete log...
        this._deleteLogError = null;
        this._writable = writable;
        this._readable = readable;
        if (this._writable.metadata.readonly) {
            throw new ApiError(ErrorCode.EINVAL, 'Writable file system must be writable.');
        }
    }
    get metadata() {
        return {
            ...super.metadata,
            name: OverlayFS.Name,
            synchronous: this._readable.metadata.synchronous && this._writable.metadata.synchronous,
            supportsProperties: this._readable.metadata.supportsProperties && this._writable.metadata.supportsProperties,
        };
    }
    getOverlayedFileSystems() {
        return {
            readable: this._readable,
            writable: this._writable,
        };
    }
    async _syncAsync(file) {
        const stats = file.getStats();
        await this.createParentDirectoriesAsync(file.getPath(), stats.getCred(0, 0));
        return this._writable.writeFile(file.getPath(), file.getBuffer(), getFlag('w'), stats.mode, stats.getCred(0, 0));
    }
    _syncSync(file) {
        const stats = file.getStats();
        this.createParentDirectories(file.getPath(), stats.getCred(0, 0));
        this._writable.writeFileSync(file.getPath(), file.getBuffer(), getFlag('w'), stats.mode, stats.getCred(0, 0));
    }
    /**
     * **INTERNAL METHOD**
     *
     * Called once to load up metadata stored on the writable file system.
     */
    async _initialize() {
        // if we're already initialized, immediately invoke the callback
        if (this._isInitialized) {
            return;
        }
        // Read deletion log, process into metadata.
        try {
            const data = await this._writable.readFile(deletionLogPath, getFlag('r'), Cred.Root);
            this._deleteLog = decode(data);
        }
        catch (err) {
            if (err.errno !== ErrorCode.ENOENT) {
                throw err;
            }
        }
        this._isInitialized = true;
        this._reparseDeletionLog();
    }
    getDeletionLog() {
        return this._deleteLog;
    }
    restoreDeletionLog(log, cred) {
        this._deleteLog = log;
        this._reparseDeletionLog();
        this.updateLog('', cred);
    }
    async rename(oldPath, newPath, cred) {
        this.checkInitialized();
        this.checkPath(oldPath);
        this.checkPath(newPath);
        if (oldPath === deletionLogPath || newPath === deletionLogPath) {
            throw ApiError.EPERM('Cannot rename deletion log.');
        }
        // Write newPath using oldPath's contents, delete oldPath.
        const oldStats = await this.stat(oldPath, cred);
        if (oldStats.isDirectory()) {
            // Optimization: Don't bother moving if old === new.
            if (oldPath === newPath) {
                return;
            }
            let mode = 0o777;
            if (await this.exists(newPath, cred)) {
                const stats = await this.stat(newPath, cred);
                mode = stats.mode;
                if (stats.isDirectory()) {
                    if ((await this.readdir(newPath, cred)).length > 0) {
                        throw ApiError.ENOTEMPTY(newPath);
                    }
                }
                else {
                    throw ApiError.ENOTDIR(newPath);
                }
            }
            // Take care of writable first. Move any files there, or create an empty directory
            // if it doesn't exist.
            if (await this._writable.exists(oldPath, cred)) {
                await this._writable.rename(oldPath, newPath, cred);
            }
            else if (!(await this._writable.exists(newPath, cred))) {
                await this._writable.mkdir(newPath, mode, cred);
            }
            // Need to move *every file/folder* currently stored on readable to its new location
            // on writable.
            if (await this._readable.exists(oldPath, cred)) {
                for (const name of await this._readable.readdir(oldPath, cred)) {
                    // Recursion! Should work for any nested files / folders.
                    await this.rename(resolve(oldPath, name), resolve(newPath, name), cred);
                }
            }
        }
        else {
            if ((await this.exists(newPath, cred)) && (await this.stat(newPath, cred)).isDirectory()) {
                throw ApiError.EISDIR(newPath);
            }
            await this.writeFile(newPath, await this.readFile(oldPath, getFlag('r'), cred), getFlag('w'), oldStats.mode, cred);
        }
        if (oldPath !== newPath && (await this.exists(oldPath, cred))) {
            await this.unlink(oldPath, cred);
        }
    }
    renameSync(oldPath, newPath, cred) {
        this.checkInitialized();
        this.checkPath(oldPath);
        this.checkPath(newPath);
        if (oldPath === deletionLogPath || newPath === deletionLogPath) {
            throw ApiError.EPERM('Cannot rename deletion log.');
        }
        // Write newPath using oldPath's contents, delete oldPath.
        const oldStats = this.statSync(oldPath, cred);
        if (oldStats.isDirectory()) {
            // Optimization: Don't bother moving if old === new.
            if (oldPath === newPath) {
                return;
            }
            let mode = 0o777;
            if (this.existsSync(newPath, cred)) {
                const stats = this.statSync(newPath, cred);
                mode = stats.mode;
                if (stats.isDirectory()) {
                    if (this.readdirSync(newPath, cred).length > 0) {
                        throw ApiError.ENOTEMPTY(newPath);
                    }
                }
                else {
                    throw ApiError.ENOTDIR(newPath);
                }
            }
            // Take care of writable first. Move any files there, or create an empty directory
            // if it doesn't exist.
            if (this._writable.existsSync(oldPath, cred)) {
                this._writable.renameSync(oldPath, newPath, cred);
            }
            else if (!this._writable.existsSync(newPath, cred)) {
                this._writable.mkdirSync(newPath, mode, cred);
            }
            // Need to move *every file/folder* currently stored on readable to its new location
            // on writable.
            if (this._readable.existsSync(oldPath, cred)) {
                this._readable.readdirSync(oldPath, cred).forEach(name => {
                    // Recursion! Should work for any nested files / folders.
                    this.renameSync(resolve(oldPath, name), resolve(newPath, name), cred);
                });
            }
        }
        else {
            if (this.existsSync(newPath, cred) && this.statSync(newPath, cred).isDirectory()) {
                throw ApiError.EISDIR(newPath);
            }
            this.writeFileSync(newPath, this.readFileSync(oldPath, getFlag('r'), cred), getFlag('w'), oldStats.mode, cred);
        }
        if (oldPath !== newPath && this.existsSync(oldPath, cred)) {
            this.unlinkSync(oldPath, cred);
        }
    }
    async stat(p, cred) {
        this.checkInitialized();
        try {
            return this._writable.stat(p, cred);
        }
        catch (e) {
            if (this._deletedFiles[p]) {
                throw ApiError.ENOENT(p);
            }
            const oldStat = Stats.clone(await this._readable.stat(p, cred));
            // Make the oldStat's mode writable. Preserve the topmost part of the
            // mode, which specifies if it is a file or a directory.
            oldStat.mode = makeModeWritable(oldStat.mode);
            return oldStat;
        }
    }
    statSync(p, cred) {
        this.checkInitialized();
        try {
            return this._writable.statSync(p, cred);
        }
        catch (e) {
            if (this._deletedFiles[p]) {
                throw ApiError.ENOENT(p);
            }
            const oldStat = Stats.clone(this._readable.statSync(p, cred));
            // Make the oldStat's mode writable. Preserve the topmost part of the
            // mode, which specifies if it is a file or a directory.
            oldStat.mode = makeModeWritable(oldStat.mode);
            return oldStat;
        }
    }
    async open(p, flag, mode, cred) {
        this.checkInitialized();
        this.checkPath(p);
        if (p === deletionLogPath) {
            throw ApiError.EPERM('Cannot open deletion log.');
        }
        if (await this.exists(p, cred)) {
            switch (flag.pathExistsAction()) {
                case ActionType.TRUNCATE_FILE:
                    await this.createParentDirectoriesAsync(p, cred);
                    return this._writable.open(p, flag, mode, cred);
                case ActionType.NOP:
                    if (await this._writable.exists(p, cred)) {
                        return this._writable.open(p, flag, mode, cred);
                    }
                    else {
                        // Create an OverlayFile.
                        const buf = await this._readable.readFile(p, getFlag('r'), cred);
                        const stats = Stats.clone(await this._readable.stat(p, cred));
                        stats.mode = mode;
                        return new OverlayFile(this, p, flag, stats, buf);
                    }
                default:
                    throw ApiError.EEXIST(p);
            }
        }
        else {
            switch (flag.pathNotExistsAction()) {
                case ActionType.CREATE_FILE:
                    await this.createParentDirectoriesAsync(p, cred);
                    return this._writable.open(p, flag, mode, cred);
                default:
                    throw ApiError.ENOENT(p);
            }
        }
    }
    openSync(p, flag, mode, cred) {
        this.checkInitialized();
        this.checkPath(p);
        if (p === deletionLogPath) {
            throw ApiError.EPERM('Cannot open deletion log.');
        }
        if (this.existsSync(p, cred)) {
            switch (flag.pathExistsAction()) {
                case ActionType.TRUNCATE_FILE:
                    this.createParentDirectories(p, cred);
                    return this._writable.openSync(p, flag, mode, cred);
                case ActionType.NOP:
                    if (this._writable.existsSync(p, cred)) {
                        return this._writable.openSync(p, flag, mode, cred);
                    }
                    else {
                        // Create an OverlayFile.
                        const buf = this._readable.readFileSync(p, getFlag('r'), cred);
                        const stats = Stats.clone(this._readable.statSync(p, cred));
                        stats.mode = mode;
                        return new OverlayFile(this, p, flag, stats, buf);
                    }
                default:
                    throw ApiError.EEXIST(p);
            }
        }
        else {
            switch (flag.pathNotExistsAction()) {
                case ActionType.CREATE_FILE:
                    this.createParentDirectories(p, cred);
                    return this._writable.openSync(p, flag, mode, cred);
                default:
                    throw ApiError.ENOENT(p);
            }
        }
    }
    async unlink(p, cred) {
        this.checkInitialized();
        this.checkPath(p);
        if (await this.exists(p, cred)) {
            if (await this._writable.exists(p, cred)) {
                await this._writable.unlink(p, cred);
            }
            // if it still exists add to the delete log
            if (await this.exists(p, cred)) {
                this.deletePath(p, cred);
            }
        }
        else {
            throw ApiError.ENOENT(p);
        }
    }
    unlinkSync(p, cred) {
        this.checkInitialized();
        this.checkPath(p);
        if (this.existsSync(p, cred)) {
            if (this._writable.existsSync(p, cred)) {
                this._writable.unlinkSync(p, cred);
            }
            // if it still exists add to the delete log
            if (this.existsSync(p, cred)) {
                this.deletePath(p, cred);
            }
        }
        else {
            throw ApiError.ENOENT(p);
        }
    }
    async rmdir(p, cred) {
        this.checkInitialized();
        if (await this.exists(p, cred)) {
            if (await this._writable.exists(p, cred)) {
                await this._writable.rmdir(p, cred);
            }
            if (await this.exists(p, cred)) {
                // Check if directory is empty.
                if ((await this.readdir(p, cred)).length > 0) {
                    throw ApiError.ENOTEMPTY(p);
                }
                else {
                    this.deletePath(p, cred);
                }
            }
        }
        else {
            throw ApiError.ENOENT(p);
        }
    }
    rmdirSync(p, cred) {
        this.checkInitialized();
        if (this.existsSync(p, cred)) {
            if (this._writable.existsSync(p, cred)) {
                this._writable.rmdirSync(p, cred);
            }
            if (this.existsSync(p, cred)) {
                // Check if directory is empty.
                if (this.readdirSync(p, cred).length > 0) {
                    throw ApiError.ENOTEMPTY(p);
                }
                else {
                    this.deletePath(p, cred);
                }
            }
        }
        else {
            throw ApiError.ENOENT(p);
        }
    }
    async mkdir(p, mode, cred) {
        this.checkInitialized();
        if (await this.exists(p, cred)) {
            throw ApiError.EEXIST(p);
        }
        else {
            // The below will throw should any of the parent directories fail to exist
            // on _writable.
            await this.createParentDirectoriesAsync(p, cred);
            await this._writable.mkdir(p, mode, cred);
        }
    }
    mkdirSync(p, mode, cred) {
        this.checkInitialized();
        if (this.existsSync(p, cred)) {
            throw ApiError.EEXIST(p);
        }
        else {
            // The below will throw should any of the parent directories fail to exist
            // on _writable.
            this.createParentDirectories(p, cred);
            this._writable.mkdirSync(p, mode, cred);
        }
    }
    async readdir(p, cred) {
        this.checkInitialized();
        const dirStats = await this.stat(p, cred);
        if (!dirStats.isDirectory()) {
            throw ApiError.ENOTDIR(p);
        }
        // Readdir in both, check delete log on RO file system's listing, merge, return.
        let contents = [];
        try {
            contents = contents.concat(await this._writable.readdir(p, cred));
        }
        catch (e) {
            // NOP.
        }
        try {
            contents = contents.concat((await this._readable.readdir(p, cred)).filter((fPath) => !this._deletedFiles[`${p}/${fPath}`]));
        }
        catch (e) {
            // NOP.
        }
        const seenMap = {};
        return contents.filter((fileP) => {
            const result = !seenMap[fileP];
            seenMap[fileP] = true;
            return result;
        });
    }
    readdirSync(p, cred) {
        this.checkInitialized();
        const dirStats = this.statSync(p, cred);
        if (!dirStats.isDirectory()) {
            throw ApiError.ENOTDIR(p);
        }
        // Readdir in both, check delete log on RO file system's listing, merge, return.
        let contents = [];
        try {
            contents = contents.concat(this._writable.readdirSync(p, cred));
        }
        catch (e) {
            // NOP.
        }
        try {
            contents = contents.concat(this._readable.readdirSync(p, cred).filter((fPath) => !this._deletedFiles[`${p}/${fPath}`]));
        }
        catch (e) {
            // NOP.
        }
        const seenMap = {};
        return contents.filter((fileP) => {
            const result = !seenMap[fileP];
            seenMap[fileP] = true;
            return result;
        });
    }
    async exists(p, cred) {
        this.checkInitialized();
        return (await this._writable.exists(p, cred)) || ((await this._readable.exists(p, cred)) && this._deletedFiles[p] !== true);
    }
    existsSync(p, cred) {
        this.checkInitialized();
        return this._writable.existsSync(p, cred) || (this._readable.existsSync(p, cred) && this._deletedFiles[p] !== true);
    }
    async chmod(p, mode, cred) {
        this.checkInitialized();
        await this.operateOnWritableAsync(p, cred);
        await this._writable.chmod(p, mode, cred);
    }
    chmodSync(p, mode, cred) {
        this.checkInitialized();
        this.operateOnWritable(p, cred);
        this._writable.chmodSync(p, mode, cred);
    }
    async chown(p, new_uid, new_gid, cred) {
        this.checkInitialized();
        await this.operateOnWritableAsync(p, cred);
        await this._writable.chown(p, new_uid, new_gid, cred);
    }
    chownSync(p, new_uid, new_gid, cred) {
        this.checkInitialized();
        this.operateOnWritable(p, cred);
        this._writable.chownSync(p, new_uid, new_gid, cred);
    }
    async utimes(p, atime, mtime, cred) {
        this.checkInitialized();
        await this.operateOnWritableAsync(p, cred);
        await this._writable.utimes(p, atime, mtime, cred);
    }
    utimesSync(p, atime, mtime, cred) {
        this.checkInitialized();
        this.operateOnWritable(p, cred);
        this._writable.utimesSync(p, atime, mtime, cred);
    }
    deletePath(p, cred) {
        this._deletedFiles[p] = true;
        this.updateLog(`d${p}\n`, cred);
    }
    updateLog(addition, cred) {
        this._deleteLog += addition;
        if (this._deleteLogUpdatePending) {
            this._deleteLogUpdateNeeded = true;
        }
        else {
            this._deleteLogUpdatePending = true;
            this._writable
                .writeFile(deletionLogPath, encode(this._deleteLog), FileFlag.getFileFlag('w'), 0o644, cred)
                .then(() => {
                if (this._deleteLogUpdateNeeded) {
                    this._deleteLogUpdateNeeded = false;
                    this.updateLog('', cred);
                }
            })
                .catch(e => {
                this._deleteLogError = e;
            })
                .finally(() => {
                this._deleteLogUpdatePending = false;
            });
        }
    }
    _reparseDeletionLog() {
        this._deletedFiles = {};
        this._deleteLog.split('\n').forEach((path) => {
            // If the log entry begins w/ 'd', it's a deletion.
            this._deletedFiles[path.slice(1)] = path.slice(0, 1) === 'd';
        });
    }
    checkInitialized() {
        if (!this._isInitialized) {
            throw new ApiError(ErrorCode.EPERM, 'OverlayFS is not initialized. Please initialize OverlayFS using its initialize() method before using it.');
        }
        else if (this._deleteLogError !== null) {
            const e = this._deleteLogError;
            this._deleteLogError = null;
            throw e;
        }
    }
    checkPath(p) {
        if (p === deletionLogPath) {
            throw ApiError.EPERM(p);
        }
    }
    /**
     * With the given path, create the needed parent directories on the writable storage
     * should they not exist. Use modes from the read-only storage.
     */
    createParentDirectories(p, cred) {
        let parent = dirname(p), toCreate = [];
        while (!this._writable.existsSync(parent, cred)) {
            toCreate.push(parent);
            parent = dirname(parent);
        }
        toCreate = toCreate.reverse();
        for (const p of toCreate) {
            this._writable.mkdirSync(p, this.statSync(p, cred).mode, cred);
        }
    }
    async createParentDirectoriesAsync(p, cred) {
        let parent = dirname(p), toCreate = [];
        while (!(await this._writable.exists(parent, cred))) {
            toCreate.push(parent);
            parent = dirname(parent);
        }
        toCreate = toCreate.reverse();
        for (const p of toCreate) {
            const stats = await this.stat(p, cred);
            await this._writable.mkdir(p, stats.mode, cred);
        }
    }
    /**
     * Helper function:
     * - Ensures p is on writable before proceeding. Throws an error if it doesn't exist.
     * - Calls f to perform operation on writable.
     */
    operateOnWritable(p, cred) {
        if (!this.existsSync(p, cred)) {
            throw ApiError.ENOENT(p);
        }
        if (!this._writable.existsSync(p, cred)) {
            // File is on readable storage. Copy to writable storage before
            // changing its mode.
            this.copyToWritable(p, cred);
        }
    }
    async operateOnWritableAsync(p, cred) {
        if (!(await this.exists(p, cred))) {
            throw ApiError.ENOENT(p);
        }
        if (!(await this._writable.exists(p, cred))) {
            return this.copyToWritableAsync(p, cred);
        }
    }
    /**
     * Copy from readable to writable storage.
     * PRECONDITION: File does not exist on writable storage.
     */
    copyToWritable(p, cred) {
        const pStats = this.statSync(p, cred);
        if (pStats.isDirectory()) {
            this._writable.mkdirSync(p, pStats.mode, cred);
        }
        else {
            this.writeFileSync(p, this._readable.readFileSync(p, getFlag('r'), cred), getFlag('w'), pStats.mode, cred);
        }
    }
    async copyToWritableAsync(p, cred) {
        const pStats = await this.stat(p, cred);
        if (pStats.isDirectory()) {
            await this._writable.mkdir(p, pStats.mode, cred);
        }
        else {
            await this.writeFile(p, await this._readable.readFile(p, getFlag('r'), cred), getFlag('w'), pStats.mode, cred);
        }
    }
}
/**
 * OverlayFS makes a read-only filesystem writable by storing writes on a second,
 * writable file system. Deletes are persisted via metadata stored on the writable
 * file system.
 */
export class OverlayFS extends LockedFS {
    static isAvailable() {
        return UnlockedOverlayFS.isAvailable();
    }
    /**
     * @param options The options to initialize the OverlayFS with
     */
    constructor(options) {
        super(new UnlockedOverlayFS(options));
        this._ready = this._initialize();
    }
    getOverlayedFileSystems() {
        return super.fs.getOverlayedFileSystems();
    }
    getDeletionLog() {
        return super.fs.getDeletionLog();
    }
    resDeletionLog() {
        return super.fs.getDeletionLog();
    }
    unwrap() {
        return super.fs;
    }
    async _initialize() {
        await super.fs._initialize();
        return this;
    }
}
_a = OverlayFS;
OverlayFS.Name = 'OverlayFS';
OverlayFS.Create = CreateBackend.bind(_a);
OverlayFS.Options = {
    writable: {
        type: 'object',
        description: 'The file system to write modified files to.',
    },
    readable: {
        type: 'object',
        description: 'The file system that initially populates this file system.',
    },
};
