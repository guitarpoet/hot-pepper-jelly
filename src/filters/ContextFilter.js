"use strict";
/**
 * This is the filter that will provides the context support functions
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @date Fri Jul  6 00:08:59 2018
 */
Object.defineProperty(exports, "__esModule", { value: true });
const interfaces_1 = require("../interfaces");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const core_1 = require("../core");
const lodash_1 = require("lodash");
const ALIAS_PATTERN = /^\~([a-zA-Z_\-]+)/;
const COMPOSITE_PATTERN = /^\^([a-zA-Z_\-\/]+)/;
/**
 * This is the pattern used for recognize the context
 */
const CONTEXT_PATTERN = /[ \t]*#context ([a-zA-Z0-9\\._\/]+)$/; // Yes, sorry, we don't support blank in the file name
const PLACE_HOLDER_PATTERN = /\{\{[^\{\}]+\}\}/g;
/**
 * Will use the context
 */
exports.context = (file, resolver, base = {}) => {
    let thePath = null;
    let theContext = null;
    return (contents) => {
        let getThePath = rxjs_1.of(thePath);
        let setThePath = resolver.resolve(file).pipe(operators_1.map(p => (thePath = p) && p));
        let setTheContext = (contextFile) => (resolver.getContents(contextFile, interfaces_1.RESULT_TYPE_JSON)).pipe(operators_1.map(o => lodash_1.extend(base, o)));
        return core_1.tryFirst(getThePath, setThePath).pipe(operators_1.flatMap(path => {
            // Let's check the line if it is the context pattern
            let m = contents.match(CONTEXT_PATTERN);
            if (m) {
                // Then, let's get the json out
                theContext = setTheContext(m[1]);
                return rxjs_1.of(null);
            }
            else {
                if (theContext) {
                    // We only handle when context exists
                    if (contents.match(PLACE_HOLDER_PATTERN)) {
                        return theContext.pipe(operators_1.map(c => lodash_1.extend(c, { path })), operators_1.flatMap(c => core_1.template(contents, c)));
                    }
                }
                return rxjs_1.of(contents);
            }
        }), 
        // And filter out the null values
        operators_1.filter(i => i !== null));
    };
};
exports.text_array = () => (texts, contents) => texts.push(contents) && texts;
exports.text = (sep = "\n") => (texts, contents) => (texts += sep + contents) && texts;
exports.format = (format = interfaces_1.RESULT_TYPE_YAML) => (contents) => interfaces_1.transformResult(contents, format);
/**
 * This is the filter to add the $base extend support(using overlay)
 */
