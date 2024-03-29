/**
 * BrowserFS's main module. This is exposed in the browser via the BrowserFS global.
 */
import fs from './emulation/fs.js';
import { FileSystem, type NoArgCallback, type TwoArgCallback } from './filesystem.js';
import { backends } from './backends/index.js';
/**
 * Initializes BrowserFS with the given file systems.
 */
export declare function initialize(mounts: {
    [point: string]: FileSystem;
}, uid?: number, gid?: number): void;
/**
 * Defines a mapping of mount points to their configurations
 */
export interface ConfigMapping {
    [mountPoint: string]: FileSystem | FileSystemConfiguration | keyof typeof backends;
}
/**
 * A configuration for BrowserFS
 */
export type Configuration = FileSystem | FileSystemConfiguration | ConfigMapping;
/**
 * Creates a file system with the given configuration, and initializes BrowserFS with it.
 * See the FileSystemConfiguration type for more info on the configuration object.
 */
export declare function configure(config: Configuration): Promise<void>;
export declare function configure(config: Configuration, cb: NoArgCallback): void;
/**
 * Asynchronously creates a file system with the given configuration, and initializes BrowserFS with it.
 * See the FileSystemConfiguration type for more info on the configuration object.
 * Note: unlike configure, the .then is provided with the file system
 */
/**
 * Specifies a file system backend type and its options.
 *
 * Individual options can recursively contain FileSystemConfiguration objects for
 * option values that require file systems.
 *
 * For example, to mirror Dropbox to Storage with AsyncMirror, use the following
 * object:
 *
 * ```javascript
 * var config = {
 *   fs: "AsyncMirror",
 *   options: {
 *     sync: {fs: "Storage"},
 *     async: {fs: "Dropbox", options: {client: anAuthenticatedDropboxSDKClient }}
 *   }
 * };
 * ```
 *
 * The option object for each file system corresponds to that file system's option object passed to its `Create()` method.
 */
export interface FileSystemConfiguration {
    fs: string;
    options?: object;
}
/**
 * Retrieve a file system with the given configuration. Will return a promise if invoked without a callback
 * @param config A FileSystemConfiguration object. See FileSystemConfiguration for details.
 * @param cb Called when the file system is constructed, or when an error occurs.
 */
export declare function getFileSystem(config: FileSystemConfiguration): Promise<FileSystem>;
export declare function getFileSystem(config: FileSystemConfiguration, cb: TwoArgCallback<FileSystem>): void;
export * from './backends/index.js';
export * from './backends/AsyncStore.js';
export * from './backends/SyncStore.js';
export * from './ApiError.js';
export * from './cred.js';
export * from './FileIndex.js';
export * from './file.js';
export * from './filesystem.js';
export * from './inode.js';
export * from './mutex.js';
export * from './stats.js';
export * from './utils.js';
export { fs };
export default fs;
