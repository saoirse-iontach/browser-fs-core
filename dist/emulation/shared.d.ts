/// <reference types="node" resolution-mode="require"/>
import { Cred } from '../cred.js';
import { FileSystem } from '../filesystem.js';
import { File } from '../file.js';
import { BackendConstructor } from '../backends/backend.js';
/**
 * converts Date or number to a fractional UNIX timestamp
 * Grabbed from NodeJS sources (lib/fs.js)
 */
export declare function _toUnixTimestamp(time: Date | number): number;
export declare function normalizeMode(mode: unknown, def: number): number;
export declare function normalizeTime(time: number | Date): Date;
export declare function normalizePath(p: string): string;
export declare function normalizeOptions(options: any, defEnc: string | null, defFlag: string, defMode: number | null): {
    encoding: BufferEncoding;
    flag: string;
    mode: number;
};
export declare function nop(): void;
export declare let cred: Cred;
export declare function setCred(val: Cred): void;
export declare const fdMap: Map<number, File>;
export declare function getFdForFile(file: File): number;
export declare function fd2file(fd: number): File;
export interface MountMapping {
    [point: string]: InstanceType<BackendConstructor>;
}
export declare const mounts: Map<string, FileSystem>;
/**
 * Gets the file system mounted at `mountPoint`
 */
export declare function getMount(mountPoint: string): FileSystem;
/**
 * Gets an object of mount points (keys) and filesystems (values)
 */
export declare function getMounts(): MountMapping;
/**
 * Mounts the file system at the given mount point.
 */
export declare function mount(mountPoint: string, fs: FileSystem): void;
/**
 * Unmounts the file system at the given mount point.
 */
export declare function umount(mountPoint: string): void;
/**
 * Gets the internal FileSystem for the path, then returns it along with the path relative to the FS' root
 */
export declare function resolveFS(path: string): {
    fs: FileSystem;
    path: string;
    mountPoint: string;
};
/**
 * Reverse maps the paths in text from the mounted FileSystem to the global path
 */
export declare function fixPaths(text: string, paths: {
    [from: string]: string;
}): string;
export declare function fixError<E extends Error>(e: E, paths: {
    [from: string]: string;
}): E;
export declare function initialize(mountMapping: MountMapping): void;
/**
 * Types supports as path parameters.
 *
 * In the future, maybe support URL?
 */
export type PathLike = string;
/**
 * @internal
 *
 * Converts any Buffer in T to Uint8Array
 */
export type BufferToUint8Array<T> = T extends Buffer ? Uint8Array : T extends (...args: any[]) => unknown ? (...args: Parameters<T>) => BufferToUint8Array<ReturnType<T>> : T extends object ? {
    [K in keyof T]: BufferToUint8Array<T[K]>;
} : T;
