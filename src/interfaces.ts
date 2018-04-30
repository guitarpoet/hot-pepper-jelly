/**
 * This is the file that will define all protocols
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @date Sun Apr 29 15:04:17 2018
 */
import { Observable, Subject } from "rxjs"

export const TYPE_NODE:string = "node";
export const TYPE_BROWSER:string = "browser";
export const RESULT_TYPE_TXT:string = "txt";
export const RESULT_TYPE_JSON:string = "json";
export const RESULT_TYPE_YAML:string = "yaml";

const yaml = require("yamljs");

/**
 * This is the interface for resovling the module, it can support the module resovle using
 * webpack and the NodeJS, in the NodeJS envrionment, it will use NodeJs's way to resolve the
 * module, and in the browser environment, it will use the Webpack to resolve the module
 */
export interface ModuleResolver {
    resolve(path: string): Observable<any>;
}

export interface ResourceResolver {
	/**
	 * The type of the resource resolver
	 */
	resolverType():Observable<string>;

	/**
	 * Resolve the path of the resource, if the resource is not found, will return just null
	 */
	resolve(path:string): Observable<string>;

	/**
	 * Get the contents of the resource, if the resource is not found, will throw an ResourceNotFound exception
	 */
	getContents(path:string, resultType:string): Observable<any>;
}

export const transformResult = (data:string, type:string = RESULT_TYPE_JSON):any => {
	switch(type) {
		case RESULT_TYPE_JSON:
			return JSON.parse(data);
		case RESULT_TYPE_YAML:
			return yaml.parse(data);
		case RESULT_TYPE_TXT:
		default:
			return data;
	}
}

/**
 * This is the interface for the repository, which will provide the functions to search and 
 * get the registry and its values
 */
export interface Repository {
	/**
	 * Get the registry
	 */
	getRegistry(name: string, create:boolean): Observable<Registry>;
	/**
	 * Remove the registry
	 */
	removeRegistry(name: string):Observable<Registry>;
	/**
	 * Set the value in registry. Note: this will not work a treeish way
	 */
	set(name:string, value:any):Observable<Repository>;
	/**
	 * Get the value in registry
	 */
	get(name:string):Observable<any>;

    keys():Observable<Array<string>>;

    watch(name:string):Observable<Subject<RegistryWatchEvent>>;
}

export interface RegistryMetadata {
	repository: Repository;
	createDate: Date;
	modifyDate: Date;
	expiredDate: Date;
	name: string;
}

export interface RegistryWatchEvent {
    type: string;
    target: Registry;
    tag: any;
}

export interface Registry {
    update(value:any):Observable<Registry>;
    isExpired():Observable<boolean>;
    get():Observable<any>;
    meta():Observable<RegistryMetadata>;
    watch():Subject<RegistryWatchEvent>;
}
