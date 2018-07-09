"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TYPE_NODE = "node";
exports.TYPE_BROWSER = "browser";
exports.RESULT_TYPE_TXT = "txt";
exports.RESULT_TYPE_JSON = "json";
exports.RESULT_TYPE_YAML = "yaml";
const yaml = require("yamljs");
exports.transformResult = (data, type = exports.RESULT_TYPE_JSON) => {
    switch (type) {
        case exports.RESULT_TYPE_JSON:
            return JSON.parse(data);
        case exports.RESULT_TYPE_YAML:
            return yaml.parse(data);
        case exports.RESULT_TYPE_TXT:
        default:
            return data;
    }
};
//# sourceMappingURL=interfaces.js.map