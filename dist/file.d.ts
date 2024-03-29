import { Stats } from './stats.js';
import { FileSystem } from './filesystem.js';
export declare enum ActionType {
    NOP = 0,
    THROW_EXCEPTION = 1,
    TRUNCATE_FILE = 2,
    CREATE_FILE = 3
}
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
export declare class FileFlag {
    private static flagCache;
    private static validFlagStrs;
    /**
     * Get an object representing the given file flag.
     * @param flag The string or number representing the flag
     * @return The FileFlag object representing the flag
     * @throw when the flag string is invalid
     */
    static getFileFlag(flag: string | number): FileFlag;
    private flagStr;
    /**
     * This should never be called directly.
     * @param flag The string or number representing the flag
     * @throw when the flag is invalid
     */
    constructor(flag: string | number);
    /**
     * @param flag The number representing the flag
     * @return The string representing the flag
     * @throw when the flag number is invalid
     */
    static StringFromNumber(flag: number): string;
    /**
     * Get the underlying flag string for this flag.
     */
    getFlagString(): string;
    /**
     * Get the equivalent mode (0b0xxx: read, write, execute)
     * Note: Execute will always be 0
     */
    getMode(): number;
    /**
     * Returns true if the file is readable.
     */
    isReadable(): boolean;
    /**
     * Returns true if the file is writeable.
     */
    isWriteable(): boolean;
    /**
     * Returns true if the file mode should truncate.
     */
    isTruncating(): boolean;
    /**
     * Returns true if the file is appendable.
     */
    isAppendable(): boolean;
    /**
     * Returns true if the file is open in synchronous mode.
     */
    isSynchronous(): boolean;
    /**
     * Returns true if the file is open in exclusive mode.
     */
    isExclusive(): boolean;
    /**
     * Returns one of the static fields on this object that indicates the
     * appropriate response to the path existing.
     */
    pathExistsAction(): ActionType;
    /**
     * Returns one of the static fields on this object that indicates the
     * appropriate response to the path not existing.
     */
    pathNotExistsAction(): ActionType;
}
export interface File {
    /**
     * **Core**: Get the current file position.
     */
    getPos(): number | undefined;
    /**
     * **Core**: Asynchronous `stat`.
     */
    stat(): Promise<Stats>;
    /**
     * **Core**: Synchronous `stat`.
     */
    statSync(): Stats;
    /**
     * **Core**: Asynchronous close.
     */
    close(): Promise<void>;
    /**
     * **Core**: Synchronous close.
     */
    closeSync(): void;
    /**
     * **Core**: Asynchronous truncate.
     */
    truncate(len: number): Promise<void>;
    /**
     * **Core**: Synchronous truncate.
     */
    truncateSync(len: number): void;
    /**
     * **Core**: Asynchronous sync.
     */
    sync(): Promise<void>;
    /**
     * **Core**: Synchronous sync.
     */
    syncSync(): void;
    /**
     * **Core**: Write buffer to the file.
     * Note that it is unsafe to use fs.write multiple times on the same file
     * without waiting for the callback.
     * @param buffer Uint8Array containing the data to write to
     *  the file.
     * @param offset Offset in the buffer to start reading data from.
     * @param length The amount of bytes to write to the file.
     * @param position Offset from the beginning of the file where this
     *   data should be written. If position is null, the data will be written at
     *   the current position.
     * @returns Promise resolving to the new length of the buffer
     */
    write(buffer: Uint8Array, offset: number, length: number, position: number | null): Promise<number>;
    /**
     * **Core**: Write buffer to the file.
     * Note that it is unsafe to use fs.writeSync multiple times on the same file
     * without waiting for it to return.
     * @param buffer Uint8Array containing the data to write to
     *  the file.
     * @param offset Offset in the buffer to start reading data from.
     * @param length The amount of bytes to write to the file.
     * @param position Offset from the beginning of the file where this
     *   data should be written. If position is null, the data will be written at
     *   the current position.
     */
    writeSync(buffer: Uint8Array, offset: number, length: number, position: number | null): number;
    /**
     * **Core**: Read data from the file.
     * @param buffer The buffer that the data will be
     *   written to.
     * @param offset The offset within the buffer where writing will
     *   start.
     * @param length An integer specifying the number of bytes to read.
     * @param position An integer specifying where to begin reading from
     *   in the file. If position is null, data will be read from the current file
     *   position.
     * @returns Promise resolving to the new length of the buffer
     */
    read(buffer: Uint8Array, offset: number, length: number, position: number | null): Promise<{
        bytesRead: number;
        buffer: Uint8Array;
    }>;
    /**
     * **Core**: Read data from the file.
     * @param buffer The buffer that the data will be written to.
     * @param offset The offset within the buffer where writing will start.
     * @param length An integer specifying the number of bytes to read.
     * @param position An integer specifying where to begin reading from
     *   in the file. If position is null, data will be read from the current file
     *   position.
     */
    readSync(buffer: Uint8Array, offset: number, length: number, position: number): number;
    /**
     * **Supplementary**: Asynchronous `datasync`.
     *
     * Default implementation maps to `sync`.
     */
    datasync(): Promise<void>;
    /**
     * **Supplementary**: Synchronous `datasync`.
     *
     * Default implementation maps to `syncSync`.
     */
    datasyncSync(): void;
    /**
     * **Optional**: Asynchronous `chown`.
     */
    chown(uid: number, gid: number): Promise<void>;
    /**
     * **Optional**: Synchronous `chown`.
     */
    chownSync(uid: number, gid: number): void;
    /**
     * **Optional**: Asynchronous `fchmod`.
     */
    chmod(mode: number): Promise<void>;
    /**
     * **Optional**: Synchronous `fchmod`.
     */
    chmodSync(mode: number): void;
    /**
     * **Optional**: Change the file timestamps of the file.
     */
    utimes(atime: Date, mtime: Date): Promise<void>;
    /**
     * **Optional**: Change the file timestamps of the file.
     */
    utimesSync(atime: Date, mtime: Date): void;
}
/**
 * Base class that contains shared implementations of functions for the file
 * object.
 */
