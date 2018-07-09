"use strict";
/**
 * This is the implementation for the moudle resolver for NodeJS
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @date Mon Apr 30 15:23:49 2018
 */
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
require("rxjs/add/observable/of");
class NodeModuleResolver {
    constructor(mod = null, options = {}) {
        if (!mod) {
            // We don't have module set, let's use the top most module as default
            mod = this.getTopMost(module);
        }
        this.mod = mod;
        this.options = options;
    }
    getTopMost(mod) {
        while (mod && mod.parent) {
            mod = mod.parent;
        }
        return mod;
    }
    resolve(path) {
        return rxjs_1.Observable.create(obs => {
            try {
                // Let's requite the module directly
                const Module = require("module");
                if (path && this.mod) {
                    path = Module._resolveFilename(path, this.mod, false, this.options);
                    if (path) {
                        obs.next(Module._cache[path]);
                    }
                }
                else {
                    obs.next(null);
                }
            }
            catch (e) {
                obs.error(e);
            }
        });
    }
}
exports.NodeModuleResolver = NodeModuleResolver;
//# sourceMappingURL=NodeModuleResolver.js.map