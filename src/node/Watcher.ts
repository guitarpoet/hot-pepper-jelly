/**
 * This is the file system watcher, that will watch the file system update
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 0.0.1
 * @date Sat Jul  7 19:03:27 2018
 */

import * as fs from "fs";
import * as path from "path";
import { isFunction, isArray } from "lodash";

/**
 * The watcher will watch folder and file's change
 */
export class Watcher {
	private watchers:Array<any>;

	watch(files:Array<string> | string = [], callback:any = null) {
        if(files) {
            if(!isArray(files)) {
                files = [files as string];
            }

            if(callback && !this.watchers) {
				this.watchers = (<Array<string>> files).map(f => {
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

    watching():boolean {
        return !!this.watchers;
    }

    endWatch():void {
        if(this.watching() && isArray(this.watchers)) {
            this.watchers.map(w => w.close());
			// Clear the watch
			this.watchers = null;
        }
    }
}

