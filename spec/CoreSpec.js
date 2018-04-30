const {isNode} = require("../src/core");

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
});
