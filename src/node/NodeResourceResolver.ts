/**
 * This is the Node implementation of the resource resolver
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @date Sun Apr 29 15:17:43 2018
 */

import { ResourceResolver, TYPE_NODE, transformResult } from "../interfaces";
import { Observable, of } from "rxjs";
import { map, flatMap } from "rxjs/operators";

export const resolve = (request: string, mod: any = null): Observable<string> => Observable.create(obs => {
    // Get the module out
    const Module = require("module");

    if (mod == null) {
        // The mod is null, let's use the root module as the one we'll use
        mod = module;

        while (mod.parent) {
            mod = mod.parent;
        }
    }

    // Let's get the require paths then
    const paths = Module._resolveLookupPaths(request, mod, true);

    obs.next(Module._findPath(request, paths, true));
    obs.complete();
});

export class NodeResourceResolver implements ResourceResolver {

    private mod: any;

    public constructor(mod: any) {
        this.mod = mod;
    }

    public resolverType(): Observable<string> {
        return Observable.create(obs => {
            obs.next(TYPE_NODE);
        })
    }

    public resolve(path: string): Observable<string> {
        // Let's just use the require function directly, so that we don't face the problem when trying to using it in the webpack
        return resolve(path, this.mod);
    }

    getContentsInner(path: string, mod: any = null): Observable<string> {
        return this.resolve(path).pipe(
            flatMap(p => {
                if (p) {
                    return Observable.create(obs => {
                        const fs = require("fs");
                        // We only need to read the file if the path is resolved
                        fs.readFile(p, "utf-8", (err, data) => {
                            try {
                                if (err) {
                                    obs.error(err);
                                } else {
                                    obs.next(data);
                                }
                            }
                            catch (e) {
                                obs.next(e);
                            }
                            finally {
                                obs.complete();
                            }
                        });
                    });
                } else {
                    return of(null);
                }
            }));
    }

    getContents(path: string, resultType: string): Observable<any> {
        return this.getContentsInner(path, this.mod).pipe(map(data => transformResult(data, resultType)));
    }
}
