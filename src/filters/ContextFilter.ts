/**
 * This is the filter that will provides the context support functions
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @date Fri Jul  6 00:08:59 2018
 */

import { ResourceResolver, RESULT_TYPE_JSON, RESULT_TYPE_YAML, transformResult } from "../interfaces";
import { Observable } from "rxjs/Observable"
import "rxjs/add/observable/of";
import "rxjs/add/observable/forkJoin";
import "rxjs/add/observable/from";
import "rxjs/add/observable/defer";
import "rxjs/add/operator/map";
import "rxjs/add/operator/reduce";
import "rxjs/add/operator/mergeMap";
import "rxjs/add/operator/concat";
import "rxjs/add/operator/first";
import "rxjs/add/operator/filter";
import { template } from "../core";
import { isObject, isArray, isFunction, isString, extend, get } from "lodash";
import { AbstractModuleLoader } from "../ModuleLoader";

const ALIAS_PATTERN = /^\~([a-zA-Z_\-]+)/;
const COMPOSITE_PATTERN = /^\^([a-zA-Z_\-\/]+)/;

/**
 * This is the pattern used for recognize the context
 */
const CONTEXT_PATTERN:RegExp = /[ \t]*#context ([a-zA-Z0-9\\._\/]+)$/; // Yes, sorry, we don't support blank in the file name

const PLACE_HOLDER_PATTERN:RegExp = /\{\{[^\{\}]+\}\}/g;

/**
 * Will use the context
 */
export const context = (file:string, resolver:ResourceResolver, base:any = {}):any => {
    let thePath:string = null;
    let theContext:Observable<any> = null;
    return (contents:string):Observable<string> => {
        let getThePath:Observable<string> = Observable.of(thePath);
        let setThePath:Observable<string> = resolver.resolve(file).map(p => (thePath = p) && p);
        let setTheContext = (contextFile:string):Observable<any> => (resolver.getContents(contextFile, RESULT_TYPE_JSON)).map(o => extend(base, o));
        return getThePath.concat(setThePath).filter(i => !!i).first().flatMap(path => {
            // Let's check the line if it is the context pattern
            let m = contents.match(CONTEXT_PATTERN);
            if(m) {
                // Then, let's get the json out
                theContext = setTheContext(m[1]);
                return Observable.of(null);
            } else {
                if(theContext) {
                    // We only handle when context exists
                    if(contents.match(PLACE_HOLDER_PATTERN)) {
                        return theContext.map(c => extend(c, {path})).flatMap(c => template(contents, c));
                    }
                }
                return Observable.of(contents);
            }
        }).filter(i => i !== null); // And filter out the null values
    }
}

export const text_array = ():any => (texts:Array<string>, contents:string):Array<string> => texts.push(contents) && texts;

export const text = (sep:string = "\n"):any => (texts:string, contents:string):string => (texts += sep + contents) && texts;

export const format = (format:string = RESULT_TYPE_YAML):any => (contents:string):any => transformResult(contents, format);

/**
 * This is the filter to add the $base extend support(using overlay)
 */
export const process_base = (name:string = "$base"):any => (data:any) => processBase(name, data);

export const process_alias = (aliases:any = null):any => (data:any) => processAlias(aliases, data);

export const process_composite = ():any => (data:any) => processComposites(data);

export const process_object = (loader:AbstractModuleLoader):any => (data:any) => processObject(data, loader);

const processBase = (name, data:any):any => {
    if(isObject(data)) {
        // Let's check if the data itself needs to be overlayed
        let $base = data[name];

        if($base && isObject($base)) {
            // Now overlay it and return it
            data = overlay(processBase(name, $base), data);
        }

        // This data is object, let's process its fields
        for(let p in data) {
            if(p == name) {
                continue;
            }
            data[p] = processBase(name, data[p]);
        }
    }

    if(isArray(data)) {
        return data.map(d => processBase(name, d));
    }

    return data;
}

const overlay = (dest:any, src:any):any => {
    if(isObject(dest) && isObject(src)) {
        let ret = {};
        // We only process objects
        for(let p in dest) {
            // Let's overlay the value
            ret[p] = overlay(dest[p], src[p]);
        }

        for(let p in src) {
            // Let's overlay the value that is not in the dest
            ret[p] = src[p];
        }
        return ret;
    }
    // Then, if the source has value, copy it, else use the default one
    return src? src: dest;
}

