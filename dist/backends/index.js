import { AsyncMirror } from './AsyncMirror.js';
import { FolderAdapter } from './FolderAdapter.js';
import { InMemoryFileSystem as InMemory } from './InMemory.js';
import { OverlayFS } from './OverlayFS.js';
export const backends = {};
export default backends;
export { AsyncMirror, FolderAdapter, InMemory, OverlayFS };
export function registerBackend(..._backends) {
    for (const backend of _backends) {
        backends[backend.Name] = backend;
    }
}
registerBackend(AsyncMirror, FolderAdapter, InMemory, OverlayFS);
