/**
 * This is implementation of the ModuleLoader in nodejs
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @date Sat Jul  7 15:58:27 2018
 */

import { Observable } from "rxjs/Observable";
import { AbstractModuleLoader } from "../ModuleLoader";
import { NodeResourceResolver } from "./NodeResourceResolver";

const topMostModule = ():any => {
	let topmost = module;

	while(topmost.parent) {
		topmost = topmost.parent;
	}
	return topmost;
}

export class NodeModuleLoader extends AbstractModuleLoader {
	private resolver:NodeResourceResolver;

	constructor(mod:any = null) {
		super();
		if(!mod) {
			// If there is no resolver set, let's use the top most module for the resolver
			mod = topMostModule();
		}
		this.resolver = new NodeResourceResolver(mod);
	}

	purge(mod:string):Observable<boolean> {
        // Clear the super's cache first 
        super.purge(mod);
		let m = this.cache(mod);
		if(m) {
			delete require.cache[m.id];
		} else {
			return Observable.of(false);
		}

		// Remove cached paths to the module.
		// Thanks to @bentael for pointing this out.
		let a:any = module.constructor as any;
		Object.keys(a._pathCache as any).map((cacheKey) => {
			if (cacheKey.indexOf(mod) > 0) {
				delete a._pathCache[cacheKey];
			}
		});
		return Observable.of(true);
	}

	cache(key:string = null):any {
		if(key) {
			return require.cache[key];
		}
        return require.cache;
	}

	_load(mod:string):Observable<any> {
		// Let's resolve it first
		return this.resolve(mod).map(r => {
			if(r) {
				// If resolved
				return require(r);
			}
			return null;
		});
	}

	resolve(mod:string):Observable<string> {
		return this.resolver.resolve(mod);
	}
}
