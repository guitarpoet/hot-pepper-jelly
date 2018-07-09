/**
 * This will provide the functions that used in NodeJS
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @dateSun Jul  8 22:51:00 2018
 */

export * from "./src/node/Watcher";
export * from "./src/node/NodeResourceResolver";
export * from "./src/node/NodeModuleResolver";

import { Observable } from "rxjs/Observable"
// Let's add some short cuts
import "rxjs/add/operator/map";
import "rxjs/add/operator/mergeMap";
import "rxjs/add/observable/of";
import "rxjs/add/observable/from";

import { RESULT_TYPE_TXT } from "./core";
import { NodeResourceResolver } from "./src/node/NodeResourceResolver";
import { NodeModuleLoader } from "./src/node/NodeModuleLoader";

import {
    split,
    process_includes,
    process_common
} from "./src/filters/TextFilters";

import {
    format,
    context,
    text,
    process_base,
    process_alias,
    process_composite,
    process_object
} from "./src/filters/ContextFilter";

import {
} from "./src/filters/FormatFilter";

export const configure = (file:string, m:any = null):Observable<any> => {
    // Construct the resuolver first
    let resolver = new NodeResourceResolver(m);
    // Let's read it first
    return resolver.getContents(file, RESULT_TYPE_TXT)
    // Let's process the define, if else and other things first
        .flatMap(process_common())
    // Let's split it into lines for future process
        .flatMap(split())
    // Let's process the includes then
        .flatMap(process_includes(resolver))
    // Let's process the context
        .flatMap(context(file, resolver))
    // Then, let's reduce it into one string
        .reduce(text(), "")
    // Parse it as YAML
        .map(format())
    // Then process the base
        .map(process_base())
    // Then process the aliases
        .map(process_alias())
    // Then process the aliases
        .map(process_composite())
    // Then process the objects
        .flatMap(process_object(new NodeModuleLoader(m)));
}
