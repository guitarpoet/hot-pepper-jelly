"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const Repository_1 = require("./Repository");
const tinyliquid = require("tinyliquid");
const lodash_1 = require("lodash");
/**
 * This is the holder that will be used for advanced operations
 */
const $holder = {};
/**
 * This function will try to get the value in the holder or update it first then getting it
 */
exports.holder = (name, value = null) => {
    if (value) {
        // Update the value of holder if needed
        $holder[name] = value;
    }
    if ($holder[name] instanceof rxjs_1.Observable) {
        return $holder[name];
    }
    else {
        return rxjs_1.defer(() => rxjs_1.of($holder[name]));
    }
};
/**
 * This is the loading support for all streams, it will create a loader for each request, and reuse that loader, and then save the result in the holder so that after the loading, all request will just get from the holder
 */
exports.loader = (name, obs) => {
    const loaderName = `{{${name}}}`;
    if ($holder[name]) {
        return rxjs_1.of($holder[name]);
    }
    if (!$holder[loaderName]) {
        // Let's create the loader now
        const s = new rxjs_1.Subject();
        setTimeout(() => {
            // Then, let's call the observable
            obs.subscribe({
                next(data) {
                    // Put it into the holder
                    $holder[name] = data;
                    s.next(data);
                },
                error(e) {
                    s.error(e);
                },
                complete() {
                    s.complete();
                }
            });
        }, 0);
        $holder[loaderName] = s;
    }
    return $holder[loaderName];
};
/**
 * This function will try the observables one by one and only take the first one
 * by the way
 */
function tryFirst(...obs) {
    return rxjs_1.concat.apply(null, obs)
        .pipe(operators_1.filter((n) => n !== null && typeof n !== "undefined"), operators_1.first(), operators_1.map((n) => n));
}
exports.tryFirst = tryFirst;
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
    obs.complete();
});
/**
 * This is the global registry for this repository
 */
exports._global = new Repository_1.SimpleRepository();
/**
 * Get or create a repository from the global repository
 */
exports.registry = (name) => {
    return tryFirst(
    // Try get it first(filter out the null ones)
    exports._global.get(name).pipe(operators_1.filter(n => n !== null)), 
    // If not exists, let's set one, and return it
    rxjs_1.defer(() => {
        return exports._global.set(name, new Repository_1.SimpleRepository()).pipe(operators_1.flatMap(() => exports._global.get(name)));
    }));
};
/**
 * The short cut to get the global registry
 */
exports.registry_value = (reg, name, value = null) => {
    const r = exports.registry(reg);
    if (value) {
        return r.pipe(operators_1.flatMap((r) => r.set(name, value)), operators_1.flatMap((r) => r.get(name)));
    }
    // We are tring to get
    return r.pipe(operators_1.flatMap(r => {
        return r.get(name);
    }));
};
exports.global_registry = (name, value = null) => {
    return exports.registry_value("global", name, value);
};
exports.template_registry = (name, value = null) => {
    return exports.registry_value("global", name, value);
};
exports.features_enabled = (...features) => {
    return exports.enabled_features().pipe(operators_1.map((fs) => {
        for (let feature of features) {
            if (!fs[feature]) {
                return false;
            }
        }
        return true;
    }));
};
exports.enabled_features = () => {
    return exports.global_registry("features").pipe(operators_1.map(i => i ? i : {}));
};
exports.enable_features = (features = {}) => {
    return exports.enabled_features().pipe(operators_1.flatMap(orig => exports.global_registry("features", lodash_1.extend(features, orig))));
};
/**
 * Append the element to the array if it is not exists in the array
 */
exports.appendIfNotExists = (i, arr) => {
    if (lodash_1.isArray(arr) && arr.indexOf(i) === -1) {
        arr.push(i);
    }
    return arr;
};
exports.template = (template, context = {}) => {
    let getTemplate = exports.template_registry(template).pipe(operators_1.filter(r => !!r));
    let setTemplate = rxjs_1.defer(() => {
        return exports.template_registry(template, tinyliquid.compile(template));
    });
    return tryFirst(getTemplate, setTemplate).pipe(operators_1.flatMap(render => {
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
    }));
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
/**
 * Store the object into cache or retrieve it
 * TODO: Add local service(say mongo) support
 */
exports.cache = (name, value = null) => {
    // Let's get the cache registry first
    return exports.registry("cache").pipe(operators_1.flatMap((r) => {
        if (value) {
            return r.set(name, value).pipe(operators_1.flatMap(() => r.get(name)));
        }
        return r.get(name);
    }));
};
//# sourceMappingURL=core.js.map