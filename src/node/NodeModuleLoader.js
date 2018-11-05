"use strict";
/**
 * This is implementation of the ModuleLoader in nodejs
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @date Sat Jul  7 15:58:27 2018
 */
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const ModuleLoader_1 = require("../ModuleLoader");
const NodeResourceResolver_1 = require("./NodeResourceResolver");
const operators_1 = require("rxjs/operators");
const topMostModule = () => {
    let topmost = module;
    while (topmost.parent) {
        topmost = topmost.parent;
    }
    return topmost;
};
class NodeModuleLoader extends ModuleLoader_1.AbstractModuleLoader {
    constructor(mod = null) {
        super();
        if (!mod) {
            // If there is no resolver set, let's use the top most module for the resolver
            mod = topMostModule();
        }
        this.resolver = new NodeResourceResolver_1.NodeResourceResolver(mod);
    }
    purge(mod) {
        // Clear the super's cache first 
        super.purge(mod);
        let m = this.cache(mod);
        if (m) {
            delete require.cache[m.id];
        }
        else {
            return rxjs_1.of(false);
        }
        // Remove cached paths to the module.
        // Thanks to @bentael for pointing this out.
        let a = module.constructor;
        Object.keys(a._pathCache).map((cacheKey) => {
            if (cacheKey.indexOf(mod) > 0) {
                delete a._pathCache[cacheKey];
            }
        });
        return rxjs_1.of(true);
    }
    cache(key = null) {
        if (key) {
            return require.cache[key];
        }
        return require.cache;
    }
    _load(mod) {
        // Let's resolve it first
        return this.resolve(mod).pipe(operators_1.map(r => {
            if (r) {
                // If resolved
                return require(r);
            }
            return null;
        }));
    }
    resolve(mod) {
        return this.resolver.resolve(mod);
    }
}
exports.NodeModuleLoader = NodeModuleLoader;
//# sourceMappingURL=NodeModuleLoader.js.map