import { ApiError, ErrorCode } from './ApiError.js';
import { Stats } from './stats.js';
import { O_RDONLY, O_WRONLY, O_RDWR, O_CREAT, O_EXCL, O_TRUNC, O_APPEND, O_SYNC } from './emulation/constants.js';
export var ActionType;
(function (ActionType) {
    // Indicates that the code should not do anything.
    ActionType[ActionType["NOP"] = 0] = "NOP";
    // Indicates that the code should throw an exception.
    ActionType[ActionType["THROW_EXCEPTION"] = 1] = "THROW_EXCEPTION";
    // Indicates that the code should truncate the file, but only if it is a file.
    ActionType[ActionType["TRUNCATE_FILE"] = 2] = "TRUNCATE_FILE";
    // Indicates that the code should create the file.
    ActionType[ActionType["CREATE_FILE"] = 3] = "CREATE_FILE";
})(ActionType = ActionType || (ActionType = {}));
/**
 * Represents one of the following file flags. A convenience object.
 *
 * * `'r'` - Open file for reading. An exception occurs if the file does not exist.
 * * `'r+'` - Open file for reading and writing. An exception occurs if the file does not exist.
 * * `'rs'` - Open file for reading in synchronous mode. Instructs the filesystem to not cache writes.
 * * `'rs+'` - Open file for reading and writing, and opens the file in synchronous mode.
 * * `'w'` - Open file for writing. The file is created (if it does not exist) or truncated (if it exists).
 * * `'wx'` - Like 'w' but opens the file in exclusive mode.
 * * `'w+'` - Open file for reading and writing. The file is created (if it does not exist) or truncated (if it exists).
 * * `'wx+'` - Like 'w+' but opens the file in exclusive mode.
 * * `'a'` - Open file for appending. The file is created if it does not exist.
 * * `'ax'` - Like 'a' but opens the file in exclusive mode.
 * * `'a+'` - Open file for reading and appending. The file is created if it does not exist.
 * * `'ax+'` - Like 'a+' but opens the file in exclusive mode.
 *
 * Exclusive mode ensures that the file path is newly created.
 */
export class FileFlag {
    /**
     * Get an object representing the given file flag.
     * @param flag The string or number representing the flag
     * @return The FileFlag object representing the flag
     * @throw when the flag string is invalid
     */
    static getFileFlag(flag) {
        // Check cache first.
        if (!FileFlag.flagCache.has(flag)) {
            FileFlag.flagCache.set(flag, new FileFlag(flag));
        }
        return FileFlag.flagCache.get(flag);
    }
    /**
     * This should never be called directly.
     * @param flag The string or number representing the flag
     * @throw when the flag is invalid
     */
    constructor(flag) {
        if (typeof flag === 'number') {
            flag = FileFlag.StringFromNumber(flag);
        }
        if (FileFlag.validFlagStrs.indexOf(flag) < 0) {
            throw new ApiError(ErrorCode.EINVAL, 'Invalid flag string: ' + flag);
        }
        this.flagStr = flag;
    }
    /**
     * @param flag The number representing the flag
     * @return The string representing the flag
     * @throw when the flag number is invalid
     */
    static StringFromNumber(flag) {
        // based on https://github.com/nodejs/node/blob/abbdc3efaa455e6c907ebef5409ac8b0f222f969/lib/internal/fs/utils.js#L619
        switch (flag) {
            case O_RDONLY:
                return 'r';
            case O_RDONLY | O_SYNC:
                return 'rs';
            case O_RDWR:
                return 'r+';
            case O_RDWR | O_SYNC:
                return 'rs+';
            case O_TRUNC | O_CREAT | O_WRONLY:
                return 'w';
            case O_TRUNC | O_CREAT | O_WRONLY | O_EXCL:
                return 'wx';
            case O_TRUNC | O_CREAT | O_RDWR:
                return 'w+';
            case O_TRUNC | O_CREAT | O_RDWR | O_EXCL:
                return 'wx+';
            case O_APPEND | O_CREAT | O_WRONLY:
                return 'a';
            case O_APPEND | O_CREAT | O_WRONLY | O_EXCL:
                return 'ax';
            case O_APPEND | O_CREAT | O_RDWR:
                return 'a+';
            case O_APPEND | O_CREAT | O_RDWR | O_EXCL:
                return 'ax+';
            default:
                throw new ApiError(ErrorCode.EINVAL, 'Invalid flag number: ' + flag);
        }
    }
    /**
     * Get the underlying flag string for this flag.
     */
    getFlagString() {
        return this.flagStr;
    }
    /**
     * Get the equivalent mode (0b0xxx: read, write, execute)
     * Note: Execute will always be 0
     */
    getMode() {
        let mode = 0;
        mode <<= 1;
        mode += +this.isReadable();
        mode <<= 1;
        mode += +this.isWriteable();
        mode <<= 1;
        return mode;
    }
    /**
     * Returns true if the file is readable.
     */
    isReadable() {
        return this.flagStr.indexOf('r') !== -1 || this.flagStr.indexOf('+') !== -1;
    }
    /**
     * Returns true if the file is writeable.
     */
    isWriteable() {
        return this.flagStr.indexOf('w') !== -1 || this.flagStr.indexOf('a') !== -1 || this.flagStr.indexOf('+') !== -1;
    }
    /**
     * Returns true if the file mode should truncate.
     */
    isTruncating() {
        return this.flagStr.indexOf('w') !== -1;
    }
    /**
     * Returns true if the file is appendable.
     */
    isAppendable() {
        return this.flagStr.indexOf('a') !== -1;
    }
    /**
     * Returns true if the file is open in synchronous mode.
     */
    isSynchronous() {
        return this.flagStr.indexOf('s') !== -1;
    }
    /**
     * Returns true if the file is open in exclusive mode.
     */
    isExclusive() {
        return this.flagStr.indexOf('x') !== -1;
    }
    /**
     * Returns one of the static fields on this object that indicates the
     * appropriate response to the path existing.
     */
    pathExistsAction() {
        if (this.isExclusive()) {
            return ActionType.THROW_EXCEPTION;
        }
        else if (this.isTruncating()) {
            return ActionType.TRUNCATE_FILE;
        }
        else {
            return ActionType.NOP;
        }
    }
    /**
     * Returns one of the static fields on this object that indicates the
     * appropriate response to the path not existing.
     */
    pathNotExistsAction() {
        if ((this.isWriteable() || this.isAppendable()) && this.flagStr !== 'r+') {
            return ActionType.CREATE_FILE;
        }
        else {
            return ActionType.THROW_EXCEPTION;
        }
    }
}
// Contains cached FileMode instances.
FileFlag.flagCache = new Map();
// Array of valid mode strings.
FileFlag.validFlagStrs = ['r', 'r+', 'rs', 'rs+', 'w', 'wx', 'w+', 'wx+', 'a', 'ax', 'a+', 'ax+'];
/**
 * Base class that contains shared implementations of functions for the file
 * object.
 */
