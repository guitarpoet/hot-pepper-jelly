/**
 * This is the util functions that will be used, nearly all of them are Rxjs based
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @date Sun Apr 29 14:46:08 2018
 */
declare const window: any;

import { defer, Observable, concat, of, Subject } from "rxjs"
import { first, filter, flatMap, map } from "rxjs/operators";
import { Repository } from "./interfaces";
import { SimpleRepository } from "./Repository";
import * as tinyliquid from "tinyliquid";
import { extend, isObject, isArray } from "lodash";

/**
 * This is the holder that will be used for advanced operations
 */
const $holder: any = {};

/**
 * This function will try to get the value in the holder or update it first then getting it
 */
export const holder = (name: string, value: any = null): Observable<any> => {
    if (value) {
        // Update the value of holder if needed
        $holder[name] = value;
    }
    if ($holder[name] instanceof Observable) {
        return $holder[name];
    } else {
        return defer(() => of($holder[name]));
    }
}

/**
 * This is the loading support for all streams, it will create a loader for each request, and reuse that loader, and then save the result in the holder so that after the loading, all request will just get from the holder
 */
export const loader = (name: string, obs: Observable<any>): Observable<any> => {
    const loaderName = `{{${name}}}`;
    if ($holder[name]) {
        return of($holder[name]);
    }
    if (!$holder[loaderName]) {
        // Let's create the loader now
        const s: Subject<any> = new Subject<any>();
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
            })
        }, 0);
        $holder[loaderName] = s;
    }
    return $holder[loaderName];
}

/**
 * This function will try the observables one by one and only take the first one
 * by the way
 */
export function tryFirst<T>(...obs: Array<Observable<T>>): Observable<T> {
    return concat.apply(null, obs)
        .pipe(filter((n: any) => n !== null && typeof n !== "undefined"), first(), map((n: any) => n as T));
}

/**
 * This function will check if the environment is in the NodeJS
 */
export const isNode: Observable<boolean> = Observable.create(obs => {
    if (typeof module !== "undefined" && module.exports) {
        // We are in the common js environment, if we do have the DOM, we can assume that we are not in the NodeJS, or we are the other way
        obs.next(typeof window === "undefined");
    } else {
        // We are not in the common js environment, which means we are not in NodeJS
        obs.next(false);
    }
    obs.complete();
});

/**
 * This is the global registry for this repository
 */
export const _global = new SimpleRepository();

/**
 * Get or create a repository from the global repository
 */
export const registry = (name: string): Observable<Repository> => {
    return tryFirst<Repository>(
        // Try get it first(filter out the null ones)
        _global.get(name).pipe(filter(n => n !== null)),
        // If not exists, let's set one, and return it
        defer(() => {
            return _global.set(name, new SimpleRepository()).pipe(
                flatMap(() => _global.get(name))
            )
        })
    );
}

/**
 * The short cut to get the global registry
 */
export const registry_value = (reg: string, name: string, value: any = null): Observable<any> => {
    const r: Observable<Repository> = registry(reg);
    if (value) {
        return r.pipe(
            flatMap((r: Repository) => r.set(name, value)),
            flatMap((r: Repository) => r.get(name))
        )
    }

    // We are tring to get
    return r.pipe(
        flatMap(r => {
            return r.get(name);
        })
    );
}

export const global_registry = (name: string, value: any = null): Observable<any> => {
    return registry_value("global", name, value);
}

export const template_registry = (name: string, value: any = null): Observable<any> => {
    return registry_value("global", name, value);
}

export const features_enabled = (...features: string[]): Observable<boolean> => {
    return enabled_features().pipe(
        map((fs: any) => {
            for (let feature of features) {
                if (!fs[feature]) {
                    return false;
                }
            }
            return true;
        })
    )
}

export const enabled_features = (): Observable<any> => {
    return global_registry("features").pipe(
        map(i => i ? i : {})
    );
}

export const enable_features = (features: any = {}): Observable<any> => {
    return enabled_features().pipe(
        flatMap(orig => global_registry("features", extend(features, orig)))
    );
}

/**
 * Append the element to the array if it is not exists in the array
 */
export const appendIfNotExists = (i: any, arr: Array<any>): Array<any> => {
    if (isArray(arr) && arr.indexOf(i) === -1) {
        arr.push(i);
    }
    return arr;
}

export const template = (template: string, context: any = {}): Observable<string> => {
    let getTemplate = template_registry(template).pipe(filter(r => !!r));
    let setTemplate = defer(() => {
        return template_registry(template,
            tinyliquid.compile(template));
    });
    return tryFirst(
        getTemplate,
        setTemplate
    ).pipe(
        flatMap(render => {
            return Observable.create(obs => {
                let c = tinyliquid.newContext({
                    locals: context
                });
                render(c, err => {
                    if (err) {
                        obs.error(err);
                    } else {
                        obs.next(c.getBuffer());
                    }
                    obs.complete();
                });
            });
        })
    );
}

export const print = (context: any = ""): any => (obj: any): string => {
    console.info(context, obj);
    return obj as string;
}

export const tokenizePath = (path: string): Array<string> => {
    let paths = path.split(".");
    let ret: Array<string> = [];
    while (paths.length) {
        // Add the paths into the ret
        ret.push(paths.join("."));
        // Remove the last path
        paths.pop();
    }
    return ret;
}

export const paths = (obj: any): Array<string> => {
    let ret: Array<string> = [];
    if (isObject(obj)) {
        // If this is an object
        for (let p in obj) {
            ret.push(p);
            ret = ret.concat(paths(obj[p]).map(t => p + "." + t));
        }
    } else if (isArray(obj)) {
        // If this is an array
        for (let i = 0; i <= obj.length; i++) {
            ret.push(i + "");
            ret = ret.concat(paths(obj[i]));
        }
    }
    return ret;
}

/**
 * Store the object into cache or retrieve it
 * TODO: Add local service(say mongo) support
 */
export const cache = (name: string, value: any = null): Observable<any> => {
    // Let's get the cache registry first
    return registry("cache").pipe(
        flatMap((r: Repository) => {
            if (value) {
                return r.set(name, value).pipe(
                    flatMap(() => r.get(name))
                );
            }
            return r.get(name);
        })
    );
}
