/**
 * This is the implementation of the Repository interface
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @date Sun Apr 29 18:31:17 2018
 */

import { Repository, Registry, RegistryMetadata, RegistryWatchEvent } from "./interfaces";
import { keys } from "lodash";
import { Observable, Subject } from "rxjs";
import "rxjs/add/observable/of";
import "rxjs/add/operator/map";
import "rxjs/add/operator/mergeMap";

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

    public constructor(name:string, value:any, repository:Repository, expiredDate:Date) {
        this.name = name;
        this.value = value;
        this.repository = repository;
        this.createDate = new Date();
        this.modifyDate = this.createDate;
        if(expiredDate) {
            this.expiredDate = expiredDate;
        }
    }

    update(value:any):Observable<Registry> {
        let origin = this.value;
        this.value = value;
        this.modifyDate = new Date();
        if(this.subject) {
            this.subject.next({
                type: "change",
                target: this,
                tag: {
                    origin,
                    value
                }
            });
        }
        return Observable.of(this);
    }

    isExpired():Observable<boolean> {
        return Observable.of(this.expiredDate && this.expiredDate.getTime() <= new Date().getTime());
    }

    watch():Subject<RegistryWatchEvent> {
        // Only initialize the subject when there is some watching
        if(!this.subject) {
            this.subject = new Subject<RegistryWatchEvent>();
        }
        return this.subject;
    }

    meta():Observable<RegistryMetadata> {
        return Observable.of({
            repository: this.repository,
            createDate: this.createDate,
            modifyDate: this.modifyDate,
            expiredDate: this.expiredDate,
            name: this.name
        });
    }

    get():Observable<any> {
        return this.isExpired()
            .map(e => e? null : this.value);
    }
}

interface RegistryMap {
    [index: string]: any;
}

export class SimpleRepository implements Repository {
    /**
     * The map to store the registries
     */
    private _registries:RegistryMap = {};

    getRegistry(name: string, create:boolean = false): Observable<Registry> {
        let r:Registry = this._registries[name] as Registry;
        if(!r && create) {
            r = new SimpleRegistry(name, null, this, null);
            this._registries[name] = r;
        }
        return Observable.of(r);
    }

    removeRegistry(name: string): Observable<Registry> {
        let r:Registry = this._registries[name] as Registry;
        if(r != null) {
            // Let's remove it now
            delete this._registries[name];
        }
        return Observable.of(r);
    }

    setAll(map: RegistryMap) {
        let obs:Observable<Repository> = null;
        for(let p in map) {
            if(obs == null) {
                obs = this.set(p, map[p]);
            } else {
                obs = obs.flatMap(reg => reg.set(p, map[p]));
            }
        }
        return obs;
    }

    set(name:string, value:any):Observable<Repository> {
        return this.getRegistry(name, true).flatMap(r =>  {
            return r.update(value).map(() => this);
        });
    }

    get(name:string):Observable<any> {
        return this.getRegistry(name, true).flatMap(r => {
            return r.get();
        });
    }

    keys():Observable<Array<string>> {
        return Observable.of(keys(this._registries));
    }

    watch(name:string):Observable<Subject<RegistryWatchEvent>> {
        return this.getRegistry(name, true).map(r => r.watch());
    }
}
