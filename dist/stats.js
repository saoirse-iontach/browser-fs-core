import { Cred } from './cred.js';
import { S_IFDIR, S_IFLNK, S_IFMT, S_IFREG } from './emulation/constants.js';
/**
 * Indicates the type of the given file. Applied to 'mode'.
 */
export var FileType;
(function (FileType) {
    FileType[FileType["FILE"] = S_IFREG] = "FILE";
    FileType[FileType["DIRECTORY"] = S_IFDIR] = "DIRECTORY";
    FileType[FileType["SYMLINK"] = S_IFLNK] = "SYMLINK";
})(FileType = FileType || (FileType = {}));
/**
 * Common code used by both Stats and BigIntStats
 */
export class StatsCommon {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static Deserialize(data) {
        throw new ReferenceError('Called static abstract method: StatsCommon.Deserialize()');
    }
    get _typename() {
        return this._isBigint ? 'bigint' : 'number';
    }
    get _typename_inverse() {
        return this._isBigint ? 'number' : 'bigint';
    }
    _convert(arg) {
        return (this._isBigint ? BigInt(arg) : Number(arg));
    }
    get atime() {
        return new Date(Number(this.atimeMs));
    }
    get mtime() {
        return new Date(Number(this.mtimeMs));
    }
    get ctime() {
        return new Date(Number(this.ctimeMs));
    }
    get birthtime() {
        return new Date(Number(this.birthtimeMs));
    }
    /**
     * Provides information about a particular entry in the file system.
     * @param itemType Type of the item (FILE, DIRECTORY, SYMLINK, or SOCKET)
     * @param size Size of the item in bytes. For directories/symlinks,
     *   this is normally the size of the struct that represents the item.
     * @param mode Unix-style file mode (e.g. 0o644)
     * @param atimeMs time of last access, in milliseconds since epoch
     * @param mtimeMs time of last modification, in milliseconds since epoch
     * @param ctimeMs time of last time file status was changed, in milliseconds since epoch
     * @param uid the id of the user that owns the file
     * @param gid the id of the group that owns the file
     * @param birthtimeMs time of file creation, in milliseconds since epoch
     */
    constructor(itemType = FileType.FILE, size = -1, mode, atimeMs, mtimeMs, ctimeMs, uid, gid, birthtimeMs) {
        /**
         * ID of device containing file
         */
        this.dev = this._convert(0);
        /**
         * inode number
         */
        this.ino = this._convert(0);
        /**
         * device ID (if special file)
         */
        this.rdev = this._convert(0);
        /**
         * number of hard links
         */
        this.nlink = this._convert(1);
        /**
         * blocksize for file system I/O
         */
        this.blksize = this._convert(4096);
        /**
         * user ID of owner
         */
        this.uid = this._convert(0);
        /**
         * group ID of owner
         */
        this.gid = this._convert(0);
        /**
         * Some file systems stash data on stats objects.
         */
        this.fileData = null;
        const currentTime = Date.now();
        const resolveT = (v, def) => (typeof v == this._typename ? v : this._convert(typeof v == this._typename_inverse ? v : def));
        this.atimeMs = resolveT(atimeMs, currentTime);
        this.mtimeMs = resolveT(mtimeMs, currentTime);
        this.ctimeMs = resolveT(ctimeMs, currentTime);
        this.birthtimeMs = resolveT(birthtimeMs, currentTime);
        this.uid = resolveT(uid, 0);
        this.gid = resolveT(gid, 0);
        this.size = this._convert(size);
        if (mode) {
            this.mode = this._convert(mode);
        }
        else {
            switch (itemType) {
                case FileType.FILE:
                    this.mode = this._convert(0o644);
                    break;
                case FileType.DIRECTORY:
                default:
                    this.mode = this._convert(0o777);
            }
        }
        // number of 512B blocks allocated
        this.blocks = this._convert(Math.ceil(Number(size) / 512));
        // Check if mode also includes top-most bits, which indicate the file's
        // type.
        if ((this.mode & S_IFMT) == 0) {
            this.mode = (this.mode | this._convert(itemType));
        }
    }
    /**
     * @return [Boolean] True if this item is a file.
     */
    isFile() {
        return (this.mode & S_IFMT) === S_IFREG;
    }
    /**
     * @return [Boolean] True if this item is a directory.
     */
    isDirectory() {
        return (this.mode & S_IFMT) === S_IFDIR;
    }
    /**
     * @return [Boolean] True if this item is a symbolic link (only valid through lstat)
     */
    isSymbolicLink() {
        return (this.mode & S_IFMT) === S_IFLNK;
    }
    /**
     * Checks if a given user/group has access to this item
     * @param mode The request access as 4 bits (unused, read, write, execute)
     * @param uid The requesting UID
     * @param gid The requesting GID
     * @returns [Boolean] True if the request has access, false if the request does not
     */
    hasAccess(mode, cred) {
        if (cred.euid === 0 || cred.egid === 0) {
            //Running as root
            return true;
        }
        const perms = this.mode & ~S_IFMT;
        let uMode = 0xf, gMode = 0xf, wMode = 0xf;
        if (cred.euid == this.uid) {
            const uPerms = (0xf00 & perms) >> 8;
            uMode = (mode ^ uPerms) & mode;
        }
        if (cred.egid == this.gid) {
            const gPerms = (0xf0 & perms) >> 4;
            gMode = (mode ^ gPerms) & mode;
        }
        const wPerms = 0xf & perms;
        wMode = (mode ^ wPerms) & mode;
        /*
        Result = 0b0xxx (read, write, execute)
        If any bits are set that means the request does not have that permission.
    */
        const result = uMode & gMode & wMode;
        return !result;
    }
    /**
     * Convert the current stats object into a cred object
     */
    getCred(uid = Number(this.uid), gid = Number(this.gid)) {
        return new Cred(uid, gid, Number(this.uid), Number(this.gid), uid, gid);
    }
    /**
     * Change the mode of the file. We use this helper function to prevent messing
     * up the type of the file, which is encoded in mode.
     */
    chmod(mode) {
        this.mode = this._convert((this.mode & S_IFMT) | mode);
    }
    /**
     * Change the owner user/group of the file.
     * This function makes sure it is a valid UID/GID (that is, a 32 unsigned int)
     */
    chown(uid, gid) {
        uid = Number(uid);
        gid = Number(gid);
        if (!isNaN(uid) && 0 <= uid && uid < 2 ** 32) {
            this.uid = this._convert(uid);
        }
        if (!isNaN(gid) && 0 <= gid && gid < 2 ** 32) {
            this.gid = this._convert(gid);
        }
    }
    // We don't support the following types of files.
    isSocket() {
        return false;
    }
    isBlockDevice() {
        return false;
    }
    isCharacterDevice() {
        return false;
    }
    isFIFO() {
        return false;
    }
}
/**
 * Implementation of Node's `Stats`.
 *
 * Attribute descriptions are from `man 2 stat'
 * @see http://nodejs.org/api/fs.html#fs_class_fs_stats
 * @see http://man7.org/linux/man-pages/man2/stat.2.html
 */
