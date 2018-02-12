/**
 * The ES6 style autoload support
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 1.0.0
 * @date Thu Nov 30 11:28:41 2017
 * @date-1.0 Mon Feb 12 15:56:33 2018
 */

const { safeGet, propGet, getFileContentsSync, getFileContents } = require("./functions");
const path = require("path");
const fs = require("fs");
const { keys, isDate, isNumber, isFunction, extend, isString, isArray, isSymbol } = require("lodash");
const handlebars = require("handlebars");
const Watcher = require("./watcher");
const Module = require("module");

const TRACE_REGEX = /^at ([<>._a-zA-Z]+) \(([^:]+):([0-9]+):([0-9]+)\)$/;

const updateNodePath = (paths = []) => {
    // Let's get the node path first
    let p = process.env.NODE_PATH;

    // Let's get the path of this
    let pwd = path.resolve(path.join(__dirname, ".."));

    if(isArray(paths)) {
        // Add midori's path anyway
        paths.push(`${pwd}/node_modules/@guitarpoet/midori`);
    }

    if(p) {
        p = `${pwd}:${pwd}/node_modules:` + paths.join(":");
    } else {
        p = `${pwd}:${pwd}/node_modules:` + process.env.NODE_PATH + ":";
        p += paths.join(":");
    }

    // Let's update nodejs's path
    process.env.NODE_PATH = p;
    if(typeof Module !== "undefined") {
        // Update the require if in NodeJS
        Module._initPaths();
    }
    return p;
}

const errput = (err) => {
    log(err, {}, "ERROR");
}

const appendIfNotExists = (i, arr) => {
    if(isArray(arr) && arr.indexOf(i) === -1) {
        arr.push(i);
        return arr;
    }
    return false;
}

/**
 * Resolve the templates
 */
const resolveTemplate = (template) => {
    // The template paths registry, will store all template paths we have resolved
    let templatePathReg = registry("template_paths");

    if(feature_enabled("template_file")) {
        // Check if the template path registry is already there and valid
        let p = templatePathReg.get(template);
        if(p) {
            if(fs.existsSync(p)) {
                // This is the file, and it exists, let's get the contents of it
                return getFileContentsSync(p);
            } else {
                // This is just a stored string, let's return it
                return p;
            }
        }

        // It is not in the registry, let's find it
        let templatePath = global_registry("template_path") || [];

        // Will add current dir, templates, and node_module path to the template path automaticly
        appendIfNotExists(process.cwd(), templatePath);
        appendIfNotExists(path.join(process.cwd(), "templates"), templatePath);
        appendIfNotExists(path.join(process.cwd(), "node_modules"), templatePath);

        if(feature_enabled("node_template_file")) {
            // If search the template file in node path is enabled
            let nodePath = process.env.NODE_PATH || "";
            // Add each node path into the template paths
            nodePath.split(path.delimiter).map(p => appendIfNotExists(p, templatePath));
        }

        let extension = global_registry("template_ext") || ".hbs";
        let fileName = template;
        // Then, let's resolve the template file
        if(!fileName.endsWith(extension)) {
            // Let's add the file extension automaticly
            fileName = fileName + extension;
        }

        for(let p of templatePath) {
            let filePath = path.join(p, fileName);
            if(fs.existsSync(filePath)) {
                // Found, let's put the path of it into the registry
                templatePathReg.set(template, filePath);
                // Let's get the contents of it
                return getFileContentsSync(filePath);
            }
        }
    }

    // No template file found, will treat the template string itself as template, add it into the registry
    templatePathReg.set(template, template);
    // Return it
    return template;
}

const template = (template, context = {}, cache = true) => {
    let t = cache? handlebarTemplate(template): null;
    if(!t) {
        // Let's resolve and compile the template
        t = handlebars.compile(resolveTemplate(template));

        // Cache the template if needed;
        cache && handlebarTemplate(template, t);
    }
    return t(context);
}

