/**
 * This is the util functions that will be used, nearly all of them are Rxjs based 
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @date Sun Apr 29 14:46:08 2018
 */

import { Observable } from "rxjs"

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
