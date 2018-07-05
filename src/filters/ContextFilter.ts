/**
 * This is the filter that will provides the context support functions
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @date Fri Jul  6 00:08:59 2018
 */

import { ResourceResolver, RESULT_TYPE_TXT } from "../interfaces";
import { Observable } from "rxjs/Observable"

/**
 * Will use the context 
 */
export const context = (base:any = {}, resolver:ResourceResolver):any => {
	return (contents:string):Observable<string> => {
		return null;
	}
}
