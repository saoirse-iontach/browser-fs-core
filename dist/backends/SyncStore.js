import { dirname, basename, join, resolve, sep } from '../emulation/path.js';
import { ApiError, ErrorCode } from '../ApiError.js';
import { W_OK, R_OK } from '../emulation/constants.js';
import { FileFlag, PreloadFile } from '../file.js';
import { SynchronousFileSystem } from '../filesystem.js';
import Inode from '../inode.js';
import { FileType } from '../stats.js';
import { decode, encode, randomUUID, ROOT_NODE_ID } from '../utils.js';
/**
 * A simple RW transaction for simple synchronous key-value stores.
 */
export class SimpleSyncRWTransaction {
    constructor(store) {
        this.store = store;
        /**
         * Stores data in the keys we modify prior to modifying them.
         * Allows us to roll back commits.
         */
        this.originalData = {};
        /**
         * List of keys modified in this transaction, if any.
         */
        this.modifiedKeys = [];
    }
    get(key) {
        const val = this.store.get(key);
        this.stashOldValue(key, val);
        return val;
    }
    put(key, data, overwrite) {
        this.markModified(key);
        return this.store.put(key, data, overwrite);
    }
    del(key) {
        this.markModified(key);
        this.store.del(key);
    }
    commit() {
        /* NOP */
    }
    abort() {
        // Rollback old values.
        for (const key of this.modifiedKeys) {
            const value = this.originalData[key];
            if (!value) {
                // Key didn't exist.
                this.store.del(key);
            }
            else {
                // Key existed. Store old value.
                this.store.put(key, value, true);
            }
        }
    }
    _has(key) {
        return Object.prototype.hasOwnProperty.call(this.originalData, key);
    }
    /**
     * Stashes given key value pair into `originalData` if it doesn't already
     * exist. Allows us to stash values the program is requesting anyway to
     * prevent needless `get` requests if the program modifies the data later
     * on during the transaction.
     */
    stashOldValue(key, value) {
        // Keep only the earliest value in the transaction.
        if (!this._has(key)) {
            this.originalData[key] = value;
        }
    }
    /**
     * Marks the given key as modified, and stashes its value if it has not been
     * stashed already.
     */
    markModified(key) {
        if (this.modifiedKeys.indexOf(key) === -1) {
            this.modifiedKeys.push(key);
            if (!this._has(key)) {
                this.originalData[key] = this.store.get(key);
            }
        }
    }
}
export class SyncKeyValueFile extends PreloadFile {
    constructor(_fs, _path, _flag, _stat, contents) {
        super(_fs, _path, _flag, _stat, contents);
    }
    syncSync() {
        if (this.isDirty()) {
            this._fs._syncSync(this.getPath(), this.getBuffer(), this.getStats());
            this.resetDirty();
        }
    }
    closeSync() {
        this.syncSync();
    }
}
/**
 * A "Synchronous key-value file system". Stores data to/retrieves data from an
 * underlying key-value store.
 *
 * We use a unique ID for each node in the file system. The root node has a
 * fixed ID.
 * @todo Introduce Node ID caching.
 * @todo Check modes.
 */
