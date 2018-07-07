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

export abstract class AbstractModuleLoader implements ModuleLoader {
	load(mod:string):Observable<any> {
		// Let's resolve it first
		return this.resolve(mod)
		.flatMap(r => {
			if(r) {
				// Use the cache one if it is already there
				let c = this.cache(r);
				if(c) {
					return Observable.of(c);
				}
				return this._load(r)
				// Will try proxy it when loaded
					.flatMap(obj => this.proxy(obj));
			}
			// Since it is not resolved, let's just return null
			return Observable.of(null);
		});
	}

	/**
	 * Apply the proxy if needed
	 */
	proxy(obj:any):Observable<any> {
		// TODO: Just return it
		return Observable.of(obj);
	}

	/**
	 * Purge the module, it is platform dependent
	 */
	purge(mod:string):Observable<boolean> {
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
