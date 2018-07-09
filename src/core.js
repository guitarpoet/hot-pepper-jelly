"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const Repository_1 = require("./Repository");
require("rxjs/add/observable/of");
require("rxjs/add/observable/defer");
require("rxjs/add/operator/first");
require("rxjs/add/operator/filter");
require("rxjs/add/operator/concat");
const tinyliquid = require("tinyliquid");
const lodash_1 = require("lodash");
/**
 * This function will check if the environment is in the NodeJS
 */
exports.isNode = rxjs_1.Observable.create(obs => {
    if (typeof module !== "undefined" && module.exports) {
        // We are in the common js environment, if we do have the DOM, we can assume that we are not in the NodeJS, or we are the other way
        obs.next(typeof window === "undefined");
    }
    else {
        // We are not in the common js environment, which means we are not in NodeJS
        obs.next(false);
    }
});
/**
 * This is the global registry for this repository
 */
exports._global = new Repository_1.SimpleRepository();
/**
 * Get or create a repository from the global repository
 */
exports.registry = (name) => {
    return exports._global.get(name) // Try get the value first
        .flatMap(r => {
        if (!r) {
            // If the value is null
            return exports._global.set(name, new Repository_1.SimpleRepository())
                .flatMap(g => g.get(name)); // And get the get result
        }
        else {
            return rxjs_1.Observable.of(r);
        }
    });
};
/**
 * The short cut to get the global registry
 */
exports.registry_value = (reg, name, value = null) => {
    if (value) {
        // Get the registry first
        return exports.registry(reg)
            // Then set it to the registry
            .flatMap(r => r.set(name, value))
            // Then get the value from it
            .flatMap(r => r.get(name));
    }
    // We are tring to get
    return exports.registry(reg).flatMap(r => r.get(name));
};
exports.global_registry = (name, value = null) => {
    return exports.registry_value("global", name, value);
};
exports.template_registry = (name, value = null) => {
    return exports.registry_value("global", name, value);
};
exports.features_enabled = (...features) => {
    return exports.enabled_features().map(fs => {
        for (let feature of features) {
            if (!fs[feature]) {
                return false;
            }
        }
        return true;
    });
};
exports.enabled_features = () => {
    return exports.global_registry("features").map(i => i ? i : {});
};
exports.enable_features = (features = {}) => {
    return exports.enabled_features().flatMap(orig => exports.global_registry("features", lodash_1.extend(features, orig)));
};
exports.template = (template, context = {}) => {
    let getTemplate = exports.template_registry(template).filter(r => !!r);
    let setTemplate = rxjs_1.Observable.defer(() => {
        return exports.template_registry(template, tinyliquid.compile(template));
    });
    return getTemplate.concat(setTemplate).first().flatMap(render => {
        return rxjs_1.Observable.create(obs => {
            let c = tinyliquid.newContext({
                locals: context
            });
            render(c, err => {
                if (err) {
                    obs.error(err);
                }
                else {
                    obs.next(c.getBuffer());
                }
                obs.complete();
            });
        });
    });
};
exports.print = (context = "") => (obj) => (!console.info(context, obj) && obj);
exports.tokenizePath = (path) => {
    let paths = path.split(".");
    let ret = [];
    while (paths.length) {
        // Add the paths into the ret
        ret.push(paths.join("."));
        // Remove the last path
        paths.pop();
    }
    return ret;
};
exports.paths = (obj) => {
    let ret = [];
    if (lodash_1.isObject(obj)) {
        // If this is an object
        for (let p in obj) {
            ret.push(p);
            ret = ret.concat(exports.paths(obj[p]).map(t => p + "." + t));
        }
    }
    else if (lodash_1.isArray(obj)) {
        // If this is an array
        for (let i = 0; i <= obj.length; i++) {
            ret.push(i + "");
            ret = ret.concat(exports.paths(obj[i]));
        }
    }
    return ret;
};
//# sourceMappingURL=core.js.map