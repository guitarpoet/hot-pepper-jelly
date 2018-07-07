/**
 *
 * This is the interface which provides the functions definitions for the module loader
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @date Sat Jul  7 15:13:56 2018
 */


import { features_enabled } from "./core";
import { Observable } from "rxjs/Observable";
import "rxjs/add/observable/of";
import "rxjs/add/operator/mergeMap";
import "rxjs/add/operator/concat";
import { get, keys, isNumber, isString, isSymbol, isDate } from "lodash";

/**
 * The module loader is the loader that will support the module loading, which will provide the support for the hot reloading
 */
export interface ModuleLoader {
    /**
     * All modules loaded using the ModuleLoader will use the asynchronized way, so it can be exists across the platforms(say, CommonJS, and other loader frameworks), if the module is already loaded, will just return the loaded module instead of load it again.
     */
    load(mod:string):Observable<any>;

    /**
     * Reload the module again, this will purge the module cache and reload the module again
     */
    reload(mod:string):Observable<any>;

    /**
     * Test if the module is loaded or not
     */
    loaded(mod:string):Observable<boolean>;
}

export interface ObjectMap {
    [index: string]: any;
}

export abstract class AbstractModuleLoader implements ModuleLoader {
    private proxies:ObjectMap = {};
    private origins:ObjectMap = {};

    getProxy(path:string):any {
        return this.proxies[path];
    }

    getOrigin(mod:string):any {
        return this.origins[mod];
    }

    load(mod:string):Observable<any> {
        // Let's resolve it first
        return this.resolve(mod)
        .flatMap(r => {
            if(r) {
                // Use the cache one if it is already there
                let c = this.proxies[ r ];
                if(c) {
                    return Observable.of(c);
                }
                return this._load(r)
                // Store the original object into the local object map
                    .map(m => this.origins[r] = m && m)
                // Will try proxy it when loaded
                    .flatMap(obj => this.proxy(obj, r));
            }
            // Since it is not resolved, let's just return null
            return Observable.of(null);
        });
    }

    /**
     * Apply the proxy if needed
     */
    proxy(obj:any, path:string):Observable<any> {
        let proxy:any = new Proxy(obj, new ProxyHandler(this, path));
        this.proxies[path] = proxy;
        return Observable.of(proxy);
    }

    /**
     * Purge the module, it is platform dependent
     */
    purge(mod:string):Observable<boolean> {
        delete this.proxies[mod];
        return null;
    }

    reload(mod:string):Observable<any> {
        return this.resolve(mod).flatMap(r =>
            r? this.purge(r): Observable.of(false)
        ).flatMap(b => {
            if(b) {
                // Only load if it is a valid module
                return this.load(mod);
            }
            return Observable.of(null);
        });
    }

    loaded(mod:string):Observable<boolean> {
        return this.find(mod).map(r => !!r);
    }

    /**
     * The function to access the cached result, if the key is null, then return the whole cache, this is platform dependent
     */
    cache(key:string = null):any {
        return null;
    }

    /**
     * Do the load, this is platform dependent
     */
    _load(mod:string):Observable<any> {
        return null;
    }


    /**
     * Try to find the module in the module cache, if it is not found, will
     */
    find(mod:string):Observable<any> {
        // Let's resolve it first
        return this.resolve(mod).map(r => {
            if(r) {
                // If resolved, let's check if it is in the cache
                let m:any = this.cache(r);
                if(m) {
                    return m;
                }
            }
            return null;
        });
    }

    /**
     * Resolve the module's real path, this is platform dependent
     */
    resolve(mod:string):Observable<string> {
        return null;
    }
}

/**
 * The handler for proxy the objects
 */
export class ProxyHandler {
    private loader:AbstractModuleLoader;
    private path:string;
    private prop:string;
    private _proto:any;

    constructor(loader:AbstractModuleLoader, path:string, prop:string = null) {
        this.loader = loader;
        this.path = path;
        this.prop = prop;
    }

    getObj():any {
        let obj = this.loader.getOrigin(this.path);
        if(!obj) {
            return null;
        }
        return this.prop? obj[this.prop]: obj;
    }

