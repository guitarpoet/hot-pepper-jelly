"use strict";
/**
 * This is the store object which can provide all store functions
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @date Sat Jul  7 21:27:27 2018
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("./core");
const rxjs_1 = require("rxjs");
const lodash_1 = require("lodash");
const rxjs_2 = require("rxjs");
/**
 * The store itself is a subect, so anything that subscribe to the store
 * will have the store level event
 */
class Store extends rxjs_1.Subject {
    constructor(source) {
        super();
        this.$subjects = {};
        this.$holder = {};
        // Let's get the data in this store
        source.subscribe(props => {
            for (let p in props) {
                this.$set(p, props[p]);
            }
        });
    }
    $subject(key) {
        let s = this.$subjects[key];
        if (!s) {
            // If there is no subject here, let's update it
            s = new rxjs_1.BehaviorSubject(null);
            this.$subjects[key] = s;
        }
        return s;
    }
    $exists(key) {
        // Test if the key is exists
        return !(typeof lodash_1.get(this.$holder, key) === "undefined");
    }
    /**
     * Just return the value simply, without any subject support
     */
    $simple(key, defaultValue = null) {
        return rxjs_2.Observable.create(obs => {
            if (this.$exists(key)) {
                obs.next(lodash_1.get(this.$holder, key));
            }
            else {
                obs.next(defaultValue);
            }
            obs.complete();
        });
    }
    $get(key) {
        // We don't propgate the get event, or even trigger it, since the get event is very popular
        let type = "get";
        this.next({ type, key });
        return this.$subject(key);
    }
    $set(key, value) {
        if (!key) {
            return false;
        }
        let type = "set";
        let oldValue = lodash_1.get(this, key);
        // Let's trigger the store level event first
        this.next({ type, key, value, oldValue });
        // Let's update the value
        lodash_1.set(this, key, value);
        // Let's trigger the child paths first
        core_1.paths(value).map(p => key + "." + p).forEach(p => {
            this.$subject(p).next(lodash_1.get(this, p));
        });
        // OK, let's trigger the whole chain, just from the point
        for (let p of core_1.tokenizePath(key)) {
            type = "update";
            let v = lodash_1.get(this, p);
            this.next({
                type, key: p, value: v
            });
            // Just update the value
            this.$subject(p).next(v);
        }
        return true;
    }
}
exports.Store = Store;
exports.default = Store;
//# sourceMappingURL=Store.js.map