export class SyncKeyValueFileSystem extends SynchronousFileSystem {
    static isAvailable() {
        return true;
    }
    constructor(options) {
        super();
        this.store = options.store;
        // INVARIANT: Ensure that the root exists.
        this.makeRootDirectory();
    }
    getName() {
        return this.store.name();
    }
    isReadOnly() {
        return false;
    }
    supportsSymlinks() {
        return false;
    }
    supportsProps() {
        return true;
    }
    supportsSynch() {
        return true;
    }
    /**
     * Delete all contents stored in the file system.
     */
    empty() {
        this.store.clear();
        // INVARIANT: Root always exists.
        this.makeRootDirectory();
    }
    accessSync(p, mode, cred) {
        const tx = this.store.beginTransaction('readonly'), node = this.findINode(tx, p);
        if (!node.toStats().hasAccess(mode, cred)) {
            throw ApiError.EACCES(p);
        }
    }
    renameSync(oldPath, newPath, cred) {
        const tx = this.store.beginTransaction('readwrite'), oldParent = dirname(oldPath), oldName = basename(oldPath), newParent = dirname(newPath), newName = basename(newPath), 
        // Remove oldPath from parent's directory listing.
        oldDirNode = this.findINode(tx, oldParent), oldDirList = this.getDirListing(tx, oldParent, oldDirNode);
        if (!oldDirNode.toStats().hasAccess(W_OK, cred)) {
            throw ApiError.EACCES(oldPath);
        }
        if (!oldDirList[oldName]) {
            throw ApiError.ENOENT(oldPath);
        }
        const nodeId = oldDirList[oldName];
        delete oldDirList[oldName];
        // Invariant: Can't move a folder inside itself.
        // This funny little hack ensures that the check passes only if oldPath
        // is a subpath of newParent. We append '/' to avoid matching folders that
        // are a substring of the bottom-most folder in the path.
        if ((newParent + '/').indexOf(oldPath + '/') === 0) {
            throw new ApiError(ErrorCode.EBUSY, oldParent);
        }
        // Add newPath to parent's directory listing.
        let newDirNode, newDirList;
        if (newParent === oldParent) {
            // Prevent us from re-grabbing the same directory listing, which still
            // contains oldName.
            newDirNode = oldDirNode;
            newDirList = oldDirList;
        }
        else {
            newDirNode = this.findINode(tx, newParent);
            newDirList = this.getDirListing(tx, newParent, newDirNode);
        }
        if (newDirList[newName]) {
            // If it's a file, delete it.
            const newNameNode = this.getINode(tx, newPath, newDirList[newName]);
            if (newNameNode.isFile()) {
                try {
                    tx.del(newNameNode.id);
                    tx.del(newDirList[newName]);
                }
                catch (e) {
                    tx.abort();
                    throw e;
                }
            }
            else {
                // If it's a directory, throw a permissions error.
                throw ApiError.EPERM(newPath);
            }
        }
        newDirList[newName] = nodeId;
        // Commit the two changed directory listings.
        try {
            tx.put(oldDirNode.id, encode(JSON.stringify(oldDirList)), true);
            tx.put(newDirNode.id, encode(JSON.stringify(newDirList)), true);
        }
        catch (e) {
            tx.abort();
            throw e;
        }
        tx.commit();
    }
    statSync(p, cred) {
        // Get the inode to the item, convert it into a Stats object.
        const stats = this.findINode(this.store.beginTransaction('readonly'), p).toStats();
        if (!stats.hasAccess(R_OK, cred)) {
            throw ApiError.EACCES(p);
        }
        return stats;
    }
    createFileSync(p, flag, mode, cred) {
        const tx = this.store.beginTransaction('readwrite'), data = new Uint8Array(0), newFile = this.commitNewFile(tx, p, FileType.FILE, mode, cred, data);
        // Open the file.
        return new SyncKeyValueFile(this, p, flag, newFile.toStats(), data);
    }
    openFileSync(p, flag, cred) {
        const tx = this.store.beginTransaction('readonly'), node = this.findINode(tx, p), data = tx.get(node.id);
        if (!node.toStats().hasAccess(flag.getMode(), cred)) {
            throw ApiError.EACCES(p);
        }
        if (data === undefined) {
            throw ApiError.ENOENT(p);
        }
        return new SyncKeyValueFile(this, p, flag, node.toStats(), data);
    }
    unlinkSync(p, cred) {
        this.removeEntry(p, false, cred);
    }
    rmdirSync(p, cred) {
        // Check first if directory is empty.
        if (this.readdirSync(p, cred).length > 0) {
            throw ApiError.ENOTEMPTY(p);
        }
        else {
            this.removeEntry(p, true, cred);
        }
    }
    mkdirSync(p, mode, cred) {
        const tx = this.store.beginTransaction('readwrite'), data = encode('{}');
        this.commitNewFile(tx, p, FileType.DIRECTORY, mode, cred, data);
    }
    readdirSync(p, cred) {
        const tx = this.store.beginTransaction('readonly');
        const node = this.findINode(tx, p);
        if (!node.toStats().hasAccess(R_OK, cred)) {
            throw ApiError.EACCES(p);
        }
        return Object.keys(this.getDirListing(tx, p, node));
    }
    chmodSync(p, mode, cred) {
        const fd = this.openFileSync(p, FileFlag.getFileFlag('r+'), cred);
        fd.chmodSync(mode);
    }
    chownSync(p, new_uid, new_gid, cred) {
        const fd = this.openFileSync(p, FileFlag.getFileFlag('r+'), cred);
        fd.chownSync(new_uid, new_gid);
    }
    _syncSync(p, data, stats) {
        // @todo Ensure mtime updates properly, and use that to determine if a data
        //       update is required.
        const tx = this.store.beginTransaction('readwrite'), 
        // We use the _findInode helper because we actually need the INode id.
        fileInodeId = this._findINode(tx, dirname(p), basename(p)), fileInode = this.getINode(tx, p, fileInodeId), inodeChanged = fileInode.update(stats);
        try {
            // Sync data.
            tx.put(fileInode.id, data, true);
            // Sync metadata.
            if (inodeChanged) {
                tx.put(fileInodeId, fileInode.serialize(), true);
            }
        }
        catch (e) {
            tx.abort();
            throw e;
        }
        tx.commit();
    }
    /**
     * Checks if the root directory exists. Creates it if it doesn't.
     */
    makeRootDirectory() {
        const tx = this.store.beginTransaction('readwrite');
        if (tx.get(ROOT_NODE_ID) === undefined) {
            // Create new inode.
            const currTime = new Date().getTime(), 
            // Mode 0666, owned by root:root
            dirInode = new Inode(randomUUID(), 4096, 511 | FileType.DIRECTORY, currTime, currTime, currTime, 0, 0);
            // If the root doesn't exist, the first random ID shouldn't exist,
            // either.
            tx.put(dirInode.id, encode('{}'), false);
            tx.put(ROOT_NODE_ID, dirInode.serialize(), false);
            tx.commit();
        }
    }
    /**
     * Helper function for findINode.
     * @param parent The parent directory of the file we are attempting to find.
     * @param filename The filename of the inode we are attempting to find, minus
     *   the parent.
     * @return string The ID of the file's inode in the file system.
     */
    _findINode(tx, parent, filename, visited = new Set()) {
        const currentPath = join(parent, filename);
        if (visited.has(currentPath)) {
            throw new ApiError(ErrorCode.EIO, 'Infinite loop detected while finding inode', currentPath);
        }
        visited.add(currentPath);
        const readDirectory = (inode) => {
            // Get the root's directory listing.
            const dirList = this.getDirListing(tx, parent, inode);
            // Get the file's ID.
            if (dirList[filename]) {
                return dirList[filename];
            }
            else {
                throw ApiError.ENOENT(resolve(parent, filename));
            }
        };
        if (parent === '/') {
            if (filename === '') {
                // Return the root's ID.
                return ROOT_NODE_ID;
            }
            else {
                // Find the item in the root node.
                return readDirectory(this.getINode(tx, parent, ROOT_NODE_ID));
            }
        }
        else {
            return readDirectory(this.getINode(tx, parent + sep + filename, this._findINode(tx, dirname(parent), basename(parent), visited)));
        }
    }
    /**
     * Finds the Inode of the given path.
     * @param p The path to look up.
     * @return The Inode of the path p.
     * @todo memoize/cache
     */
    findINode(tx, p) {
        return this.getINode(tx, p, this._findINode(tx, dirname(p), basename(p)));
    }
    /**
     * Given the ID of a node, retrieves the corresponding Inode.
     * @param tx The transaction to use.
     * @param p The corresponding path to the file (used for error messages).
     * @param id The ID to look up.
     */
    getINode(tx, p, id) {
        const inode = tx.get(id);
        if (inode === undefined) {
            throw ApiError.ENOENT(p);
        }
        return Inode.Deserialize(inode);
    }
    /**
     * Given the Inode of a directory, retrieves the corresponding directory
     * listing.
     */
    getDirListing(tx, p, inode) {
        if (!inode.isDirectory()) {
            throw ApiError.ENOTDIR(p);
        }
        const data = tx.get(inode.id);
        if (data === undefined) {
            throw ApiError.ENOENT(p);
        }
        return JSON.parse(decode(data));
    }
    /**
     * Creates a new node under a random ID. Retries 5 times before giving up in
     * the exceedingly unlikely chance that we try to reuse a random GUID.
     * @return The GUID that the data was stored under.
     */
    addNewNode(tx, data) {
        const retries = 0;
        let currId;
        while (retries < 5) {
            try {
                currId = randomUUID();
                tx.put(currId, data, false);
                return currId;
            }
            catch (e) {
                // Ignore and reroll.
            }
        }
        throw new ApiError(ErrorCode.EIO, 'Unable to commit data to key-value store.');
    }
    /**
     * Commits a new file (well, a FILE or a DIRECTORY) to the file system with
     * the given mode.
     * Note: This will commit the transaction.
     * @param p The path to the new file.
     * @param type The type of the new file.
     * @param mode The mode to create the new file with.
     * @param data The data to store at the file's data node.
     * @return The Inode for the new file.
     */
    commitNewFile(tx, p, type, mode, cred, data) {
        const parentDir = dirname(p), fname = basename(p), parentNode = this.findINode(tx, parentDir), dirListing = this.getDirListing(tx, parentDir, parentNode), currTime = new Date().getTime();
        //Check that the creater has correct access
        if (!parentNode.toStats().hasAccess(0b0100 /* Write */, cred)) {
            throw ApiError.EACCES(p);
        }
        // Invariant: The root always exists.
        // If we don't check this prior to taking steps below, we will create a
        // file with name '' in root should p == '/'.
        if (p === '/') {
            throw ApiError.EEXIST(p);
        }
        // Check if file already exists.
        if (dirListing[fname]) {
            throw ApiError.EEXIST(p);
        }
        let fileNode;
        try {
            // Commit data.
            const dataId = this.addNewNode(tx, data);
            fileNode = new Inode(dataId, data.length, mode | type, currTime, currTime, currTime, cred.uid, cred.gid);
            // Commit file node.
            const fileNodeId = this.addNewNode(tx, fileNode.serialize());
            // Update and commit parent directory listing.
            dirListing[fname] = fileNodeId;
            tx.put(parentNode.id, encode(JSON.stringify(dirListing)), true);
        }
        catch (e) {
            tx.abort();
            throw e;
        }
        tx.commit();
        return fileNode;
    }
    /**
     * Remove all traces of the given path from the file system.
     * @param p The path to remove from the file system.
     * @param isDir Does the path belong to a directory, or a file?
     * @todo Update mtime.
     */
    removeEntry(p, isDir, cred) {
        const tx = this.store.beginTransaction('readwrite'), parent = dirname(p), parentNode = this.findINode(tx, parent), parentListing = this.getDirListing(tx, parent, parentNode), fileName = basename(p);
        if (!parentListing[fileName]) {
            throw ApiError.ENOENT(p);
        }
        const fileNodeId = parentListing[fileName];
        // Get file inode.
        const fileNode = this.getINode(tx, p, fileNodeId);
        if (!fileNode.toStats().hasAccess(W_OK, cred)) {
            throw ApiError.EACCES(p);
        }
        // Remove from directory listing of parent.
        delete parentListing[fileName];
        if (!isDir && fileNode.isDirectory()) {
            throw ApiError.EISDIR(p);
        }
        else if (isDir && !fileNode.isDirectory()) {
            throw ApiError.ENOTDIR(p);
        }
        try {
            // Delete data.
            tx.del(fileNode.id);
            // Delete node.
            tx.del(fileNodeId);
            // Update directory listing.
            tx.put(parentNode.id, encode(JSON.stringify(parentListing)), true);
        }
        catch (e) {
            tx.abort();
            throw e;
        }
        // Success.
        tx.commit();
    }
}
