import { Stats, FileType } from './stats.js';
import { decode, encode } from './utils.js';
/**
 * Generic inode definition that can easily be serialized.
 */
export default class Inode {
    /**
     * Converts the buffer into an Inode.
     */
    static Deserialize(data) {
        const view = new DataView('buffer' in data ? data.buffer : data);
        return new Inode(decode(view.buffer.slice(38)), view.getUint32(0, true), view.getUint16(4, true), view.getFloat64(6, true), view.getFloat64(14, true), view.getFloat64(22, true), view.getUint32(30, true), view.getUint32(34, true));
    }
    constructor(id, size, mode, atime, mtime, ctime, uid, gid) {
        this.id = id;
        this.size = size;
        this.mode = mode;
        this.atime = atime;
        this.mtime = mtime;
        this.ctime = ctime;
        this.uid = uid;
        this.gid = gid;
    }
    /**
     * Handy function that converts the Inode to a Node Stats object.
     */
    toStats() {
        return new Stats((this.mode & 0xf000) === FileType.DIRECTORY ? FileType.DIRECTORY : FileType.FILE, this.size, this.mode, this.atime, this.mtime, this.ctime, this.uid, this.gid);
    }
    /**
     * Get the size of this Inode, in bytes.
     */
    getSize() {
        // ASSUMPTION: ID is 1 byte per char.
        return 38 + this.id.length;
    }
    /**
     * Writes the inode into the start of the buffer.
     */
    serialize(data = new Uint8Array(this.getSize())) {
        const view = new DataView('buffer' in data ? data.buffer : data);
        view.setUint32(0, this.size, true);
        view.setUint16(4, this.mode, true);
        view.setFloat64(6, this.atime, true);
        view.setFloat64(14, this.mtime, true);
        view.setFloat64(22, this.ctime, true);
        view.setUint32(30, this.uid, true);
        view.setUint32(34, this.gid, true);
        const buffer = new Uint8Array(view.buffer);
        buffer.set(encode(this.id), 38);
        return buffer;
    }
    /**
     * Updates the Inode using information from the stats object. Used by file
     * systems at sync time, e.g.:
     * - Program opens file and gets a File object.
     * - Program mutates file. File object is responsible for maintaining
     *   metadata changes locally -- typically in a Stats object.
     * - Program closes file. File object's metadata changes are synced with the
     *   file system.
     * @return True if any changes have occurred.
     */
    update(stats) {
        let hasChanged = false;
        if (this.size !== stats.size) {
            this.size = stats.size;
            hasChanged = true;
        }
        if (this.mode !== stats.mode) {
            this.mode = stats.mode;
            hasChanged = true;
        }
        const atimeMs = stats.atime.getTime();
        if (this.atime !== atimeMs) {
            this.atime = atimeMs;
            hasChanged = true;
        }
        const mtimeMs = stats.mtime.getTime();
        if (this.mtime !== mtimeMs) {
            this.mtime = mtimeMs;
            hasChanged = true;
        }
        const ctimeMs = stats.ctime.getTime();
        if (this.ctime !== ctimeMs) {
            this.ctime = ctimeMs;
            hasChanged = true;
        }
        if (this.uid !== stats.uid) {
            this.uid = stats.uid;
            hasChanged = true;
        }
        if (this.uid !== stats.uid) {
            this.uid = stats.uid;
            hasChanged = true;
        }
        return hasChanged;
    }
    // XXX: Copied from Stats. Should reconcile these two into something more
    //      compact.
    /**
     * @return [Boolean] True if this item is a file.
     */
    isFile() {
        return (this.mode & 0xf000) === FileType.FILE;
    }
    /**
     * @return [Boolean] True if this item is a directory.
     */
    isDirectory() {
        return (this.mode & 0xf000) === FileType.DIRECTORY;
    }
}
