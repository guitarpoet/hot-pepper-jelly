"use strict";
/**
 * This is the file system watcher, that will watch the file system update
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 0.0.1
 * @date Sat Jul  7 19:03:27 2018
 */
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const lodash_1 = require("lodash");
const Observable_1 = require("rxjs/Observable");
require("rxjs/add/observable/from");
require("rxjs/add/operator/mergeMap");
/**
 * The watcher will watch folder and file's change
 */
class Watcher {
    constructor() {
        this.watchers = [];
        this.handle = null;
    }
    watch(...files) {
        if (!this.w) {
            this.w = Observable_1.Observable.from(files).flatMap(f => {
                return Observable_1.Observable.create(obs => {
                    this.handle = obs;
                    this.watchers.push(fs.watch(f, (eventType, filename) => {
                        if (filename) {
                            let p = path.resolve(path.join(f, filename));
                            if (fs.existsSync(p)) {
                                obs.next({ filename: p, eventType });
                            }
                        }
                    }));
                });
            });
        }
        return this.w;
    }
    watching() {
        return !!this.handle;
    }
    endWatch() {
        if (this.watching() && lodash_1.isArray(this.watchers)) {
            this.watchers.map(w => w.close());
            // Clear the watch
            this.watchers = [];
            this.handle.complete();
            this.handle = null;
            this.w = null;
        }
    }
}
exports.Watcher = Watcher;
//# sourceMappingURL=Watcher.js.map