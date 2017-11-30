/**
 * The watcher support
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 0.0.1
 * @date Thu Nov 30 16:59:42 2017
 */

const fs = require("fs");
const path = require("path");
const { isFunction, isArray } = require("underscore");

/**
 * The watcher will watch folder and file's change
 */
class Watcher {
    watch(files = [], callback = null) {
        if(files) {
            if(!isArray(files)) {
                files = [files];
            }

            if(callback && !this.watchers) {
                this.watchers = files.map(f => {
                    return fs.watch(f, (eventType, filename) => {
                        if (filename) {
                            let p = path.resolve(path.join(f, filename));
                            if(fs.existsSync(p)) {
                                callback(p, eventType);
                            }
                        }
                    });
                });
            }
        }
    }

    watching() {
        return !!this.watchers;
    }

    endWatch() {
        if(this.watching() && isArray(this.watchers)) {
            this.watchers.map(w => w.close());
			// Clear the watch
			this.watchers = null;
        }
    }
}


module.exports = Watcher;