export class Stats extends StatsCommon {
    constructor() {
        super(...arguments);
        this._isBigint = false;
    }
    /**
     * Clones the stats object.
     */
    static clone(s) {
        return new Stats(s.mode & S_IFMT, s.size, s.mode & ~S_IFMT, s.atimeMs, s.mtimeMs, s.ctimeMs, s.uid, s.gid, s.birthtimeMs);
    }
    static Deserialize(data) {
        const view = new DataView('buffer' in data ? data.buffer : data);
        const size = view.getUint32(0, true), mode = view.getUint32(4, true), atime = view.getFloat64(8, true), mtime = view.getFloat64(16, true), ctime = view.getFloat64(24, true), uid = view.getUint32(32, true), gid = view.getUint32(36, true);
        return new Stats(mode & S_IFMT, size, mode & ~S_IFMT, atime, mtime, ctime, uid, gid);
    }
    serialize() {
        const data = new Uint8Array(32), view = new DataView(data.buffer);
        view.setUint32(0, this.size, true);
        view.setUint32(4, this.mode, true);
        view.setFloat64(8, this.atime.getTime(), true);
        view.setFloat64(16, this.mtime.getTime(), true);
        view.setFloat64(24, this.ctime.getTime(), true);
        view.setUint32(32, this.uid, true);
        view.setUint32(36, this.gid, true);
        return data;
    }
}
Stats;
/**
 * Stats with bigint
 * @todo Implement with bigint instead of wrapping Stats
 */
export class BigIntStats extends StatsCommon {
    constructor() {
        super(...arguments);
        this._isBigint = true;
    }
    /**
     * Clone a stats object.
     */
    static clone(s) {
        return new BigIntStats(Number(s.mode) & S_IFMT, BigInt(s.size), BigInt(s.mode) & BigInt(~S_IFMT), BigInt(s.atimeMs), BigInt(s.mtimeMs), BigInt(s.ctimeMs), BigInt(s.uid), BigInt(s.gid), BigInt(s.birthtimeMs));
    }
    static Deserialize(data) {
        const view = new DataView('buffer' in data ? data.buffer : data);
        const size = view.getBigUint64(0, true), mode = view.getBigUint64(4, true), atime = view.getFloat64(8, true), mtime = view.getFloat64(16, true), ctime = view.getFloat64(24, true), uid = view.getBigUint64(32, true), gid = view.getBigUint64(36, true);
        return new Stats(Number(mode) & S_IFMT, size, mode & BigInt(~S_IFMT), atime, mtime, ctime, uid, gid);
    }
    serialize() {
        const data = new Uint8Array(32), view = new DataView(data.buffer);
        view.setBigUint64(0, this.size, true);
        view.setBigUint64(4, this.mode, true);
        view.setFloat64(8, this.atime.getTime(), true);
        view.setFloat64(16, this.mtime.getTime(), true);
        view.setFloat64(24, this.ctime.getTime(), true);
        view.setBigUint64(32, this.uid, true);
        view.setBigUint64(36, this.gid, true);
        return data;
    }
}
BigIntStats;
