import { ErrorCode, ApiError } from './ApiError.js';
import * as path from './emulation/path.js';
/**
 * Synchronous recursive makedir.
 * @internal
 */
export function mkdirpSync(p, mode, cred, fs) {
    if (!fs.existsSync(p, cred)) {
        mkdirpSync(path.dirname(p), mode, cred, fs);
        fs.mkdirSync(p, mode, cred);
    }
}
/*
 * Levenshtein distance, from the `js-levenshtein` NPM module.
 * Copied here to avoid complexity of adding another CommonJS module dependency.
 */
function _min(d0, d1, d2, bx, ay) {
    return Math.min(d0 + 1, d1 + 1, d2 + 1, bx === ay ? d1 : d1 + 1);
}
/**
 * Calculates levenshtein distance.
 * @param a
 * @param b
 */
function levenshtein(a, b) {
    if (a === b) {
        return 0;
    }
    if (a.length > b.length) {
        [a, b] = [b, a]; // Swap a and b
    }
    let la = a.length;
    let lb = b.length;
    // Trim common suffix
    while (la > 0 && a.charCodeAt(la - 1) === b.charCodeAt(lb - 1)) {
        la--;
        lb--;
    }
    let offset = 0;
    // Trim common prefix
    while (offset < la && a.charCodeAt(offset) === b.charCodeAt(offset)) {
        offset++;
    }
    la -= offset;
    lb -= offset;
    if (la === 0 || lb === 1) {
        return lb;
    }
    const vector = new Array(la << 1);
    for (let y = 0; y < la;) {
        vector[la + y] = a.charCodeAt(offset + y);
        vector[y] = ++y;
    }
    let x;
    let d0;
    let d1;
    let d2;
    let d3;
    for (x = 0; x + 3 < lb;) {
        const bx0 = b.charCodeAt(offset + (d0 = x));
        const bx1 = b.charCodeAt(offset + (d1 = x + 1));
        const bx2 = b.charCodeAt(offset + (d2 = x + 2));
        const bx3 = b.charCodeAt(offset + (d3 = x + 3));
        let dd = (x += 4);
        for (let y = 0; y < la;) {
            const ay = vector[la + y];
            const dy = vector[y];
            d0 = _min(dy, d0, d1, bx0, ay);
            d1 = _min(d0, d1, d2, bx1, ay);
            d2 = _min(d1, d2, d3, bx2, ay);
            dd = _min(d2, d3, dd, bx3, ay);
            vector[y++] = dd;
            d3 = d2;
            d2 = d1;
            d1 = d0;
            d0 = dy;
        }
    }
    let dd = 0;
    for (; x < lb;) {
        const bx0 = b.charCodeAt(offset + (d0 = x));
        dd = ++x;
        for (let y = 0; y < la; y++) {
            const dy = vector[y];
            vector[y] = dd = dy < d0 || dd < d0 ? (dy > dd ? dd + 1 : dy + 1) : bx0 === vector[la + y] ? d0 : d0 + 1;
            d0 = dy;
        }
    }
    return dd;
}
/**
 * Checks that the given options object is valid for the file system options.
 * @internal
 */
