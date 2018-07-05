const {
    isNode,
    registry,
    template,
    global_registry,
} = require("../src/core");
const {
    NodeResourceResolver
} = require("../src/node/NodeResourceResolver");

const {
    split,
    process_includes,
    process_common
} = require("../src/filters/TextFilters");

// Add the source map support for testing
require('source-map-support').install();

describe("core function test", () => {
    it("play", (done) => {
        let resolver = new NodeResourceResolver(module);
        resolver.getContents("./m1.txt", "text").flatMap(process_common()).flatMap(split()).flatMap(process_includes(resolver)).subscribe(() => {
            expect(process.env.a).toBeTruthy();
            expect(process.env.b == 2).toBeTruthy();
            expect(process.env.c == 3).toBeTruthy();
            done();
        });
    });

    it("is node test", () => {
        isNode.subscribe(node => expect(node).toBeTruthy());
    });

    it("template test", () => {
        template("Hello {{name}}", {name: "world"}).subscribe(greetings => expect(greetings).toEqual("Hello world"));
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
});
