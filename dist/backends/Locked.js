import Mutex from '../mutex.js';
/**
 * This class serializes access to an underlying async filesystem.
 * For example, on an OverlayFS instance with an async lower
 * directory operations like rename and rmdir may involve multiple
 * requests involving both the upper and lower filesystems -- they
 * are not executed in a single atomic step.  OverlayFS uses this
 * LockedFS to avoid having to reason about the correctness of
 * multiple requests interleaving.
 */
export default class LockedFS {
    constructor(fs) {
        this._ready = Promise.resolve(this);
        this._fs = fs;
        this._mu = new Mutex();
    }
    whenReady() {
        return this._ready;
    }
    get metadata() {
        return {
            ...this._fs.metadata,
            name: 'LockedFS<' + this._fs.metadata.name + '>',
        };
    }
    get fs() {
        return this._fs;
    }
    async rename(oldPath, newPath, cred) {
        await this._mu.lock(oldPath);
        await this._fs.rename(oldPath, newPath, cred);
        this._mu.unlock(oldPath);
    }
    renameSync(oldPath, newPath, cred) {
        if (this._mu.isLocked(oldPath)) {
            throw new Error('invalid sync call');
        }
        return this._fs.renameSync(oldPath, newPath, cred);
    }
    async stat(p, cred) {
        await this._mu.lock(p);
        const stats = await this._fs.stat(p, cred);
        this._mu.unlock(p);
        return stats;
    }
    statSync(p, cred) {
        if (this._mu.isLocked(p)) {
            throw new Error('invalid sync call');
        }
        return this._fs.statSync(p, cred);
    }
    async access(p, mode, cred) {
        await this._mu.lock(p);
        await this._fs.access(p, mode, cred);
        this._mu.unlock(p);
    }
    accessSync(p, mode, cred) {
        if (this._mu.isLocked(p)) {
            throw new Error('invalid sync call');
        }
        return this._fs.accessSync(p, mode, cred);
    }
    async open(p, flag, mode, cred) {
        await this._mu.lock(p);
        const fd = await this._fs.open(p, flag, mode, cred);
        this._mu.unlock(p);
        return fd;
    }
    openSync(p, flag, mode, cred) {
        if (this._mu.isLocked(p)) {
            throw new Error('invalid sync call');
        }
        return this._fs.openSync(p, flag, mode, cred);
    }
    async unlink(p, cred) {
        await this._mu.lock(p);
        await this._fs.unlink(p, cred);
        this._mu.unlock(p);
    }
    unlinkSync(p, cred) {
        if (this._mu.isLocked(p)) {
            throw new Error('invalid sync call');
        }
        return this._fs.unlinkSync(p, cred);
    }
    async rmdir(p, cred) {
        await this._mu.lock(p);
        await this._fs.rmdir(p, cred);
        this._mu.unlock(p);
    }
    rmdirSync(p, cred) {
        if (this._mu.isLocked(p)) {
            throw new Error('invalid sync call');
        }
        return this._fs.rmdirSync(p, cred);
    }
    async mkdir(p, mode, cred) {
        await this._mu.lock(p);
        await this._fs.mkdir(p, mode, cred);
        this._mu.unlock(p);
    }
    mkdirSync(p, mode, cred) {
        if (this._mu.isLocked(p)) {
            throw new Error('invalid sync call');
        }
        return this._fs.mkdirSync(p, mode, cred);
    }
    async readdir(p, cred) {
        await this._mu.lock(p);
        const files = await this._fs.readdir(p, cred);
        this._mu.unlock(p);
        return files;
    }
    readdirSync(p, cred) {
        if (this._mu.isLocked(p)) {
            throw new Error('invalid sync call');
        }
        return this._fs.readdirSync(p, cred);
    }
    async exists(p, cred) {
        await this._mu.lock(p);
        const exists = await this._fs.exists(p, cred);
        this._mu.unlock(p);
        return exists;
    }
    existsSync(p, cred) {
        if (this._mu.isLocked(p)) {
            throw new Error('invalid sync call');
        }
        return this._fs.existsSync(p, cred);
    }
    async realpath(p, cred) {
        await this._mu.lock(p);
        const resolvedPath = await this._fs.realpath(p, cred);
        this._mu.unlock(p);
        return resolvedPath;
    }
    realpathSync(p, cred) {
        if (this._mu.isLocked(p)) {
            throw new Error('invalid sync call');
        }
        return this._fs.realpathSync(p, cred);
    }
    async truncate(p, len, cred) {
        await this._mu.lock(p);
        await this._fs.truncate(p, len, cred);
        this._mu.unlock(p);
    }
    truncateSync(p, len, cred) {
        if (this._mu.isLocked(p)) {
            throw new Error('invalid sync call');
        }
        return this._fs.truncateSync(p, len, cred);
    }
    async readFile(fname, flag, cred) {
        await this._mu.lock(fname);
        const data = await this._fs.readFile(fname, flag, cred);
        this._mu.unlock(fname);
        return data;
    }
    readFileSync(fname, flag, cred) {
        if (this._mu.isLocked(fname)) {
            throw new Error('invalid sync call');
        }
        return this._fs.readFileSync(fname, flag, cred);
    }
    async writeFile(fname, data, flag, mode, cred) {
        await this._mu.lock(fname);
        await this._fs.writeFile(fname, data, flag, mode, cred);
        this._mu.unlock(fname);
    }
    writeFileSync(fname, data, flag, mode, cred) {
        if (this._mu.isLocked(fname)) {
            throw new Error('invalid sync call');
        }
        return this._fs.writeFileSync(fname, data, flag, mode, cred);
    }
    async appendFile(fname, data, flag, mode, cred) {
        await this._mu.lock(fname);
        await this._fs.appendFile(fname, data, flag, mode, cred);
        this._mu.unlock(fname);
    }
    appendFileSync(fname, data, flag, mode, cred) {
        if (this._mu.isLocked(fname)) {
            throw new Error('invalid sync call');
        }
        return this._fs.appendFileSync(fname, data, flag, mode, cred);
    }
    async chmod(p, mode, cred) {
        await this._mu.lock(p);
        await this._fs.chmod(p, mode, cred);
        this._mu.unlock(p);
    }
    chmodSync(p, mode, cred) {
        if (this._mu.isLocked(p)) {
            throw new Error('invalid sync call');
        }
        return this._fs.chmodSync(p, mode, cred);
    }
    async chown(p, new_uid, new_gid, cred) {
        await this._mu.lock(p);
        await this._fs.chown(p, new_uid, new_gid, cred);
        this._mu.unlock(p);
    }
    chownSync(p, new_uid, new_gid, cred) {
        if (this._mu.isLocked(p)) {
            throw new Error('invalid sync call');
        }
        return this._fs.chownSync(p, new_uid, new_gid, cred);
    }
    async utimes(p, atime, mtime, cred) {
        await this._mu.lock(p);
        await this._fs.utimes(p, atime, mtime, cred);
        this._mu.unlock(p);
    }
    utimesSync(p, atime, mtime, cred) {
        if (this._mu.isLocked(p)) {
            throw new Error('invalid sync call');
        }
        return this._fs.utimesSync(p, atime, mtime, cred);
    }
    async link(srcpath, dstpath, cred) {
        await this._mu.lock(srcpath);
        await this._fs.link(srcpath, dstpath, cred);
        this._mu.unlock(srcpath);
    }
    linkSync(srcpath, dstpath, cred) {
        if (this._mu.isLocked(srcpath)) {
            throw new Error('invalid sync call');
        }
        return this._fs.linkSync(srcpath, dstpath, cred);
    }
    async symlink(srcpath, dstpath, type, cred) {
        await this._mu.lock(srcpath);
        await this._fs.symlink(srcpath, dstpath, type, cred);
        this._mu.unlock(srcpath);
    }
    symlinkSync(srcpath, dstpath, type, cred) {
        if (this._mu.isLocked(srcpath)) {
            throw new Error('invalid sync call');
        }
        return this._fs.symlinkSync(srcpath, dstpath, type, cred);
    }
    async readlink(p, cred) {
        await this._mu.lock(p);
        const linkString = await this._fs.readlink(p, cred);
        this._mu.unlock(p);
        return linkString;
    }
    readlinkSync(p, cred) {
        if (this._mu.isLocked(p)) {
            throw new Error('invalid sync call');
        }
        return this._fs.readlinkSync(p, cred);
    }
}
