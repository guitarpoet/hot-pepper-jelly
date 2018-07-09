"use strict";
/**
 * This is the Node implementation of the resource resolver
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @date Sun Apr 29 15:17:43 2018
 */
Object.defineProperty(exports, "__esModule", { value: true });
const interfaces_1 = require("../interfaces");
const Observable_1 = require("rxjs/Observable");
require("rxjs/add/observable/of");
require("rxjs/add/operator/mergeMap");
require("rxjs/add/operator/map");
exports.resolve = (request, mod = null) => Observable_1.Observable.create(obs => {
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
class NodeResourceResolver {
    constructor(mod) {
        this.mod = mod;
    }
    resolverType() {
        return Observable_1.Observable.create(obs => {
            obs.next(interfaces_1.TYPE_NODE);
        });
    }
    resolve(path) {
        // Let's just use the require function directly, so that we don't face the problem when trying to using it in the webpack
        return exports.resolve(path, this.mod);
    }
    getContentsInner(path, mod = null) {
        return this.resolve(path).flatMap(p => {
            if (p) {
                return Observable_1.Observable.create(obs => {
                    const fs = require("fs");
                    // We only need to read the file if the path is resolved
                    fs.readFile(p, "utf-8", (err, data) => {
                        try {
                            if (err) {
                                obs.error(err);
                            }
                            else {
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
            }
            else {
                return Observable_1.Observable.of(null);
            }
        });
    }
    getContents(path, resultType) {
        return this.getContentsInner(path, this.mod).map(data => interfaces_1.transformResult(data, resultType));
    }
}
exports.NodeResourceResolver = NodeResourceResolver;
//# sourceMappingURL=NodeResourceResolver.js.map