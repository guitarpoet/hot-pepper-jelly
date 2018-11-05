const {
    NodeResourceResolver,
    resolve
} = require("../src/node/NodeResourceResolver");
const {
    RESULT_TYPE_TXT
} = require("../src/interfaces");

describe("node resource resolver test", () => {
    it("test resolve", () => {
        // We need to pass the module to the resolve, since the top module is jasmine
        resolve("./CoreSpec", module)
            .subscribe({
                next(path) {
                    expect(path)
                        .toEqual(require.resolve("./CoreSpec"));
                }
            });
    });

    it("test get contents", () => {
        // We need to pass the module to the resolve, since the top module is jasmine
        let resolver = new NodeResourceResolver(module);
        resolver.getContents("./CoreSpec", RESULT_TYPE_TXT)
            .subscribe({
                next(data) {
                    expect(data)
                        .toBeTruthy();
                }
            });
    });
});
