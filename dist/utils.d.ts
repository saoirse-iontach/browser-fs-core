/// <reference types="node" resolution-mode="require"/>
/// <reference types="b2a" />
/// <reference types="node" resolution-mode="require"/>
/**
 * Grab bag of utility functions used across the code.
 */
import { FileSystem } from './filesystem.js';
import { Cred } from './cred.js';
import type { BaseBackendConstructor } from './backends/backend.js';
declare global {
    export const TextEncoder: typeof import("util").TextEncoder, TextDecoder: typeof import("util").TextDecoder;
    export const atob: typeof import("b2a").atob, btoa: typeof import("b2a").btoa;
}
/**
 * Synchronous recursive makedir.
 * @internal
 */
export declare function mkdirpSync(p: string, mode: number, cred: Cred, fs: FileSystem): void;
/**
 * Checks that the given options object is valid for the file system options.
 * @internal
 */
export declare function checkOptions(backend: BaseBackendConstructor, opts: object): Promise<void>;
/** Waits n ms.  */
export declare function wait(ms: number): Promise<void>;
/**
 * Converts a callback into a promise. Assumes last parameter is the callback
 * @todo Look at changing resolve value from cbArgs[0] to include other callback arguments?
 */
export declare function toPromise(fn: (...fnArgs: unknown[]) => unknown): (...args: unknown[]) => Promise<unknown>;
/**
 * @internal
 */
export declare const setImmediate: (callback: () => unknown) => void;
/**
 * @internal
 */
export declare const ROOT_NODE_ID: string;
export declare function encode(string?: string, encoding?: BufferEncoding | 'utf-16le'): Uint8Array;
export declare function decode(data?: ArrayBufferView | ArrayBuffer, encoding?: BufferEncoding | 'utf-16le'): string;
/**
 * Generates a random ID.
 * @internal
 */
export declare function randomUUID(): string;
