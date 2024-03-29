import { decode, encode } from './utils.js';
/**
 * Standard libc error codes. More will be added to this enum and ErrorStrings as they are
 * needed.
 * @url http://www.gnu.org/software/libc/manual/html_node/Error-Codes.html
 */
export var ErrorCode;
(function (ErrorCode) {
    ErrorCode[ErrorCode["EPERM"] = 1] = "EPERM";
    ErrorCode[ErrorCode["ENOENT"] = 2] = "ENOENT";
    ErrorCode[ErrorCode["EIO"] = 5] = "EIO";
    ErrorCode[ErrorCode["EBADF"] = 9] = "EBADF";
    ErrorCode[ErrorCode["EACCES"] = 13] = "EACCES";
    ErrorCode[ErrorCode["EBUSY"] = 16] = "EBUSY";
    ErrorCode[ErrorCode["EEXIST"] = 17] = "EEXIST";
    ErrorCode[ErrorCode["ENOTDIR"] = 20] = "ENOTDIR";
    ErrorCode[ErrorCode["EISDIR"] = 21] = "EISDIR";
    ErrorCode[ErrorCode["EINVAL"] = 22] = "EINVAL";
    ErrorCode[ErrorCode["EFBIG"] = 27] = "EFBIG";
    ErrorCode[ErrorCode["ENOSPC"] = 28] = "ENOSPC";
    ErrorCode[ErrorCode["EROFS"] = 30] = "EROFS";
    ErrorCode[ErrorCode["ENOTEMPTY"] = 39] = "ENOTEMPTY";
    ErrorCode[ErrorCode["ENOTSUP"] = 95] = "ENOTSUP";
})(ErrorCode = ErrorCode || (ErrorCode = {}));
/**
 * Strings associated with each error code.
 * @internal
 */
export const ErrorStrings = {
    [ErrorCode.EPERM]: 'Operation not permitted.',
    [ErrorCode.ENOENT]: 'No such file or directory.',
    [ErrorCode.EIO]: 'Input/output error.',
    [ErrorCode.EBADF]: 'Bad file descriptor.',
    [ErrorCode.EACCES]: 'Permission denied.',
    [ErrorCode.EBUSY]: 'Resource busy or locked.',
    [ErrorCode.EEXIST]: 'File exists.',
    [ErrorCode.ENOTDIR]: 'File is not a directory.',
    [ErrorCode.EISDIR]: 'File is a directory.',
    [ErrorCode.EINVAL]: 'Invalid argument.',
    [ErrorCode.EFBIG]: 'File is too big.',
    [ErrorCode.ENOSPC]: 'No space left on disk.',
    [ErrorCode.EROFS]: 'Cannot modify a read-only file system.',
    [ErrorCode.ENOTEMPTY]: 'Directory is not empty.',
    [ErrorCode.ENOTSUP]: 'Operation is not supported.',
};
/**
 * Represents a BrowserFS error. Passed back to applications after a failed
 * call to the BrowserFS API.
 */
export class ApiError extends Error {
    static fromJSON(json) {
        const err = new ApiError(json.errno, json.message, json.path);
        err.code = json.code;
        err.stack = json.stack;
        return err;
    }
    /**
     * Creates an ApiError object from a buffer.
     */
    static Derserialize(data, i = 0) {
        const view = new DataView('buffer' in data ? data.buffer : data);
        const dataText = decode(view.buffer.slice(i + 4, i + 4 + view.getUint32(i, true)));
        return ApiError.fromJSON(JSON.parse(dataText));
    }
    static FileError(code, p) {
        return new ApiError(code, ErrorStrings[code], p);
    }
    static EACCES(path) {
        return this.FileError(ErrorCode.EACCES, path);
    }
    static ENOENT(path) {
        return this.FileError(ErrorCode.ENOENT, path);
    }
    static EEXIST(path) {
        return this.FileError(ErrorCode.EEXIST, path);
    }
    static EISDIR(path) {
        return this.FileError(ErrorCode.EISDIR, path);
    }
    static ENOTDIR(path) {
        return this.FileError(ErrorCode.ENOTDIR, path);
    }
    static EPERM(path) {
        return this.FileError(ErrorCode.EPERM, path);
    }
    static ENOTEMPTY(path) {
        return this.FileError(ErrorCode.ENOTEMPTY, path);
    }
    /**
     * Represents a BrowserFS error. Passed back to applications after a failed
     * call to the BrowserFS API.
     *
     * Error codes mirror those returned by regular Unix file operations, which is
     * what Node returns.
     * @constructor ApiError
     * @param type The type of the error.
     * @param [message] A descriptive error message.
     */
    constructor(type, message = ErrorStrings[type], path) {
        super(message);
        // Unsupported.
        this.syscall = '';
        this.errno = type;
        this.code = ErrorCode[type];
        this.path = path;
        this.message = `Error: ${this.code}: ${message}${this.path ? `, '${this.path}'` : ''}`;
    }
    /**
     * @return A friendly error message.
     */
    toString() {
        return this.message;
    }
    toJSON() {
        return {
            errno: this.errno,
            code: this.code,
            path: this.path,
            stack: this.stack,
            message: this.message,
        };
    }
    /**
     * Writes the API error into a buffer.
     */
    serialize(data = new Uint8Array(this.bufferSize()), i = 0) {
        const view = new DataView('buffer' in data ? data.buffer : data), buffer = new Uint8Array(view.buffer);
        const newData = encode(JSON.stringify(this.toJSON()));
        buffer.set(newData);
        view.setUint32(i, newData.byteLength, true);
        return buffer;
    }
    /**
     * The size of the API error in buffer-form in bytes.
     */
    bufferSize() {
        // 4 bytes for string length.
        return 4 + JSON.stringify(this.toJSON()).length;
    }
}
