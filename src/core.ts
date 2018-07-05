/**
 * This is the util functions that will be used, nearly all of them are Rxjs based
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @date Sun Apr 29 14:46:08 2018
 */
declare const window:any;

import { Observable } from "rxjs"
import { Repository } from "./interfaces";
import { SimpleRepository } from "./Repository";
import "rxjs/add/observable/of";
import "rxjs/add/observable/defer";
import "rxjs/add/operator/first";
import "rxjs/add/operator/filter";
import "rxjs/add/operator/concat";
import * as tinyliquid from "tinyliquid";

/**
 * This function will check if the environment is in the NodeJS
 */
export const isNode:Observable<boolean> = Observable.create(obs => {
	if(typeof module !== "undefined" && module.exports) {
		// We are in the common js environment, if we do have the DOM, we can assume that we are not in the NodeJS, or we are the other way
		obs.next(typeof window === "undefined");
	} else {
		// We are not in the common js environment, which means we are not in NodeJS
		obs.next(false);
	}
});


/**
 * This is the global registry for this repository
 */
export const _global = new SimpleRepository();

/**
 * Get or create a repository from the global repository
 */
export const registry = (name:string):Observable<Repository> => {
	return _global.get(name) // Try get the value first
		.flatMap(r => {
			if(!r) {
				// If the value is null
				return _global.set(name, new SimpleRepository())
					.flatMap(g => g.get(name)); // And get the get result
			} else {
				return Observable.of(r);
			}
		});
}

/**
 * The short cut to get the global registry
 */
export const registry_value = (reg:string, name:string, value:any = null):Observable<any> => {
	if(value) {
		// Get the registry first
		return registry(reg)
		// Then set it to the registry
			.flatMap(r => r.set(name, value))
		// Then get the value from it
			.flatMap(r => r.get(name));
	}

	// We are tring to get
	return registry(reg).flatMap(r => r.get(name));
}

export const global_registry = (name:string, value:any = null):Observable<any> => {
	return registry_value("global", name, value);
}

export const template_registry = (name:string, value:any = null):Observable<any> => {
	return registry_value("global", name, value);
}

export const template = (template:string, context:any = {}):Observable<string> => {
	let getTemplate = template_registry(template).filter(r => !!r);
	let setTemplate = Observable.defer(() => {
		return template_registry(template,
			tinyliquid.compile(template));
	});
	return getTemplate.concat(setTemplate).first().flatMap(render => {
		return Observable.create(obs => {
			let c = tinyliquid.newContext({
				locals: context
			});
			render(c, err => {
				if(err) {
					obs.error(err);
				} else {
					obs.next(c.getBuffer());
				}
				obs.complete();
			});
		});
	});
}
