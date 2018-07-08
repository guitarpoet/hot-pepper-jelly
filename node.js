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
const TextFilters_1 = require("./src/filters/TextFilters");
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
        .flatMap(ContextFilter_1.context(file, resolver))
        // Then, let's reduce it into one string
        .reduce(ContextFilter_1.text(), "")
        // Parse it as YAML
        .map(ContextFilter_1.format());
};
//# sourceMappingURL=node.js.map