const {
    isNode,
    print,
    registry,
    template,
    global_registry,
    enable_features,
    features_enabled,
    enabled_features
} = require("../src/core");
const {
    NodeResourceResolver
} = require("../src/node/NodeResourceResolver");

const {
    split,
    process_includes,
    process_common
} = require("../src/filters/TextFilters");

const {
    context,
    text,
    format
} = require("../src/filters/ContextFilter");

const {
    transformResult
} = require("../src/interfaces");

const {
    Observable
} = require("rxjs/Observable");

// Add the source map support for testing
require('source-map-support').install();

require("rxjs/add/operator/map");
require("rxjs/add/operator/mergeMap");
require("rxjs/add/operator/reduce");
require("rxjs/add/observable/of");
require("rxjs/add/observable/from");

describe("core function test", () => {
    it("test macro engine filters", (done) => {
        let resolver = new NodeResourceResolver(module);

        resolver.getContents("./m1.txt", "text")
            .flatMap(process_common())
            .flatMap(split())
            .flatMap(process_includes(resolver))
            .flatMap(context("./m1.txt", resolver))
            .reduce(text(), "")
            .map(format())
            .subscribe((data) => {
                expect(process.env.a).toBeTruthy();
                expect(process.env.b == 2).toBeTruthy();
                expect(process.env.c == 3).toBeTruthy();
                expect(data.a).toEqual("Hello World");
                done();
            });
    });

    it("is node test", () => {
        isNode.subscribe(node => expect(node).toBeTruthy());
    });

    it("template test", () => {
        template("Hello {{name}}", {
            name: "world"
        }).subscribe(greetings => expect(greetings).toEqual("Hello world"));
    });

    it("registry test", (done) => {
        let theReg = null;
        registry("hello").subscribe(reg => theReg = reg);
        registry("hello").subscribe(reg => expect(theReg === reg).toBeTruthy());
        global_registry("hello", "world").subscribe((n1) => {
            global_registry("hello").subscribe((n2) => {
                expect(n1).toEqual(n2);
                done();
            })
        })
    });

    it("enable features test", (done) => {
        enable_features({
            hello: "world"
        }).subscribe(data => {
            expect(data.hello).toEqual("world");
            done();
        });

        enable_features({
                hello: "world"
            }).flatMap(() => features_enabled("hello"))
            .subscribe(data => {
                expect(data).toBeTruthy();
            });

        enable_features({
                hello: "world"
            }).flatMap(() => features_enabled("hello", "not_exists"))
            .subscribe(data => {
                expect(data).toBeFalsy();
            });
    });
});
