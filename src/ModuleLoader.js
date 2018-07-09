"use strict";
/**
 *
 * This is the interface which provides the functions definitions for the module loader
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @date Sat Jul  7 15:13:56 2018
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("./core");
const Observable_1 = require("rxjs/Observable");
require("rxjs/add/observable/of");
require("rxjs/add/operator/mergeMap");
require("rxjs/add/operator/concat");
const lodash_1 = require("lodash");
class AbstractModuleLoader {
    constructor() {
        this.proxies = {};
        this.origins = {};
    }
    getProxy(path) {
        return this.proxies[path];
    }
    getOrigin(mod) {
        return this.origins[mod];
    }
    load(mod) {
        // Let's resolve it first
        return this.resolve(mod)
            .flatMap(r => {
            if (r) {
                // Use the cache one if it is already there
                let c = this.proxies[r];
                if (c) {
                    return Observable_1.Observable.of(c);
                }
                return core_1.features_enabled("hotload").flatMap(enabled => {
                    let ret = this._load(r);
                    if (enabled) {
                        // Store the original object into the local object map
                        ret = ret.map(m => this.origins[r] = m && m)
                            // Will try proxy it when loaded
                            .flatMap(obj => this.proxy(obj, r));
                    }
                    return ret;
                });
            }
            // Since it is not resolved, let's just return null
            return Observable_1.Observable.of(null);
        });
    }
    /**
     * Apply the proxy if needed
     */
    proxy(obj, path) {
        let proxy = new Proxy(obj, new ProxyHandler(this, path));
        this.proxies[path] = proxy;
        return Observable_1.Observable.of(proxy);
    }
    /**
     * Purge the module, it is platform dependent
     */
    purge(mod) {
        delete this.proxies[mod];
        return null;
    }
    reload(mod) {
        return this.resolve(mod).flatMap(r => r ? this.purge(r) : Observable_1.Observable.of(false)).flatMap(b => {
            if (b) {
                // Only load if it is a valid module
                return this.load(mod);
            }
            return Observable_1.Observable.of(null);
        });
    }
    loaded(mod) {
        return this.find(mod).map(r => !!r);
    }
    /**
     * The function to access the cached result, if the key is null, then return the whole cache, this is platform dependent
     */
    cache(key = null) {
        return null;
    }
    /**
     * Do the load, this is platform dependent
     */
    _load(mod) {
        return null;
    }
    /**
     * Try to find the module in the module cache, if it is not found, will
     */
    find(mod) {
        // Let's resolve it first
        return this.resolve(mod).map(r => {
            if (r) {
                // If resolved, let's check if it is in the cache
                let m = this.cache(r);
                if (m) {
                    return m;
                }
            }
            return null;
        });
    }
    /**
     * Resolve the module's real path, this is platform dependent
     */
    resolve(mod) {
        return null;
    }
}
exports.AbstractModuleLoader = AbstractModuleLoader;
/**
 * The handler for proxy the objects
 */
class ProxyHandler {
    constructor(loader, path, prop = null) {
        this.loader = loader;
        this.path = path;
        this.prop = prop;
    }
    getObj() {
        let obj = this.loader.getOrigin(this.path);
        if (!obj) {
            return null;
        }
        return this.prop ? obj[this.prop] : obj;
    }
    getPrototypeOf(target) {
        let obj = this.getObj();
        if (obj) {
            return Object.getPrototypeOf(obj);
        }
        return null;
    }
    setPrototypeOf(target, prototype) {
        let obj = this.getObj();
        if (obj) {
            return Object.setPrototypeOf(obj, prototype);
        }
        return false;
    }
    isExtensible(target) {
        let obj = this.getObj();
        if (obj) {
            return Object.isExtensible(obj);
        }
        return false;
    }
    preventExtensions(target) {
        let obj = this.getObj();
        if (obj) {
            return Object.preventExtensions(obj);
        }
        return false;
    }
    getOwnPropertyDescriptor(target, prop) {
        let obj = this.getObj();
        if (obj) {
            return Object.getOwnPropertyDescriptor(obj, prop);
        }
        return null;
    }
    defineProperty(target, prop, descriptor) {
        let obj = this.getObj();
        if (obj) {
            return Object.defineProperty(obj, prop, descriptor);
        }
        return false;
    }
    has(target, prop) {
        let obj = this.getObj();
        if (obj) {
            return prop in obj;
        }
        return false;
    }
    get(target, prop, receiver) {
        let obj = this.getObj();
        if (obj && prop) {
            if (prop === "__proto__") {
                return obj.prototype;
            }
            if (prop === "constructor") {
                return obj;
            }
            let ret = lodash_1.get(obj, prop);
            if (!this.prop) {
                if (!ret || lodash_1.isDate(ret) || lodash_1.isString(ret) || lodash_1.isNumber(ret) || lodash_1.isSymbol(prop)) {
                    // We don't need to proxy string and numbers and dates, and the symbol properties
                    return ret;
                }
                // If this is the root proxy, let's check if we do have the second proxy
                let p = "__proxy__" + prop;
                let tmp = lodash_1.get(obj, p);
                if (!tmp) {
                    // We don't have the second proxy, let's create it
                    tmp = new Proxy(ret, new ProxyHandler(this.loader, this.path, prop));
                    // Set the second proxy into the object
                    obj[p] = tmp;
                }
                // Let's return the second proxy
                ret = tmp;
            }
            return ret;
        }
        return null;
    }
    set(target, property, value, receiver) {
        let obj = this.getObj();
        if (obj) {
            obj[property] = value;
            if (!this.prop) {
                // If this is the root object, remove the second level proxy of this property, to refresh it.
                delete obj["__proxy__" + property];
            }
        }
        return true;
    }
    apply(target, thisArg, argumentsList) {
        let obj = this.getObj();
        if (obj) {
            if (thisArg) {
                return obj.apply(thisArg, argumentsList);
            }
            else {
                return obj.apply(obj, argumentsList);
            }
        }
        return null;
    }
    deleteProperty(target, property) {
        let obj = this.getObj();
        if (obj) {
            delete obj[property];
            return true;
        }
        return false;
    }
    ownKeys(target) {
        let obj = this.getObj();
        if (obj) {
            let ret = lodash_1.keys(obj).filter((name) => !name.match(/__proxy__.*/));
            // Add prototype since this is a proxy
            ret.push("prototype");
            return ret;
        }
        return [];
    }
    getPrototype() {
        let self = this;
        if (!this._proto) {
            this._proto = new Proxy(this.getObj().prototype, {
                get(target, prop, receiver) {
                    if (prop === "constructor") {
                        return target;
                    }
                    if (prop === "__proto__") {
                        return target.prototype;
                    }
                    // Let's check the property is in the object first
                    if (prop in target) {
                        return target[prop];
                    }
                    let obj = self.getObj();
                    return lodash_1.get(obj, prop);
                }
            });
        }
        return this._proto;
    }
    construct(target, argumentsList, newTarget) {
        let obj = this.getObj();
        let self = this;
        if (obj) {
            let ret = new obj(...argumentsList);
            return new Proxy(ret, {
                get(target, prop, receiver) {
                    obj = self.getObj();
                    if (prop === "constructor") {
                        return obj;
                    }
                    if (prop === "__proto__") {
                        return obj.prototype;
                    }
                    // Let's check the property is in the object first
                    if (prop in obj.prototype) {
                        return obj.prototype[prop];
                    }
                    return lodash_1.get(target, prop);
                }
            });
        }
        return null;
    }
}
exports.ProxyHandler = ProxyHandler;
//# sourceMappingURL=ModuleLoader.js.map