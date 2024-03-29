import { Readable, Writable } from 'readable-stream';
export class ReadStream extends Readable {
    close(callback = () => null) {
        try {
            super.destroy();
            super.emit('close');
            callback();
        }
        catch (err) {
            callback(err);
        }
    }
    addListener(event, listener) {
        return super.addListener(event, listener);
    }
    on(event, listener) {
        return super.on(event, listener);
    }
    once(event, listener) {
        return super.once(event, listener);
    }
    prependListener(event, listener) {
        return super.prependListener(event, listener);
    }
    prependOnceListener(event, listener) {
        return super.prependOnceListener(event, listener);
    }
}
export class WriteStream extends Writable {
    close(callback = () => null) {
        try {
            super.destroy();
            super.emit('close');
            callback();
        }
        catch (err) {
            callback(err);
        }
    }
    addListener(event, listener) {
        return super.addListener(event, listener);
    }
    on(event, listener) {
        return super.on(event, listener);
    }
    once(event, listener) {
        return super.once(event, listener);
    }
    prependListener(event, listener) {
        return super.prependListener(event, listener);
    }
    prependOnceListener(event, listener) {
        return super.prependOnceListener(event, listener);
    }
}
