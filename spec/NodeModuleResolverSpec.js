const { NodeModuleResolver } = require("../src/node/NodeModuleResolver");

describe("node module resolver test", () => {
	it("test resolve", () => {
        // Let's use the current module to resolve the module
        let resolver = new NodeModuleResolver(module);
        // Let's check if it can resolve itself
        resolver.resolve("../src/node/NodeModuleResolver").subscribe({
            next(m) {
                expect(m).toBeTruthy();
            }
        });

        resolver.resolve("abc").subscribe({
            error(e) {
                expect(e).toBeTruthy();
            }
        });
    });
});
