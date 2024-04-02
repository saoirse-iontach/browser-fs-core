import type { TwoArgCallback, FileSystem } from '../filesystem.js';
/**
 * Describes a file system option.
 */
export interface BackendOption<T> {
    /**
     * The basic JavaScript type(s) for this option.
     */
    type: string | string[];
    /**
     * Whether or not the option is optional (e.g., can be set to null or undefined).
     * Defaults to `false`.
     */
    optional?: boolean;
    /**
     * Description of the option. Used in error messages and documentation.
     */
    description: string;
    /**
     * A custom validation function to check if the option is valid.
     * When async, resolves if valid and rejects if not.
     * When sync, it will throw an error if not valid.
     */
    validator?(opt: T): void | Promise<void>;
}
/**
 * Describes all of the options available in a file system.
 */
export interface BackendOptions {
    [name: string]: BackendOption<unknown>;
}
/**
 * Contains types for static functions on a backend.
 */
export interface BaseBackendConstructor<FS extends typeof FileSystem = typeof FileSystem> {
    new (...params: ConstructorParameters<FS>): InstanceType<FS>;
    /**
     * A name to identify the backend.
     */
    Name: string;
    /**
     * Describes all of the options available for this backend.
     */
    Options: BackendOptions;
    /**
     * Whether the backend is available in the current environment.
     * It supports checking synchronously and asynchronously
     * Sync:
     * Returns 'true' if this backend is available in the current
     * environment. For example, a `localStorage`-backed filesystem will return
     * 'false' if the browser does not support that API.
     *
     * Defaults to 'false', as the FileSystem base class isn't usable alone.
     */
    isAvailable(): boolean;
}
/**
 * Contains types for static functions on a backend.
 */
export interface BackendConstructor<FS extends typeof FileSystem = typeof FileSystem> extends BaseBackendConstructor<FS> {
    /**
     * Creates backend of this given type with the given
     * options, and either returns the result in a promise or callback.
     */
    Create(): Promise<InstanceType<FS>>;
    Create(options: object): Promise<InstanceType<FS>>;
    Create(cb: TwoArgCallback<InstanceType<FS>>): void;
    Create(options: object, cb: TwoArgCallback<InstanceType<FS>>): void;
    Create(options: object, cb?: TwoArgCallback<InstanceType<FS>>): Promise<InstanceType<FS>> | void;
}
export declare function CreateBackend<FS extends BaseBackendConstructor>(this: FS): Promise<InstanceType<FS>>;
export declare function CreateBackend<FS extends BaseBackendConstructor>(this: FS, options: BackendOptions): Promise<InstanceType<FS>>;
export declare function CreateBackend<FS extends BaseBackendConstructor>(this: FS, cb: TwoArgCallback<InstanceType<FS>>): void;
export declare function CreateBackend<FS extends BaseBackendConstructor>(this: FS, options: BackendOptions, cb: TwoArgCallback<InstanceType<FS>>): void;
