/**
 * This is the implementation for the moudle resolver for NodeJS
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @date Mon Apr 30 15:23:49 2018
 */

import { Observable } from "rxjs"
import "rxjs/add/observable/of";
import { ModuleResolver } from "../interfaces";

export interface ModuleResolveOptions {
    [index:string]: any;
}

export class NodeModuleResolver implements ModuleResolver {
    private mod:any;
    private options:ModuleResolveOptions;

    public constructor(mod:any = null, options: ModuleResolveOptions = {}) {
        if(!mod) {
            // We don't have module set, let's use the top most module as default
            mod = this.getTopMost(module);
        }

        this.mod = mod;
        this.options = options;
    }

    public getTopMost(mod:any):any {
        while(mod && mod.parent) {
            mod = mod.parent;
        }
        return mod;
    }

    resolve(path: string): Observable<any> {
        return Observable.create(obs => {
            try {
                // Let's requite the module directly
                const Module = require("module");
                if(path && this.mod) {
                    path = Module._resolveFilename(path, this.mod, false, this.options);
                    if(path) {
                        obs.next(Module._cache[path]);
                    }
                } else {
                    obs.next(null);
                }
            } catch(e) {
                obs.error(e);
            }
        });
    }
}
