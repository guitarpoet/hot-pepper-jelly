/**
 * This is the implementation of the Repository interface
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @date Sun Apr 29 18:31:17 2018
 */

import { Repository, Registry, RegistryMetadata, RegistryWatchEvent } from "./interfaces";
import { keys, isArray } from "lodash";
import { Observable, Subject, of } from "rxjs";
import { map, flatMap, merge } from "rxjs/operators";

/**
 * This is a simple registry which will use the on site memory to store the data
 */
export class SimpleRegistry implements Registry {
    private name: string;
    private value: any;
    private repository: Repository;
    private createDate: Date;
    private modifyDate: Date;
    private expiredDate: Date;
    private subject: Subject<RegistryWatchEvent>;

    public constructor(name: string, value: any, repository: Repository, expiredDate: Date) {
        this.name = name;
        this.value = value;
        this.repository = repository;
        this.createDate = new Date();
        this.modifyDate = this.createDate;
        if (expiredDate) {
            this.expiredDate = expiredDate;
        }
    }

    update(value: any): Observable<Registry> {
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
        return of(this);
    }

    isExpired(): Observable<boolean> {
        return of(this.expiredDate && this.expiredDate.getTime() <= new Date().getTime());
    }

    watch(): Subject<RegistryWatchEvent> {
        // Only initialize the subject when there is some watching
        if (!this.subject) {
            this.subject = new Subject<RegistryWatchEvent>();
        }
        return this.subject;
    }

    meta(): Observable<RegistryMetadata> {
        return of({
            repository: this.repository,
            createDate: this.createDate,
            modifyDate: this.modifyDate,
            expiredDate: this.expiredDate,
            name: this.name
        });
    }

    get(): Observable<any> {
        return this.isExpired().pipe(
            map(e => e ? null : this.value)
        );
    }
}

interface RegistryMap {
    [index: string]: any;
}

export class SimpleRepository implements Repository {
    /**
     * The map to store the registries
     */
    private _registries: RegistryMap = {};

    getRegistry(name: string, create: boolean = false): Observable<Registry> {
        let r: Registry = this._registries[name] as Registry;
        if (!r && create) {
            r = new SimpleRegistry(name, null, this, null);
            this._registries[name] = r;
        }
        return of(r);
    }

    removeRegistry(name: string): Observable<Registry> {
        let r: Registry = this._registries[name] as Registry;
        if (r != null) {
            // Let's remove it now
            delete this._registries[name];
        }
        return of(r);
    }

    setAll(map: RegistryMap) {
        let obs: Observable<Repository> = null;
        for (let p in map) {
            if (obs == null) {
                obs = this.set(p, map[p]);
            } else {
                obs = obs.pipe(
                    flatMap(reg => reg.set(p, map[p]))
                );
            }
        }
        return obs;
    }

    set(name: string, value: any): Observable<Repository> {
        return this.getRegistry(name, true).pipe(
            flatMap(r => {
                return r.update(value);
            }),
            map(() => this)
        );
    }

    get(name: string): Observable<any> {
        return this.getRegistry(name, true).pipe(
            flatMap(r => {
                return r.get();
            })
        );
    }

    keys(): Observable<Array<string>> {
        return of(keys(this._registries));
    }

    watch(name: string | Array<string>): Observable<Subject<RegistryWatchEvent>> {
        let arr: Array<string> = null;
        if (isArray(name)) {
            arr = name as Array<string>;
        } else {
            arr = [name as string];
        }

        let obs: Observable<Registry> = null;
        for (let str of arr) {
            if (obs) {
                obs = obs.pipe(
                    merge(this.getRegistry(str, true))
                );
            } else {
                obs = this.getRegistry(str, true);
            }
        }
        return obs.pipe(map(r => r.watch()));
    }
}