exports.process_base = (name = "$base") => (data) => processBase(name, data);
exports.process_alias = (aliases = null) => (data) => processAlias(aliases, data);
exports.process_composite = () => (data) => processComposites(data);
exports.process_object = (loader) => (data) => processObject(data, loader);
const processBase = (name, data) => {
    if (lodash_1.isObject(data)) {
        // Let's check if the data itself needs to be overlayed
        let $base = data[name];
        if ($base && lodash_1.isObject($base)) {
            // Now overlay it and return it
            data = overlay(processBase(name, $base), data);
        }
        // This data is object, let's process its fields
        for (let p in data) {
            if (p == name) {
                continue;
            }
            data[p] = processBase(name, data[p]);
        }
    }
    if (lodash_1.isArray(data)) {
        return data.map(d => processBase(name, d));
    }
    return data;
};
const overlay = (dest, src) => {
    if (lodash_1.isObject(dest) && lodash_1.isObject(src)) {
        let ret = {};
        // We only process objects
        for (let p in dest) {
            // Let's overlay the value
            ret[p] = overlay(dest[p], src[p]);
        }
        for (let p in src) {
            // Let's overlay the value that is not in the dest
            ret[p] = src[p];
        }
        return ret;
    }
    // Then, if the source has value, copy it, else use the default one
    return src ? src : dest;
};
const processAlias = (aliases, data) => {
    if (data.$aliases) {
        // If there is the aliases in the data, then use it as the base
        aliases = lodash_1.extend(aliases || {}, data);
    }
    if (aliases) {
        // Only process it when there is aliases definitions
        if (lodash_1.isObject(data)) {
            // Data is object, let's process it
            for (let p in data) {
                let v = data[p];
                let m = p.match(ALIAS_PATTERN);
                if (m) {
                    // p is an alias, let's process it
                    let alias = aliases[m[1]];
                    if (alias) {
                        // We get the alias now, let's replace it as the key
                        data[alias] = v;
                        // Then let's remove the old key
                        delete data[p];
                    }
                }
                if (lodash_1.isObject(v) || lodash_1.isArray(v)) {
                    // Let's process the alias in the inner object or array
                    processAlias(v, aliases);
                }
            }
        }
        if (lodash_1.isArray(data)) {
            for (let d of data) {
                if (lodash_1.isObject(d) || lodash_1.isArray(d)) {
                    // Let's process the alias in the inner object or array
                    processAlias(d, aliases);
                }
            }
        }
    }
    return data;
};
const processComposites = (data) => {
    if (lodash_1.isObject(data)) {
        // Data is object, let's process it
        for (let p in data) {
            let v = data[p];
            if (lodash_1.isObject(v) || lodash_1.isArray(v)) {
                // Let's process the alias in the inner object or array
                processComposites(v);
            }
            let m = p.match(COMPOSITE_PATTERN);
            if (m) {
                // p is an composite, let's process it
                let name = m[1];
                if (name) {
                    name = name.split("/");
                    // Let's remove the old key
                    delete data[p];
                    let obj = v;
                    v = {};
                    while (name.length > 1) {
                        let n = name.pop();
                        v[n] = obj;
                        obj = v;
                        v = {};
                    }
                    data[name[0]] = obj;
                }
            }
        }
    }
    if (lodash_1.isArray(data)) {
        for (let d of data) {
            if (lodash_1.isObject(d) || lodash_1.isArray(d)) {
                processComposites(d);
            }
        }
    }
    return data;
};
const processObject = (data, loader) => {
    if (lodash_1.isArray(data)) {
        return rxjs_1.from(data).pipe(
        // Let's process the innder object in the array
        operators_1.flatMap(d => processObject(d, loader)), 
        // Then reduce it to array
        operators_1.reduce((a, i) => a.push(i) && a, []));
    }
    let observables = [];
    let loadRequest = rxjs_1.of(data);
    if (lodash_1.isObject(data)) {
        // This is an object, let's process its fields first
        for (let p in data) {
            let v = data[p];
            if (p.indexOf("@") === 0 && lodash_1.isString(v)) {
                // OK, we are facing the regex, and remove the @ at the begining
                data[p.substring(1)] = new RegExp(v);
                // Let's remove the old one
                delete data[p];
            }
            else {
                if (lodash_1.isObject(v) || lodash_1.isArray(v)) {
                    // This value is already object or array, let's process it now
                    ((props) => {
                        observables.push(processObject(v, loader).pipe(// Let's process it
                        operators_1.map(v => data[props] = v && v))); // Then set it to the data
                    })(p);
                }
            }
        }
        // Let's check if this data needs to be update too
        if (data.$type) {
            // Yes, we have the type inforamtion here
            let { $module, $name } = data;
            loadRequest = rxjs_1.defer(() => {
                if (lodash_1.isString($module)) {
                    try {
                        // Let's check if we can really require the module first
                        return loader.load($module);
                    }
                    catch (e) {
                        // We can't require this module, let's just return the data without processing it
                        return rxjs_1.of(module.exports);
                    }
                }
                else {
                    // No module set, let's try it ourself
                    return rxjs_1.of(module.exports);
                }
            }).pipe(operators_1.map(m => {
                switch (data.$type) {
                    case "module": // It is a module
                        // Only process that if the module information is string
                        let obj = constructObj(m, $name, data, loader);
                        if (obj) {
                            return obj;
                        }
                        return data;
                    case "function": // It is an function
                        // Only process that if the module information is string
                        let func = m[$name];
                        if (func) {
                            // Copy the values to the function
                            func = lodash_1.extend(func, data);
                            return func;
                        }
                        return data;
                }
                return data;
            }));
        }
    }
    if (observables.length) {
        // Let's finish the tasks first
        return rxjs_1.forkJoin(observables).pipe(
        // Then return the data itself
        operators_1.flatMap(() => loadRequest));
    }
    else {
        // Return the data
        return loadRequest;
    }
};
const constructObj = (module, name, data, loader) => {
    let m = module;
    if (m) {
        let $name = name;
        let func = m;
        if ($name) {
            // Let's use the property instead
            func = lodash_1.get(m, $name);
        }
        if (func && lodash_1.isFunction(func)) {
            // Let's add the clean support for the data, so that you can remove the meta informations that you don't want
            if (data.$clean && lodash_1.isArray(data.$clean)) {
                for (let name of data.$clean) {
                    delete data[name];
                }
                // And remove the clean too
                delete data.$clean;
            }
            let obj = new func(data);
            if (obj.meta && lodash_1.isFunction(obj.meta)) {
                // This is config object base, let's add the metadata to it too
                obj.meta(loader, data);
            }
            if (obj._init && lodash_1.isFunction(obj._init)) {
                // Call the init function if we should
                obj._init();
            }
            return obj;
        }
    }
};
//# sourceMappingURL=ContextFilter.js.map