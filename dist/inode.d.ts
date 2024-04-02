import { Stats } from './stats.js';
/**
 * Generic inode definition that can easily be serialized.
 */
export default class Inode {
    id: string;
    size: number;
    mode: number;
    atime: number;
    mtime: number;
    ctime: number;
    uid: number;
    gid: number;
    /**
     * Converts the buffer into an Inode.
     */
    static Deserialize(data: ArrayBufferLike | ArrayBufferView): Inode;
    constructor(id: string, size: number, mode: number, atime: number, mtime: number, ctime: number, uid: number, gid: number);
    /**
     * Handy function that converts the Inode to a Node Stats object.
     */
    toStats(): Stats;
    /**
     * Get the size of this Inode, in bytes.
     */
    getSize(): number;
    /**
     * Writes the inode into the start of the buffer.
     */
    serialize(data?: ArrayBufferLike | ArrayBufferView): Uint8Array;
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
    update(stats: Stats): boolean;
    /**
     * @return [Boolean] True if this item is a file.
     */
    isFile(): boolean;
    /**
     * @return [Boolean] True if this item is a directory.
     */
    isDirectory(): boolean;
}
