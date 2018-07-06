/**
 * This is the filter that will provides the context support functions
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @date Fri Jul  6 00:08:59 2018
 */

import { ResourceResolver, RESULT_TYPE_TXT, RESULT_TYPE_JSON, RESULT_TYPE_YAML, transformResult } from "../interfaces";
import { Observable } from "rxjs/Observable"
import "rxjs/add/observable/of";
import "rxjs/add/observable/defer";
import "rxjs/add/operator/map";
import "rxjs/add/operator/mergeMap";
import "rxjs/add/operator/concat";
import "rxjs/add/operator/first";
import "rxjs/add/operator/filter";
import { template, print } from "../core";
import { split } from "./TextFilters";

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
		let setTheContext = (contextFile:string):Observable<any> => (resolver.getContents(contextFile, RESULT_TYPE_JSON));
		return getThePath.concat(setThePath).first().flatMap(path => {
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
						return theContext.flatMap(c => template(contents, c));
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
