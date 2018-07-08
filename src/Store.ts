/**
 * This is the store object which can provide all store functions
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @date Sat Jul  7 21:27:27 2018
 */

import { tokenizePath, paths } from "./core";
import { Subject, BehaviorSubject } from "rxjs";
import { get, set, extend } from "lodash";
import { Observable } from "rxjs";

/**
 * The store itself is a subect, so anything that subscribe to the store
 * will have the store level event
 */
export class Store extends Subject<any> {
    private $subjects:any = {};
    private $holder:any = {};

    constructor(source:Observable<any>) {
        super();
        // Let's get the data in this store
        source.subscribe(props => {
            for(let p in props) {
                this.$set(p, props[p]);
            }
        })
    }

    $subject(key:string):Subject<any> {
        let s:BehaviorSubject<any> = this.$subjects[key];
        if(!s) {
            // If there is no subject here, let's update it
            s = new BehaviorSubject<any>(null);
            this.$subjects[key] = s;
        }
        return s;
    }

    $exists(key:string) {
        // Test if the key is exists
        return !(typeof get(this.$holder, key) === "undefined");
    }

    /**
     * Just return the value simply, without any subject support
     */
    $simple(key:string, defaultValue:any = null):Observable<any> {
        return Observable.create(obs => {
            if(this.$exists(key)) {
                obs.next(get(this.$holder, key));
            } else {
                obs.next(defaultValue);
            }
            obs.complete();
        });
    }

    $get(key):Subject<any> | Observable<any> {
        // We don't propgate the get event, or even trigger it, since the get event is very popular
        let type = "get";
        this.next({type, key});
        return this.$subject(key);
    }

    $set(key, value):boolean {
        if(!key) {
            return false
        }

        let type = "set";
        let oldValue = get(this, key);
        // Let's trigger the store level event first
        this.next({type, key, value, oldValue});

        // Let's update the value
        set(this, key, value);

        // Let's trigger the child paths first
        paths(value).map(p => key + "." + p).forEach(p => {
            this.$subject(p).next(get(this, p));
        });

        // OK, let's trigger the whole chain, just from the point
        for(let p of tokenizePath(key)) {
            type = "update";
            let v = get(this, p);
            this.next({
                type, key: p, value:v
            });
            // Just update the value
            this.$subject(p).next(v);
        }
        return true;
    }
}

export default Store;
