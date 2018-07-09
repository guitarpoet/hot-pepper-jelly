"use strict";
/**
 * This will provide the functions that used in NodeJS
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @dateSun Jul  8 22:51:00 2018
 */
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./src/node/Watcher"));
__export(require("./src/node/NodeResourceResolver"));
__export(require("./src/node/NodeModuleResolver"));
// Let's add some short cuts
require("rxjs/add/operator/map");
require("rxjs/add/operator/mergeMap");
require("rxjs/add/observable/of");
require("rxjs/add/observable/from");
const core_1 = require("./core");
const NodeResourceResolver_1 = require("./src/node/NodeResourceResolver");
const NodeModuleLoader_1 = require("./src/node/NodeModuleLoader");
const TextFilters_1 = require("./src/filters/TextFilters");
const path_1 = require("path");
const ContextFilter_1 = require("./src/filters/ContextFilter");
exports.configure = (file, m = null) => {
    // Construct the resuolver first
    let resolver = new NodeResourceResolver_1.NodeResourceResolver(m);
    // Let's read it first
    return resolver.getContents(file, core_1.RESULT_TYPE_TXT)
        // Let's process the define, if else and other things first
        .flatMap(TextFilters_1.process_common())
        // Let's split it into lines for future process
        .flatMap(TextFilters_1.split())
        // Let's process the includes then
        .flatMap(TextFilters_1.process_includes(resolver))
        // Let's process the context
        .flatMap(ContextFilter_1.context(file, resolver, { file, pwd: path_1.resolve(".") }))
        // Then, let's reduce it into one string
        .reduce(ContextFilter_1.text(), "")
        // Parse it as YAML
        .map(ContextFilter_1.format())
        // Then process the base
        .map(ContextFilter_1.process_base())
        // Then process the aliases
        .map(ContextFilter_1.process_alias())
        // Then process the aliases
        .map(ContextFilter_1.process_composite())
        // Then process the objects
        .flatMap(ContextFilter_1.process_object(new NodeModuleLoader_1.NodeModuleLoader(m)));
};
//# sourceMappingURL=node.js.map