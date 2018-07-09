"use strict";
/**
 * This is the implementation of the Repository interface
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @date Sun Apr 29 18:31:17 2018
 */
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const rxjs_1 = require("rxjs");
require("rxjs/add/observable/of");
require("rxjs/add/operator/map");
require("rxjs/add/operator/mergeMap");
require("rxjs/add/operator/merge");
/**
 * This is a simple registry which will use the on site memory to store the data
 */
class SimpleRegistry {
    constructor(name, value, repository, expiredDate) {
        this.name = name;
        this.value = value;
        this.repository = repository;
        this.createDate = new Date();
        this.modifyDate = this.createDate;
        if (expiredDate) {
            this.expiredDate = expiredDate;
        }
    }
    update(value) {
        let origin = this.value;
        this.value = value;
        this.modifyDate = new Date();
        if (this.subject) {
            this.subject.next({
                type: "change",
                target: this,
                tag: {
                    origin,
                    value
                }
            });
        }
        return rxjs_1.Observable.of(this);
    }
    isExpired() {
        return rxjs_1.Observable.of(this.expiredDate && this.expiredDate.getTime() <= new Date().getTime());
    }
    watch() {
        // Only initialize the subject when there is some watching
        if (!this.subject) {
            this.subject = new rxjs_1.Subject();
        }
        return this.subject;
    }
    meta() {
        return rxjs_1.Observable.of({
            repository: this.repository,
            createDate: this.createDate,
            modifyDate: this.modifyDate,
            expiredDate: this.expiredDate,
            name: this.name
        });
    }
    get() {
        return this.isExpired()
            .map(e => e ? null : this.value);
    }
}
exports.SimpleRegistry = SimpleRegistry;
class SimpleRepository {
    constructor() {
        /**
         * The map to store the registries
         */
        this._registries = {};
    }
    getRegistry(name, create = false) {
        let r = this._registries[name];
        if (!r && create) {
            r = new SimpleRegistry(name, null, this, null);
            this._registries[name] = r;
        }
        return rxjs_1.Observable.of(r);
    }
    removeRegistry(name) {
        let r = this._registries[name];
        if (r != null) {
            // Let's remove it now
            delete this._registries[name];
        }
        return rxjs_1.Observable.of(r);
    }
    setAll(map) {
        let obs = null;
        for (let p in map) {
            if (obs == null) {
                obs = this.set(p, map[p]);
            }
            else {
                obs = obs.flatMap(reg => reg.set(p, map[p]));
            }
        }
        return obs;
    }
    set(name, value) {
        return this.getRegistry(name, true).flatMap(r => {
            return r.update(value).map(() => this);
        });
    }
    get(name) {
        return this.getRegistry(name, true).flatMap(r => {
            return r.get();
        });
    }
    keys() {
        return rxjs_1.Observable.of(lodash_1.keys(this._registries));
    }
    watch(name) {
        let arr = null;
        if (lodash_1.isArray(name)) {
            arr = name;
        }
        else {
            arr = [name];
        }
        let obs = null;
        for (let str of arr) {
            if (obs) {
                obs = obs.merge(this.getRegistry(str, true));
            }
            else {
                obs = this.getRegistry(str, true);
            }
        }
        return obs.map(r => r.watch());
    }
}
exports.SimpleRepository = SimpleRepository;
//# sourceMappingURL=Repository.js.map