/**
 * The ES6 style autoload support
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 0.0.1
 * @date Thu Nov 30 11:28:41 2017
 */

const { safeGet, propGet, getFileContentsSync, getFileContents, fileExists } = require("./functions");
const path = require("path");
const fs = require("fs");
const { keys, isFunction, extend, isString } = require("underscore");
const handlebars = require("handlebars");
const Watcher = require("./watcher");

const TRACE_REGEX = /^at ([._a-zA-Z]+) \(([^:]+):([0-9]+):([0-9]+)\)$/;

const templateExists = (name) => {
    return fileExists(`templates/${name}.tpl`);
}

const errput = (err) => {
    log(err, {}, "ERROR");
}

const template = (template, context = {}) => {
    let t = handlebarTemplate(template);
    if(!t) {
        // Let's check if it is the file in the template path
        let filePath = path.join(__dirname, "templates", template + ".tpl");
        // Use the contents of the template file
        let temp = getFileContentsSync(filePath);
        if(!temp) {
            // If no content, will use the template key as the template itself
            temp = template;
        } else {
            temp = temp.toString("utf-8");
        }

        t = handlebars.compile(temp);
        handlebarTemplate(template, t);
    }
    return t(context);
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

const log = (msg, context = {}, level = "INFO", tag = null) => {
    let { stack } = new Error();
    stack = stack.split("\n");

    let data = parseTrace(stack[2]);
    if(data) {
        if(data.func == "debug") {
            // This is the debug function, let's use next level
            data = parseTrace(stack[3]);
        }
        if(data) {
            data.level = level;

            let prefix = template("{{level}}: [{{func}}]:{{line}} - ", data);
            if(tag) {
                console.log(prefix + template(msg, context), tag);
            } else {
                console.log(prefix + template(msg, context));
            }
        }
    } else {
        // We can't get the line numbers, let's fallback
        console.log(level + ": " + template(msg, context), tag);
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

const loaded = (path, value = null) => {
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

/**
 * The old require
 */
const _require = require;

/**
 * Reload the
 */
const reload = (path) => {
    // Since we want to reload, let's purge the load cache first
    purgeCache(path);
    // Using nodejs's loader to load it again
    let l = _require(path);

    if(l) {
        // The absolute path of this required module
        let realPath = _require.resolve(path);

        // Create the return proxy
        let ret = new Proxy(l, new ProxyHandler(realPath));

        // Add the real object into the registry
        loaded(realPath, l);
        // Add the proxy object into the registry too
        proxy(realPath, ret);

        return ret;
    }
    return false;
}

/**
 * The proxy handler to proxy all requests of the object to the global
 * registry
 */
class ProxyHandler {
    constructor(path) {
        this.path = path;
    }

    getObj() {
        return loaded(this.path);
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
            return safeGet(obj, prop);
        }
        return null;
    }

    set(target, property, value, receiver) {
        let obj = this.getObj();
        if(obj) {
            obj[property] = value;
        }
    }

    apply(target, thisArg, argumentsList) {
        let obj = this.getObj();
        if(obj) {
            debug(`Trying to call the proxied function in module ${this.path}`);
            obj.call(thisArg, argumentsList);
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
            return keys(obj);
        }
        return [];
    }

    construct (target, argumentsList, newTarget) {
        let obj = this.getObj();
        if(obj) {
            return new obj();
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
        delete _require.cache[mod.id];
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
    let mod = _require.resolve(moduleName);

    // Check if the module has been resolved and found within
    // the cache
    if (mod && ((mod = _require.cache[mod]) !== undefined)) {
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

/**
 * Load the module using the hot reload way
 */
const load = extend((path) => {
    debug(`Trying to load module at path ${path}`);

    let realPath = require.resolve(path);

    let l = proxy(realPath);

    if(l) {
        debug(`Returning the loaded registry for ${path}`);
        return l;
    }
    return reload(path);
}, _require);

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
            let m = reload(file_path);
            if(callback && isFunction(callback)) {
                callback(m, file_path, type);
            }
        }
    }, async);
}

module.exports = {
    cache, loaded, reload, fileExists, load, debug, log, registry, watcher, start_watch, end_watch, global_registry, watch_and_reload
}