const getCaller = () => {
    let { stack } = new Error();
    stack = stack.split("\n");

    if(stack.length > 1) {
        let caller = parseTrace(stack[3]);
        if(caller.file == __filename) {
            // We are calling from ourselves
            caller = parseTrace(stack[4]);
        }
        return caller;
    }
    return {};
}

const parseTrace = (msg) => {
    if(msg) {
        let data = msg.trim().match(TRACE_REGEX);
        if(data) {
            let func = data[1];
            let file = data[2];
            let line = data[3];
            let col = data[4];
            return { func, file, line, col };
        }
    }
    return null;
}

const log = (msg, context = {}, level = "INFO", tag = null, sink = "default") => {
    let { stack } = new Error();
    stack = stack.split("\n");

    let theSink = safeGet(global_registry("sinks"), sink, console.log);

    let data = parseTrace(stack[2]);
    if(data) {
        if(data.func == "debug") {
            // This is the debug function, let's use next level
            data = parseTrace(stack[3]);
        }
        if(data) {
            data.level = level;

            let prefix = template("[{{func}}]:{{line}} - ", data);
            if(tag) {
                theSink(prefix + template(msg, context), level, tag);
            } else {
                theSink(prefix + template(msg, context), level);
            }
        }
    } else {
        // We can't get the line numbers, let's fallback
        theSink(template(msg, context), level, tag);
    }
}


const debug = (msg, context = {}, tag = null) => {
    log(msg, context, "DEBUG", tag);
}

/**
 * The registry for recording the value changes
 */
class Registry {
    constructor(name, value, repository, expiredDate = null) {
        this.name = name;
        this.value = value;
        this.repository = repository;
        this.createDate = new Date();
        this.modifyDate = this.createDate;
        this.expiredDate = expiredDate;
    }

    update(value) {
        this.value = value;
        this.modifyDate = new Date();
        return value;
    }

    isExpired() {
        return this.expiredDate && this.expiredDate.getTime() <= new Date().getTime();
    }

    get() {
        if(this.isExpired()) {
            return null;
        }
        return this.value;
    }
}

/**
 * The registry repository, support the sync and async access support for
 * accessing the registries in it.
 */
class RegistryRepository {
    constructor() {
        // Initialize the registries
        this._registries = {};
    }

    /**
     * Get the registry, and create it if not found
     */
    getRegistry(name, create = true) {
        let r = safeGet(this._registries, name);
        if(!r && create) {
            r = new Registry(name, null, this);
            this._registries[name] = r;
        }
        return r;
    }

    set(name, value) {
        return this.getRegistry(name).update(value);
    }

    get(name, defaultValue = null) {
        let v = this.getRegistry(name).get();
        if(v) {
            return v;
        }
        return defaultValue;
    }

    doGet(name, defaultValue = null) {
        return new Promise((resolve, reject) => {
            resolve(this.get(name, defaultValue));
        });
    }

    doSet(name, value) {
        return new Promise((resolve, reject) => {
            this.set(name, value);
            resolve(this);
        });
    }
}

// The global registry repository
const _global = new RegistryRepository();

const registry = (name) => {
    let r = _global.get(name);
    if(!r) {
        r = new RegistryRepository();
        _global.set(name, r);
    }
    return r;
}

const handlebarTemplate = (name, value = null) => {
    if(name) {
        let r = registry("templates");
        if(value) {
            // Setter
            r.set(name, value);
        } else {
            // Getter
            value = r.get(name);
        }
    }
    return value;
}

const cache = (name, value = null) => {
    if(name) {
        let r = registry("cache");
        if(value) {
            // Setter
            r.set(name, value);
        } else {
            // Getter
            value = r.get(name);
        }
    }
    return value;
}

const proxy = (path, value = null) => {
    if(path) {
        let r = registry("proxies");
        if(value) {
            // Setter
            r.set(path, value);
        } else {
            // Getter
            value = r.get(path);
        }
    }
    return value;
}