export declare class BaseFile {
    sync(): Promise<void>;
    syncSync(): void;
    datasync(): Promise<void>;
    datasyncSync(): void;
    chown(uid: number, gid: number): Promise<void>;
    chownSync(uid: number, gid: number): void;
    chmod(mode: number): Promise<void>;
    chmodSync(mode: number): void;
    utimes(atime: Date, mtime: Date): Promise<void>;
    utimesSync(atime: Date, mtime: Date): void;
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
export declare class PreloadFile<T extends FileSystem> extends BaseFile {
    protected _fs: T;
    protected _pos: number;
    protected _path: string;
    protected _stat: Stats;
    protected _flag: FileFlag;
    protected _buffer: Uint8Array;
    protected _dirty: boolean;
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
    constructor(_fs: T, _path: string, _flag: FileFlag, _stat: Stats, contents?: Uint8Array);
    /**
     * NONSTANDARD: Get the underlying buffer for this file. !!DO NOT MUTATE!! Will mess up dirty tracking.
     */
    getBuffer(): Uint8Array;
    /**
     * NONSTANDARD: Get underlying stats for this file. !!DO NOT MUTATE!!
     */
    getStats(): Stats;
    getFlag(): FileFlag;
    /**
     * Get the path to this file.
     * @return [String] The path to the file.
     */
    getPath(): string;
    /**
     * Get the current file position.
     *
     * We emulate the following bug mentioned in the Node documentation:
     * > On Linux, positional writes don't work when the file is opened in append
     *   mode. The kernel ignores the position argument and always appends the data
     *   to the end of the file.
     * @return [Number] The current file position.
     */
    getPos(): number;
    /**
     * Advance the current file position by the indicated number of positions.
     * @param [Number] delta
     */
    advancePos(delta: number): number;
    /**
     * Set the file position.
     * @param [Number] newPos
     */
    setPos(newPos: number): number;
    /**
     * **Core**: Asynchronous sync. Must be implemented by subclasses of this
     * class.
     * @param [Function(BrowserFS.ApiError)] cb
     */
    sync(): Promise<void>;
    /**
     * **Core**: Synchronous sync.
     */
    syncSync(): void;
    /**
     * **Core**: Asynchronous close. Must be implemented by subclasses of this
     * class.
     * @param [Function(BrowserFS.ApiError)] cb
     */
    close(): Promise<void>;
    /**
     * **Core**: Synchronous close.
     */
    closeSync(): void;
    /**
     * Asynchronous `stat`.
     * @param [Function(BrowserFS.ApiError, BrowserFS.node.fs.Stats)] cb
     */
    stat(): Promise<Stats>;
    /**
     * Synchronous `stat`.
     */
    statSync(): Stats;
    /**
     * Asynchronous truncate.
     * @param [Number] len
     * @param [Function(BrowserFS.ApiError)] cb
     */
    truncate(len: number): Promise<void>;
    /**
     * Synchronous truncate.
     * @param [Number] len
     */
    truncateSync(len: number): void;
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
    write(buffer: Uint8Array, offset: number, length: number, position: number): Promise<number>;
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
    writeSync(buffer: Uint8Array, offset: number, length: number, position: number): number;
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
    read(buffer: Uint8Array, offset: number, length: number, position: number): Promise<{
        bytesRead: number;
        buffer: Uint8Array;
    }>;
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
    readSync(buffer: Uint8Array, offset: number, length: number, position: number): number;
    /**
     * Asynchronous `fchmod`.
     * @param [Number|String] mode
     */
    chmod(mode: number): Promise<void>;
    /**
     * Synchronous `fchmod`.
     * @param [Number] mode
     */
    chmodSync(mode: number): void;
    /**
     * Asynchronous `fchown`.
     * @param [Number] uid
     * @param [Number] gid
     */
    chown(uid: number, gid: number): Promise<void>;
    /**
     * Synchronous `fchown`.
     * @param [Number] uid
     * @param [Number] gid
     */
    chownSync(uid: number, gid: number): void;
    protected isDirty(): boolean;
    /**
     * Resets the dirty bit. Should only be called after a sync has completed successfully.
     */
    protected resetDirty(): void;
}
/**
 * File class for the InMemory and XHR file systems.
 * Doesn't sync to anything, so it works nicely for memory-only files.
 */
export declare class NoSyncFile<T extends FileSystem> extends PreloadFile<T> implements File {
    constructor(_fs: T, _path: string, _flag: FileFlag, _stat: Stats, contents?: Uint8Array);
    /**
     * Asynchronous sync. Doesn't do anything, simply calls the cb.
     * @param [Function(BrowserFS.ApiError)] cb
     */
    sync(): Promise<void>;
    /**
     * Synchronous sync. Doesn't do anything.
     */
    syncSync(): void;
    /**
     * Asynchronous close. Doesn't do anything, simply calls the cb.
     * @param [Function(BrowserFS.ApiError)] cb
     */
    close(): Promise<void>;
    /**
     * Synchronous close. Doesn't do anything.
     */
    closeSync(): void;
}