export async function checkOptions(backend, opts) {
    const optsInfo = backend.Options;
    const fsName = backend.Name;
    let pendingValidators = 0;
    let callbackCalled = false;
    let loopEnded = false;
    // Check for required options.
    for (const optName in optsInfo) {
        if (Object.prototype.hasOwnProperty.call(optsInfo, optName)) {
            const opt = optsInfo[optName];
            const providedValue = opts && opts[optName];
            if (providedValue === undefined || providedValue === null) {
                if (!opt.optional) {
                    // Required option, not provided.
                    // Any incorrect options provided? Which ones are close to the provided one?
                    // (edit distance 5 === close)
                    const incorrectOptions = Object.keys(opts)
                        .filter(o => !(o in optsInfo))
                        .map((a) => {
                        return { str: a, distance: levenshtein(optName, a) };
                    })
                        .filter(o => o.distance < 5)
                        .sort((a, b) => a.distance - b.distance);
                    // Validators may be synchronous.
                    if (callbackCalled) {
                        return;
                    }
                    callbackCalled = true;
                    throw new ApiError(ErrorCode.EINVAL, `[${fsName}] Required option '${optName}' not provided.${incorrectOptions.length > 0 ? ` You provided unrecognized option '${incorrectOptions[0].str}'; perhaps you meant to type '${optName}'.` : ''}\nOption description: ${opt.description}`);
                }
                // Else: Optional option, not provided. That is OK.
            }
            else {
                // Option provided! Check type.
                let typeMatches = false;
                if (Array.isArray(opt.type)) {
                    typeMatches = opt.type.indexOf(typeof providedValue) !== -1;
                }
                else {
                    typeMatches = typeof providedValue === opt.type;
                }
                if (!typeMatches) {
                    // Validators may be synchronous.
                    if (callbackCalled) {
                        return;
                    }
                    callbackCalled = true;
                    throw new ApiError(ErrorCode.EINVAL, `[${fsName}] Value provided for option ${optName} is not the proper type. Expected ${Array.isArray(opt.type) ? `one of {${opt.type.join(', ')}}` : opt.type}, but received ${typeof providedValue}\nOption description: ${opt.description}`);
                }
                else if (opt.validator) {
                    pendingValidators++;
                    try {
                        await opt.validator(providedValue);
                    }
                    catch (e) {
                        if (!callbackCalled) {
                            if (e) {
                                callbackCalled = true;
                                throw e;
                            }
                            pendingValidators--;
                            if (pendingValidators === 0 && loopEnded) {
                                return;
                            }
                        }
                    }
                }
                // Otherwise: All good!
            }
        }
    }
    loopEnded = true;
    if (pendingValidators === 0 && !callbackCalled) {
        return;
    }
}
/** Waits n ms.  */
export function wait(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}
/**
 * Converts a callback into a promise. Assumes last parameter is the callback
 * @todo Look at changing resolve value from cbArgs[0] to include other callback arguments?
 */
export function toPromise(fn) {
    return function (...args) {
        return new Promise((resolve, reject) => {
            args.push((e, ...cbArgs) => {
                if (e) {
                    reject(e);
                }
                else {
                    resolve(cbArgs[0]);
                }
            });
            fn(...args);
        });
    };
}
/**
 * @internal
 */
export const setImmediate = typeof globalThis.setImmediate == 'function' ? globalThis.setImmediate : cb => setTimeout(cb, 0);
/**
 * @internal
 */
export const ROOT_NODE_ID = '/';
// prettier-ignore
export function encode(string, encoding = 'utf8') {
    let input = string || '';
    switch (encoding) {
        default:
        case 'utf8':
        case 'utf-8':
            return new TextEncoder().encode(input);
        case 'utf16le':
        case 'utf-16le':
        case 'ucs2':
        case 'ucs-2':
            return new Uint8Array(Uint16Array.from(input.split(''), (c) => c.charCodeAt(0)).buffer);
        case 'ascii':
        case 'latin1':
        case 'binary':
            return Uint8Array.from(input.split(''), (c) => c.charCodeAt(0));
        case 'hex':
            return Uint8Array.from(input.match(/../g), (s) => parseInt(s, 16));
        case 'base64':
        case 'base64url':
            input = input.replaceAll('-', '+').replaceAll('_', '/');
            return Uint8Array.from(atob(input).split(''), (c) => c.charCodeAt(0));
    }
}
// prettier-ignore
export function decode(data, encoding = 'utf8') {
    if (!data || !data.byteLength)
        return '';
    const input = new Uint8Array('buffer' in data ? data.buffer : data);
    switch (encoding) {
        default:
        case 'utf8':
        case 'utf-8':
            return new TextDecoder('utf-8').decode(input);
        case 'utf16le':
        case 'utf-16le':
        case 'ucs2':
        case 'ucs-2':
            return new TextDecoder('utf-16le').decode(input);
        case 'ascii':
            return new TextDecoder('utf-8').decode(input.map(i => i & 127));
        case 'latin1':
        case 'binary':
            return new TextDecoder('utf-16').decode(new Uint8Array(Uint16Array.from(input).buffer));
        case 'hex':
            return Array.from(input, i => i.toString(16).padStart(2, '0')).join('');
        case 'base64':
            return btoa(new TextDecoder('utf-16').decode(new Uint8Array(Uint16Array.from(input).buffer)));
        case 'base64url':
            return btoa(new TextDecoder('utf-16').decode(new Uint8Array(Uint16Array.from(input).buffer))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
    }
}
/**
 * Generates a random ID.
 * @internal
 */
export function randomUUID() {
    // From http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