const loaded = (path, value = null, caller = null) => {
    if(!feature_enabled("hotload")) {
        // If the hotload feature is not enabled, let's just try find it in nodejs's cache
        return searchCacheSync(path);
    }
    let r = registry("modules");
    if(path) {
        if(value) {
            // Setter
            r.set(path, value);
        } else {
            // Getter
            value = r.get(path);
        }
    } else {
        return r;
    }
    return value;
}

const _reload = (path, caller = null) => {
    // The absolute path of this required module
    let realPath = resolvePath(path, caller);

    if(!realPath) {
        return false;
    }
    // Since we want to reload, let's purge the load cache first
    purgeCache(realPath);

    // Using nodejs's loader to load it again
    return require(realPath);
}

const proxyObj = (l, realPath) => {
    // Create the return proxy
    let ret = new Proxy(l, new ProxyHandler(realPath));

    // Add the real object into the registry
    loaded(realPath, l);
    // Add the proxy object into the registry too
    proxy(realPath, ret);

    return ret;
}

/**
 * The proxy handler to proxy all requests of the object to the global
 * registry
 */
class ProxyHandler {
    constructor(path, prop = null) {
        this.path = path;
        this.prop = prop;
    }

    getObj() {
        let obj = loaded(this.path);
        // Return the object if we don't support the property, but if we do have the property, we should return the property of this object instead
        return this.prop? obj[this.prop]: obj;
    }

    getPrototypeOf(target) {
        let obj = this.getObj();
        if(obj) {
            return Object.getPrototypeOf(obj);
        }
        return null;
    }

    setPrototypeOf (target, prototype) {
        let obj = this.getObj();
        if(obj) {
            Object.setPrototypeOf(obj, prototype);
        }
    }

    isExtensible(target) {
        let obj = this.getObj();
        if(obj) {
            return Object.isExtensible(obj);
        }
    }

    preventExtensions(target) {
        let obj = this.getObj();
        if(obj) {
            return Object.preventExtensions(obj);
        }
    }

    getOwnPropertyDescriptor(target, prop) {
        let obj = this.getObj();
        if(obj) {
            return Object.getOwnPropertyDescriptor(obj, prop);
        }
    }

    defineProperty(target, prop, descriptor) {
        let obj = this.getObj();
        if(obj) {
            return Object.defineProperty(obj, prop, descriptor);
        }
    }

    has(target, prop) {
        let obj = this.getObj();
        if(obj) {
            return prop in obj;
        }
    }

