import { checkOptions } from '../utils.js';
export function CreateBackend(options, cb) {
    cb = typeof options === 'function' ? options : cb;
    checkOptions(this, options);
    const fs = new this(typeof options === 'function' ? {} : options);
    // Promise
    if (typeof cb != 'function') {
        return fs.whenReady();
    }
    // Callback
    fs.whenReady()
        .then(fs => cb(null, fs))
        .catch(err => cb(err));
}
