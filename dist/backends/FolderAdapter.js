var _a;
import { BaseFileSystem } from '../filesystem.js';
import { relative, join } from '../emulation/path.js';
import { ApiError } from '../ApiError.js';
import { Cred } from '../cred.js';
import { CreateBackend } from './backend.js';
/**
 * The FolderAdapter file system wraps a file system, and scopes all interactions to a subfolder of that file system.
 *
 * Example: Given a file system `foo` with folder `bar` and file `bar/baz`...
 *
 * ```javascript
 * BrowserFS.configure({
 *   fs: "FolderAdapter",
 *   options: {
 *     folder: "bar",
 *     wrapped: foo
 *   }
 * }, function(e) {
 *   var fs = BrowserFS.BFSRequire('fs');
 *   fs.readdirSync('/'); // ['baz']
 * });
 * ```
 */
export class FolderAdapter extends BaseFileSystem {
    static isAvailable() {
        return true;
    }
    constructor({ folder, wrapped }) {
        super();
        this._folder = folder;
        this._wrapped = wrapped;
        this._ready = this._initialize();
    }
    get metadata() {
        return { ...super.metadata, ...this._wrapped.metadata, supportsLinks: false };
    }
    /**
     * Initialize the file system. Ensures that the wrapped file system
     * has the given folder.
     */
    async _initialize() {
        const exists = await this._wrapped.exists(this._folder, Cred.Root);
        if (!exists && this._wrapped.metadata.readonly) {
            throw ApiError.ENOENT(this._folder);
        }
        await this._wrapped.mkdir(this._folder, 0o777, Cred.Root);
        return this;
    }
}
_a = FolderAdapter;
FolderAdapter.Name = 'FolderAdapter';
FolderAdapter.Create = CreateBackend.bind(_a);
FolderAdapter.Options = {
    folder: {
        type: 'string',
        description: 'The folder to use as the root directory',
    },
    wrapped: {
        type: 'object',
        description: 'The file system to wrap',
    },
};
/**
 * @internal
 */
function translateError(folder, e) {
    if (e !== null && typeof e === 'object') {
        const err = e;
        let p = err.path;
        if (p) {
            p = '/' + relative(folder, p);
            err.message = err.message.replace(err.path, p);
            err.path = p;
        }
    }
    return e;
}
/**
 * @internal
 */
function wrapCallback(folder, cb) {
    if (typeof cb === 'function') {
        return function (err) {
            if (arguments.length > 0) {
                arguments[0] = translateError(folder, err);
            }
            cb.apply(null, arguments);
        };
    }
    else {
        return cb;
    }
}
/**
 * @internal
 */
function wrapFunction(name, wrapFirst, wrapSecond) {
    if (name.slice(name.length - 4) !== 'Sync') {
        // Async function. Translate error in callback.
        return function () {
            if (arguments.length > 0) {
                if (wrapFirst) {
                    arguments[0] = join(this._folder, arguments[0]);
                }
                if (wrapSecond) {
                    arguments[1] = join(this._folder, arguments[1]);
                }
                arguments[arguments.length - 1] = wrapCallback(this._folder, arguments[arguments.length - 1]);
            }
            return this._wrapped[name].apply(this._wrapped, arguments);
        };
    }
    else {
        // Sync function. Translate error in catch.
        return function () {
            try {
                if (wrapFirst) {
                    arguments[0] = join(this._folder, arguments[0]);
                }
                if (wrapSecond) {
                    arguments[1] = join(this._folder, arguments[1]);
                }
                return this._wrapped[name].apply(this._wrapped, arguments);
            }
            catch (e) {
                throw translateError(this._folder, e);
            }
        };
    }
}
// First argument is a path.
[
    'diskSpace',
    'stat',
    'statSync',
    'open',
    'openSync',
    'unlink',
    'unlinkSync',
    'rmdir',
    'rmdirSync',
    'mkdir',
    'mkdirSync',
    'readdir',
    'readdirSync',
    'exists',
    'existsSync',
    'realpath',
    'realpathSync',
    'truncate',
    'truncateSync',
    'readFile',
    'readFileSync',
    'writeFile',
    'writeFileSync',
    'appendFile',
    'appendFileSync',
    'chmod',
    'chmodSync',
    'chown',
    'chownSync',
    'utimes',
    'utimesSync',
    'readlink',
    'readlinkSync',
].forEach((name) => {
    FolderAdapter.prototype[name] = wrapFunction(name, true, false);
});
// First and second arguments are paths.
['rename', 'renameSync', 'link', 'linkSync', 'symlink', 'symlinkSync'].forEach((name) => {
    FolderAdapter.prototype[name] = wrapFunction(name, true, true);
});