    getPrototypeOf(target) {
        let obj:any = this.getObj();
        if(obj) {
            return Object.getPrototypeOf(obj);
        }
        return null;
    }

    setPrototypeOf (target, prototype):boolean {
        let obj:any = this.getObj();
        if(obj) {
            return Object.setPrototypeOf(obj, prototype);
        }
        return false;
    }

    isExtensible(target):boolean {
        let obj = this.getObj();
        if(obj) {
            return Object.isExtensible(obj);
        }
        return false;
    }

    preventExtensions(target):boolean {
        let obj = this.getObj();
        if(obj) {
            return Object.preventExtensions(obj);
        }
        return false;
    }

    getOwnPropertyDescriptor(target, prop):any {
        let obj = this.getObj();
        if(obj) {
            return Object.getOwnPropertyDescriptor(obj, prop);
        }
        return null;
    }


    defineProperty(target, prop: string | number | symbol, descriptor: PropertyDescriptor):boolean {
        let obj = this.getObj();
        if(obj) {
            return Object.defineProperty(obj, prop, descriptor);
        }
        return false;
    }

    has(target, prop):boolean {
        let obj = this.getObj();
        if(obj) {
            return prop in obj;
        }
        return false;
    }

    get(target:any, prop:string, receiver:any):any {
        let obj:any = this.getObj();
        if(obj && prop) {
            if (prop === "__proto__") {
                return obj.prototype;
            }

            if (prop === "constructor") {
                return obj;
            }
            let ret = get(obj, prop);
            if(!this.prop) {
                if(!ret || isDate(ret) || isString(ret) || isNumber(ret) || isSymbol(prop)) {
                    // We don't need to proxy string and numbers and dates, and the symbol properties
                    return ret;
                }
                // If this is the root proxy, let's check if we do have the second proxy
                let p = "__proxy__" + prop;
                let tmp = get(obj, p);
                if(!tmp) {
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
    set(target:any, property:string, value:any, receiver:any):boolean {
        let obj:any = this.getObj();
        if(obj) {
            obj[property] = value;
            if(!this.prop) {
                // If this is the root object, remove the second level proxy of this property, to refresh it.
                delete obj["__proxy__" + property];
            }
        }
        return true;
    }

    apply(target:any, thisArg:any, argumentsList:number):any {
        let obj:any = this.getObj();
        if(obj) {
            if(thisArg) {
                return obj.apply(thisArg, argumentsList);
            } else {
                return obj.apply(obj, argumentsList);
            }
        }
        return null;
    }

    deleteProperty(target:any, property:string|number|symbol):boolean{
        let obj:any = this.getObj();
        if(obj) {
            delete obj[property];
            return true;
        }
        return false;
    }

    ownKeys (target:any):Array<string>  {
        let obj:any = this.getObj();
        if(obj) {
            let ret:Array<string> = keys(obj).filter((name) => !name.match(/__proxy__.*/));
            // Add prototype since this is a proxy
            ret.push("prototype");
            return ret;
        }
        return [];
    }

    getPrototype():any {
        let self:any = this;
        if(!this._proto) {
            this._proto = new Proxy(this.getObj().prototype, {
                get (target, prop, receiver) {
                    if (prop === "constructor") {
                        return target;
                    }

                    if (prop === "__proto__") {
                        return target.prototype;
                    }

                    // Let's check the property is in the object first
                    if(prop in target) {
                        return target[prop];
                    }

                    let obj = self.getObj();

                    return get(obj, prop);
                }
            });
        }
        return this._proto;
    }

    construct (target:any, argumentsList:any, newTarget:any) {
        let obj:any = this.getObj();
        let self:any = this;
        if(obj) {
            let ret:any = new obj(...argumentsList);
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
                    if(prop in obj.prototype) {
                        return obj.prototype[prop];
                    }

                    return get(target, prop);
                }
            });
            // Update the prototype of the return object to be this
            ret.__proto__ = this.getPrototype();
            return ret;
        }
        return null;
    }
}