const processAlias = (aliases:any, data):any => {
    if(data.$aliases) {
        // If there is the aliases in the data, then use it as the base
        aliases = extend(aliases || {}, data);
    }

    if(aliases) {
        // Only process it when there is aliases definitions
        if(isObject(data)) {
            // Data is object, let's process it
            for(let p in data) {
                let v = data[p];
                let m = p.match(ALIAS_PATTERN);
                if(m) {
                    // p is an alias, let's process it
                    let alias = aliases[m[1]];
                    if(alias) {
                        // We get the alias now, let's replace it as the key
                        data[alias] = v;
                        // Then let's remove the old key
                        delete data[p];
                    }
                }
                if(isObject(v) || isArray(v)) {
                    // Let's process the alias in the inner object or array
                    processAlias(v, aliases);
                }
            }
        }

        if(isArray(data)) {
            for(let d of data) {
                if(isObject(d) || isArray(d)) {
                    // Let's process the alias in the inner object or array
                    processAlias(d, aliases);
                }
            }
        }
    }
    return data;
}

const processComposites = (data):any => {
    if(isObject(data)) {
        // Data is object, let's process it
        for(let p in data) {
            let v = data[p];
            if(isObject(v) || isArray(v)) {
                // Let's process the alias in the inner object or array
                processComposites(v);
            }

            let m = p.match(COMPOSITE_PATTERN);
            if(m) {
                // p is an composite, let's process it
                let name: string | Array<string> = m[1];
                if(name) {
                    name = name.split("/");
                    // Let's remove the old key
                    delete data[p];

                    let obj = v;
                    v = {};
                    while(name.length > 1) {
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

    if(isArray(data)) {
        for(let d of data) {
            if(isObject(d) || isArray(d)) {
                processComposites(d);
            }
        }
    }
    return data;
}

const processObject = (data:any, loader:AbstractModuleLoader):Observable<any> => {
    if(isArray(data)) {
        return Observable.from(data as Array<any>)
        // Let's process the innder object in the array
            .flatMap(d => processObject(d, loader))
        // Then reduce it to array
            .reduce((a, i) => a.push(i) && a, []);
    }

    let observables:Array<Observable<any>> = [];
    let loadRequest = Observable.of(data);
    if(isObject(data)) {
        // This is an object, let's process its fields first
        for(let p in data) {
            let v = data[p];
            if(p.indexOf("@") === 0 && isString(v)) {
                // OK, we are facing the regex, and remove the @ at the begining
                data[p.substring(1)] = new RegExp(v);
                // Let's remove the old one
                delete data[p];
            } else {
                if(isObject(v) || isArray(v)) {
                    // This value is already object or array, let's process it now
                    ((props) => {
                        observables.push(processObject(v, loader) // Let's process it
                            .map(v => data[props] = v && v)); // Then set it to the data
                    })(p);
                }
            }
        }

        // Let's check if this data needs to be update too
        if(data.$type) {
            // Yes, we have the type inforamtion here
            let { $module, $name } = data;

            loadRequest = Observable.defer(() => {
                if(isString($module)) {
                    try {
                        // Let's check if we can really require the module first
                        return loader.load($module);
                    } catch(e) {
                        // We can't require this module, let's just return the data without processing it
                        return Observable.of(module.exports);
                    }
                } else {
                    // No module set, let's try it ourself
                    return Observable.of(module.exports);
                }
            }).map(m => {
                switch(data.$type) {
                    case "module": // It is a module
                        // Only process that if the module information is string
                        let obj = constructObj(m, $name, data, loader);
                        if(obj) {
                            return obj;
                        }
                        return data;
                    case "function": // It is an function
                        // Only process that if the module information is string
                        let func = m[$name];
                        if(func) {
                            // Copy the values to the function
                            func = extend(func, data);
                            return func;
                        }
                        return data;
                }
                return data;
            });
        }
    }

    if(observables.length) {
        // Let's finish the tasks first
        return Observable.forkJoin(observables)
        // Then return the data itself
            .flatMap(() => loadRequest);
    } else {
        // Return the data
        return loadRequest;
    }
}

const constructObj = (module:any, name:string, data:any, loader) => {
    let m = module;
    if(m) {
        let $name = name;
        let func = m;
        if($name) {
            // Let's use the property instead
            func = get(m, $name);
        }
        if(func && isFunction(func)) {
            // Let's add the clean support for the data, so that you can remove the meta informations that you don't want
            if(data.$clean && isArray(data.$clean)) {
                for(let name of data.$clean) {
                    delete data[name];
                }
                // And remove the clean too
                delete data.$clean;
            }
            let obj = new func(data);
            if(obj.meta && isFunction(obj.meta)) {
                // This is config object base, let's add the metadata to it too
                obj.meta(loader, data);
            }

            if(obj._init && isFunction(obj._init)) {
                // Call the init function if we should
                obj._init();
            }
            return obj;
        }
    }
}