    get(target, prop, receiver) {
        let obj = this.getObj();
        if(obj && prop) {
            let ret = safeGet(obj, prop);
            if(!this.prop) {
                if(!ret || isDate(ret) || isString(ret) || isNumber(ret) || isSymbol(prop)) {
                    // We don't need to proxy string and numbers and dates, and the symbol properties
                    return ret;
                }
                // If this is the root proxy, let's check if we do have the second proxy
                let p = "__proxy__" + prop;
                let tmp = safeGet(obj, p);
                if(!tmp) {
                    // We don't have the second proxy, let's create it
                    tmp = new Proxy(ret, new ProxyHandler(this.path, prop));
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
        if(obj) {
            obj[property] = value;
            if(!this.prop) {
                // If this is the root object, remove the second level proxy of this property, to refresh it.
                delete obj["__proxy__" + property];
            }
        }
    }

    apply(target, thisArg, argumentsList) {
        let obj = this.getObj();
        if(obj) {
            debug(`Trying to call the proxied function in module ${this.path}`);
            if(thisArg) {
                obj.apply(thisArg, argumentsList);
            } else {
                obj.apply(obj, argumentsList);
            }
        }
        return null;
    }

    deleteProperty(target, property){
        let obj = this.getObj();
        if(obj) {
            delete obj[property];
        }
    }

    ownKeys (target)  {
        let obj = this.getObj();
        if(obj) {
            let ret = keys(obj).filter((name) => !name.match(/__proxy__.*/));
            // Add prototype since this is a proxy
            ret.push("prototype");
            return ret;
        }
        return [];
    }

    getPrototype() {
        if(!this._proto) {
            this._proto = new Proxy(this.getObj(), {
                has: (target, prop) => {
                    let obj = this.getObj().prototype;
                    if(obj) {
                        return prop in obj;
                    }
                },

                getOwnPropertyDescriptor: (target, prop) => {
                    let obj = this.getObj().prototype;
                    if(obj) {
                        return Object.getOwnPropertyDescriptor(obj, prop);
                    }
                },

                get: (target, prop, receiver) => {
                    let obj = this.getObj().prototype;
                    return safeGet(obj, prop);
                }
            });
        }
        return this._proto;
    }

    construct (target, argumentsList, newTarget) {
        let obj = this.getObj();
        if(obj) {
            let ret = new obj(...argumentsList);
            // Update the prototype of the return object to be this
            ret.__proto__ = this.getPrototype();
            return ret;
        }
        return null;
    }
}

/**
 * Removes a module from the cache
 */
const purgeCache = (moduleName) => {
    // Traverse the cache looking for the files
    // loaded by the specified module name
    searchCache(moduleName, (mod) => {
        delete require.cache[mod.id];
    });

    // Remove cached paths to the module.
    // Thanks to @bentael for pointing this out.
    Object.keys(module.constructor._pathCache).map((cacheKey) => {
        if (cacheKey.indexOf(moduleName) > 0) {
            delete module.constructor._pathCache[cacheKey];
        }
    });
};

/**
 * Traverses the cache to search for all the cached
 * files of the specified module name
 */
const searchCache = (moduleName, callback) => {
    // Resolve the module identified by the specified name
    let mod = require.resolve(moduleName);

    // Check if the module has been resolved and found within
    // the cache
    if (mod && ((mod = require.cache[mod]) !== undefined)) {
        // Recursively go over the results
        ((mod) => {
            // Go over each of the module's children and
            // traverse them
            // mod.children.map((child) => traverse(child));

            // Call the specified callback providing the
            // found cached module
            callback(mod);
        })(mod);
    }
};

const searchCacheSync = (moduleName) => {
    let mod = require.resolve(moduleName);
    if (mod && ((mod = require.cache[mod]) !== undefined)) {
        return mod;
    }
    return false;
}

const resolvePath = (p, caller = null) => {
    // Let's try the path first
    try {
        let ret = require.resolve(p);
        if(ret) {
            return ret;
        }
    }
    catch(ex) {
        // We can't resolve it, let's check if the caller exists
        if(caller && isString(caller)) {
            let ret = require.resolve(path.join(path.dirname(caller), p));
            if(ret) {
                return ret;
            }
        }
    }
    return false;
}

/**
 * Load the module using the hot reload way
 */
const load = (path, reload = false, resolver = null) => {
    let realPath = false;
    if(resolver && isFunction(resolver)) {
        realPath = resolver(path);
    } else {
        let caller = getCaller().file;
        debug(`Trying to load module at path ${path} for caller ${caller}`);

        realPath = resolvePath(path, caller);
    }
    if(!realPath) {
        debug("Can't find path to load {{path}}", {path});
        return false;
    }

    if(!feature_enabled("hotload")) {
        // If we don't ahve the hotload feature enabled, let's just require it
        return require(realPath);
    }


    let l = proxy(realPath);

    if(l && !reload) {
        return l;
    }
    return _reload(realPath);
};

const reload = (path) => {
    return load(path, true);
}

const watcher = () => {
    let w = global_registry("watcher");
    if(!w) {
        w = new Watcher();
        global_registry("watcher", w);
    }
    return w;
}

const start_watch = (files = [], callback = null, async = true) => {
    // Make this function run in background thread
    let f = () => {
        let w = watcher();
        if(!w.watching()) {
            w.watch(files, callback);
        }
    };
    async? setTimeout(f, 0): f();
}

const end_watch = () => {
    let w = watcher();
    if(w.watching()) {
        w.endWatch();
    }
}

const global_registry = (name, value = null) => {
    if(value) {
        return _global.set(name, value);
    } else {
        return _global.get(name);
    }
}

const watch_and_reload = (files = [], callback = null, async = true) => {
    start_watch(files, (file_path, type) => {
        if(file_path.match(/.js$/) || file_path.match(/.json$/)) {
            // Only check for js and json
            debug("Reloading file {{file_path}}", {file_path});
            // Reload the sample anytime any file is changed
            let m = _reload(file_path);
            if(callback && isFunction(callback)) {
                callback(m, file_path, type);
            }
        }
    }, async);
}

/**
 * Enable the features using the hash
 */
const enable_features = (features = {}) => {
    if(features.hotload && !Module._orig_load) {
        // We need enable the hot load hooks if we indeed wants hotload
        hookModuleRequire();
    }
    global_registry("features", extend(features, enabled_features()));
}

/**
 * Get the global enabled features
 */
const enabled_features = () => {
    return global_registry("features") || {};
}

/**
 * Check if the feature is enabled
 */
const feature_enabled = (feature) => {
    return !!feature && !!enabled_features()[feature];
}

/**
 * Enable the hot load into the global features
 */
const enable_hotload = () => {
    enable_features({hotload: true});
}

/**
 * This is added for the 1.0 feature, that will just use requie to provide the reload functions
 *
 * @api 1.0
 */
const hookModuleRequire = () => {
    let { _load } = Module;
    // Let's save the original _load function to another slot
    Module._orig_load = _load;
    // Then, replace it with our own
    Module._load = (request, parent, isMain) => {
        let realPath = Module._resolveFilename(request, parent, isMain);
        let proxyPatterns = global_registry("module_proxy_patterns") || [];
        let obj = _load(request, parent, isMain);
        if(proxyPatterns && isArray(proxyPatterns) && proxyPatterns.length > 0) {
            if(proxyPatterns.filter(p => realPath.match(p)).length == 0) {
                // The path didn't match any pattern, let's just return the object
                return obj;
            }
        }
        return proxyObj(obj, realPath);
    }
}

/**
 * Wrapper for Promise to add the Chain support functions
 */
class MyPromise extends Promise {
    constructor(callback) {
        super(callback);
    }

    chain(callback) {
        return this.then(chain(callback));
    }
}

/**
 * The syntax sugar to make the chain easier
 */
const chain = (callback = null) => {
    let ret = function() {
        let args = Array.from(arguments);

        // The callback is an array
        if(isArray(callback)) {
            if(!callback.length) {
                // If there is no callback in the chain, just resolve the args
                return new Promise((resolve, reject) => resolve.apply(null, args));
            }
            let c = callback.shift();
            // Start the chain
            let cc = chain(c).apply(null, args);

            while(callback.length) {
                c = callback.shift();
                cc = cc.then(chain(c));
            }
            return cc;
        }

        return new MyPromise((resolve, reject) => {
            if(isFunction(callback)) {
                let result = callback.apply(null, args);
                if(result instanceof Promise) {
                    // If the callback returns a promise, let's call the promise
                    return result.then(resolve);
                } else {
                    resolve(result); // Call the callback function
                }
            } else {
                resolve(args);
            }
        });
    }

    if(isFunction(callback) || isArray(callback)) {
        return ret;
    } else {
        // Let's treat chain as a starter
        return ret(callback);
    }
}

function pipe(obj) {
    let args = Array.from(arguments);
    return function() {
        return chain(Array.from(arguments)).apply(null, args);
    }
}

module.exports = {
    cache, loaded, reload, load, debug, log, registry, watcher, start_watch, end_watch, global_registry, watch_and_reload, getCaller, resolvePath, enable_hotload, enable_features, template,
    enabled_features, feature_enabled, chain, handlebarTemplate, pipe, updateNodePath
}
