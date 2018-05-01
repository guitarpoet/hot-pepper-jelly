const {isNode, registry} = require("../src/core");

describe("core function test", () => {
	it("is node test", () => {
		isNode.subscribe({
			next(node) {
				expect(node).toBeTruthy();
			},
			error(e) {
				fail(e);
			}
		});
	});

	it("registry test", () => {
        registry("hello").subscribe(reg => {
            console.info(reg);
        });
        registry("hello").subscribe(reg => {
            console.info(reg);
        });
	});
});