export class BaseFile {
    async sync() {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    syncSync() {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    async datasync() {
        return this.sync();
    }
    datasyncSync() {
        return this.syncSync();
    }
    async chown(uid, gid) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    chownSync(uid, gid) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    async chmod(mode) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    chmodSync(mode) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    async utimes(atime, mtime) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    utimesSync(atime, mtime) {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
}
/**
 * An implementation of the File interface that operates on a file that is
 * completely in-memory. PreloadFiles are backed by a Uint8Array.
 *
 * This is also an abstract class, as it lacks an implementation of 'sync' and
 * 'close'. Each filesystem that wishes to use this file representation must
 * extend this class and implement those two methods.
 * @todo 'close' lever that disables functionality once closed.
 */
export class PreloadFile extends BaseFile {
    /**
     * Creates a file with the given path and, optionally, the given contents. Note
     * that, if contents is specified, it will be mutated by the file!
     * @param _fs The file system that created the file.
     * @param _path
     * @param _mode The mode that the file was opened using.
     *   Dictates permissions and where the file pointer starts.
     * @param _stat The stats object for the given file.
     *   PreloadFile will mutate this object. Note that this object must contain
     *   the appropriate mode that the file was opened as.
     * @param contents A buffer containing the entire
     *   contents of the file. PreloadFile will mutate this buffer. If not
     *   specified, we assume it is a new file.
     */
    constructor(_fs, _path, _flag, _stat, contents) {
        super();
        this._pos = 0;
        this._dirty = false;
        this._fs = _fs;
        this._path = _path;
        this._flag = _flag;
        this._stat = _stat;
        this._buffer = contents ? contents : new Uint8Array(0);
        // Note: This invariant is *not* maintained once the file starts getting
        // modified.
        // Note: Only actually matters if file is readable, as writeable modes may
        // truncate/append to file.
        if (this._stat.size !== this._buffer.length && this._flag.isReadable()) {
            throw new Error(`Invalid buffer: Uint8Array is ${this._buffer.length} long, yet Stats object specifies that file is ${this._stat.size} long.`);
        }
    }
    /**
     * NONSTANDARD: Get the underlying buffer for this file. !!DO NOT MUTATE!! Will mess up dirty tracking.
     */
    getBuffer() {
        return this._buffer;
    }
    /**
     * NONSTANDARD: Get underlying stats for this file. !!DO NOT MUTATE!!
     */
    getStats() {
        return this._stat;
    }
    getFlag() {
        return this._flag;
    }
    /**
     * Get the path to this file.
     * @return [String] The path to the file.
     */
    getPath() {
        return this._path;
    }
    /**
     * Get the current file position.
     *
     * We emulate the following bug mentioned in the Node documentation:
     * > On Linux, positional writes don't work when the file is opened in append
     *   mode. The kernel ignores the position argument and always appends the data
     *   to the end of the file.
     * @return [Number] The current file position.
     */
    getPos() {
        if (this._flag.isAppendable()) {
            return this._stat.size;
        }
        return this._pos;
    }
    /**
     * Advance the current file position by the indicated number of positions.
     * @param [Number] delta
     */
    advancePos(delta) {
        return (this._pos += delta);
    }
    /**
     * Set the file position.
     * @param [Number] newPos
     */
    setPos(newPos) {
        return (this._pos = newPos);
    }
    /**
     * **Core**: Asynchronous sync. Must be implemented by subclasses of this
     * class.
     * @param [Function(BrowserFS.ApiError)] cb
     */
    async sync() {
        this.syncSync();
    }
    /**
     * **Core**: Synchronous sync.
     */
    syncSync() {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    /**
     * **Core**: Asynchronous close. Must be implemented by subclasses of this
     * class.
     * @param [Function(BrowserFS.ApiError)] cb
     */
    async close() {
        this.closeSync();
    }
    /**
     * **Core**: Synchronous close.
     */
    closeSync() {
        throw new ApiError(ErrorCode.ENOTSUP);
    }
    /**
     * Asynchronous `stat`.
     * @param [Function(BrowserFS.ApiError, BrowserFS.node.fs.Stats)] cb
     */
    async stat() {
        return Stats.clone(this._stat);
    }
    /**
     * Synchronous `stat`.
     */
    statSync() {
        return Stats.clone(this._stat);
    }
    /**
     * Asynchronous truncate.
     * @param [Number] len
     * @param [Function(BrowserFS.ApiError)] cb
     */
    truncate(len) {
        this.truncateSync(len);
        if (this._flag.isSynchronous() && !this._fs.metadata.synchronous) {
            return this.sync();
        }
    }
    /**
     * Synchronous truncate.
     * @param [Number] len
     */
    truncateSync(len) {
        this._dirty = true;
        if (!this._flag.isWriteable()) {
            throw new ApiError(ErrorCode.EPERM, 'File not opened with a writeable mode.');
        }
        this._stat.mtimeMs = Date.now();
        if (len > this._buffer.length) {
            const buf = new Uint8Array(len - this._buffer.length);
            // Write will set @_stat.size for us.
            this.writeSync(buf, 0, buf.length, this._buffer.length);
            if (this._flag.isSynchronous() && this._fs.metadata.synchronous) {
                this.syncSync();
            }
            return;
        }
        this._stat.size = len;
        // Truncate buffer to 'len'.
        this._buffer = this._buffer.subarray(0, len);
        if (this._flag.isSynchronous() && this._fs.metadata.synchronous) {
            this.syncSync();
        }
    }
    /**
     * Write buffer to the file.
     * Note that it is unsafe to use fs.write multiple times on the same file
     * without waiting for the callback.
     * @param [BrowserFS.node.Uint8Array] buffer Uint8Array containing the data to write to
     *  the file.
     * @param [Number] offset Offset in the buffer to start reading data from.
     * @param [Number] length The amount of bytes to write to the file.
     * @param [Number] position Offset from the beginning of the file where this
     *   data should be written. If position is null, the data will be written at
     *   the current position.
     * @param [Function(BrowserFS.ApiError, Number, BrowserFS.node.Uint8Array)]
     *   cb The number specifies the number of bytes written into the file.
     */
    async write(buffer, offset, length, position) {
        return this.writeSync(buffer, offset, length, position);
    }
    /**
     * Write buffer to the file.
     * Note that it is unsafe to use fs.writeSync multiple times on the same file
     * without waiting for the callback.
     * @param [BrowserFS.node.Uint8Array] buffer Uint8Array containing the data to write to
     *  the file.
     * @param [Number] offset Offset in the buffer to start reading data from.
     * @param [Number] length The amount of bytes to write to the file.
     * @param [Number] position Offset from the beginning of the file where this
     *   data should be written. If position is null, the data will be written at
     *   the current position.
     * @return [Number]
     */
    writeSync(buffer, offset, length, position) {
        this._dirty = true;
        if (position === undefined || position === null) {
            position = this.getPos();
        }
        if (!this._flag.isWriteable()) {
            throw new ApiError(ErrorCode.EPERM, 'File not opened with a writeable mode.');
        }
        const endFp = position + length;
        if (endFp > this._stat.size) {
            this._stat.size = endFp;
            if (endFp > this._buffer.length) {
                // Extend the buffer!
                const newBuffer = new Uint8Array(endFp);
                newBuffer.set(this._buffer);
                this._buffer = newBuffer;
            }
        }
        this._buffer.set(buffer.slice(offset, offset + length), position);
        const len = this._buffer.length;
        this._stat.mtimeMs = Date.now();
        if (this._flag.isSynchronous()) {
            this.syncSync();
            return len;
        }
        this.setPos(position + len);
        return length;
    }
    /**
     * Read data from the file.
     * @param [BrowserFS.node.Uint8Array] buffer The buffer that the data will be
     *   written to.
     * @param [Number] offset The offset within the buffer where writing will
     *   start.
     * @param [Number] length An integer specifying the number of bytes to read.
     * @param [Number] position An integer specifying where to begin reading from
     *   in the file. If position is null, data will be read from the current file
     *   position.
     * @param [Function(BrowserFS.ApiError, Number, BrowserFS.node.Uint8Array)] cb The
     *   number is the number of bytes read
     */
    async read(buffer, offset, length, position) {
        return { bytesRead: this.readSync(buffer, offset, length, position), buffer };
    }
    /**
     * Read data from the file.
     * @param [BrowserFS.node.Uint8Array] buffer The buffer that the data will be
     *   written to.
     * @param [Number] offset The offset within the buffer where writing will
     *   start.
     * @param [Number] length An integer specifying the number of bytes to read.
     * @param [Number] position An integer specifying where to begin reading from
     *   in the file. If position is null, data will be read from the current file
     *   position.
     * @return [Number]
     */
    readSync(buffer, offset, length, position) {
        if (!this._flag.isReadable()) {
            throw new ApiError(ErrorCode.EPERM, 'File not opened with a readable mode.');
        }
        if (position === undefined || position === null) {
            position = this.getPos();
        }
        const endRead = position + length;
        if (endRead > this._stat.size) {
            length = this._stat.size - position;
        }
        buffer.set(this._buffer.slice(offset, offset + length), position);
        this._stat.atimeMs = Date.now();
        this._pos = position + length;
        return length;
    }
    /**
     * Asynchronous `fchmod`.
     * @param [Number|String] mode
     */
    async chmod(mode) {
        this.chmodSync(mode);
    }
    /**
     * Synchronous `fchmod`.
     * @param [Number] mode
     */
    chmodSync(mode) {
        if (!this._fs.metadata.supportsProperties) {
            throw new ApiError(ErrorCode.ENOTSUP);
        }
        this._dirty = true;
        this._stat.chmod(mode);
        this.syncSync();
    }
    /**
     * Asynchronous `fchown`.
     * @param [Number] uid
     * @param [Number] gid
     */
    async chown(uid, gid) {
        this.chownSync(uid, gid);
    }
    /**
     * Synchronous `fchown`.
     * @param [Number] uid
     * @param [Number] gid
     */
    chownSync(uid, gid) {
        if (!this._fs.metadata.supportsProperties) {
            throw new ApiError(ErrorCode.ENOTSUP);
        }
        this._dirty = true;
        this._stat.chown(uid, gid);
        this.syncSync();
    }
    isDirty() {
        return this._dirty;
    }
    /**
     * Resets the dirty bit. Should only be called after a sync has completed successfully.
     */
    resetDirty() {
        this._dirty = false;
    }
}
/**
 * File class for the InMemory and XHR file systems.
 * Doesn't sync to anything, so it works nicely for memory-only files.
 */
export class NoSyncFile extends PreloadFile {
    constructor(_fs, _path, _flag, _stat, contents) {
        super(_fs, _path, _flag, _stat, contents);
    }
    /**
     * Asynchronous sync. Doesn't do anything, simply calls the cb.
     * @param [Function(BrowserFS.ApiError)] cb
     */
    async sync() {
        return;
    }
    /**
     * Synchronous sync. Doesn't do anything.
     */
    syncSync() {
        // NOP.
    }
    /**
     * Asynchronous close. Doesn't do anything, simply calls the cb.
     * @param [Function(BrowserFS.ApiError)] cb
     */
    async close() {
        return;
    }
    /**
     * Synchronous close. Doesn't do anything.
     */
    closeSync() {
        // NOP.
    }
}
