var _a;
import { SimpleSyncRWTransaction, SyncKeyValueFileSystem } from './SyncStore.js';
import { CreateBackend } from './backend.js';
/**
 * A simple in-memory key-value store backed by a JavaScript object.
 */
export class InMemoryStore {
    constructor() {
        this.store = new Map();
    }
    name() {
        return InMemoryFileSystem.Name;
    }
    clear() {
        this.store.clear();
    }
    beginTransaction(type) {
        return new SimpleSyncRWTransaction(this);
    }
    get(key) {
        return this.store.get(key);
    }
    put(key, data, overwrite) {
        if (!overwrite && this.store.has(key)) {
            return false;
        }
        this.store.set(key, data);
        return true;
    }
    del(key) {
        this.store.delete(key);
    }
}
/**
 * A simple in-memory file system backed by an InMemoryStore.
 * Files are not persisted across page loads.
 */
export class InMemoryFileSystem extends SyncKeyValueFileSystem {
    constructor() {
        super({ store: new InMemoryStore() });
    }
}
_a = InMemoryFileSystem;
InMemoryFileSystem.Name = 'InMemory';
InMemoryFileSystem.Create = CreateBackend.bind(_a);
InMemoryFileSystem.Options = {};
