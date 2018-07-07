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
import { Observable } from "rxjs/Observable";
import "rxjs/add/observable/from";
import "rxjs/add/operator/mergeMap";

export interface WatchEvent {
    eventType:string;
    filename:string;
}

/**
 * The watcher will watch folder and file's change
 */
export class Watcher {
    private watchers:Array<any> = [];
    private handle:any = null;
    private w:Observable<WatchEvent>;

    watch(...files:Array<string>):Observable<WatchEvent> {
        if(!this.w) {
            this.w = Observable.from(files).flatMap(f => {
                return Observable.create(obs => {
                    this.handle = obs;
                    this.watchers.push(fs.watch(f, (eventType, filename) => {
                        if (filename) {
                            let p = path.resolve(path.join(f, filename));
                            if(fs.existsSync(p)) {
                                obs.next({filename:p , eventType});
                            }
                        }
                    }));
                });
            });
        }
        return this.w;
    }

    watching():boolean {
        return !!this.handle;
    }

    endWatch():void {
        if(this.watching() && isArray(this.watchers)) {
            this.watchers.map(w => w.close());
            // Clear the watch
            this.watchers = [];
            this.handle.complete();
            this.handle = null;
            this.w = null;
        }
    }
}

