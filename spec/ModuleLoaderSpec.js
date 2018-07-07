const {
	NodeModuleLoader
} = require("../src/node/NodeModuleLoader");

describe("node module loader test", () => {
	it("resolve test", (done) => {
		let loader = new NodeModuleLoader(module);
		loader.resolve("./CoreSpec").subscribe(p => {
			expect(p).toBeTruthy();
			done();
		});
	});

	it("resolve test fail", (done) => {
		let loader = new NodeModuleLoader(module);
		loader.resolve("./CoreSpeca").subscribe(p => {
			expect(p).toBeFalsy();
			done();
		});
	});

	it("cache test", (done) => {
		let loader = new NodeModuleLoader(module);
		loader.resolve("./ModuleLoaderSpec").subscribe(p => {
			expect(loader.cache(p)).toBeTruthy();
			done();
		});
	});

	it("loaded test", (done) => {
		let loader = new NodeModuleLoader(module);
		loader.loaded("./ModuleLoader").subscribe(m => {
			expect(m).toBeFalsy();
			done();
		});
	});

	it("load test", (done) => {
		let loader = new NodeModuleLoader(module);
		loader.load("./sample").subscribe(m => {
			expect(m).toBeTruthy();
			done();
		});
	});

	it("reload test", (done) => {
		let loader = new NodeModuleLoader(module);
		loader.load("./sample").flatMap((m1) => loader.reload("./sample").map(m2 => ({m1, m2}))).subscribe(data => {
			expect(data.m1 && data.m2).toBeTruthy();
			expect(data.m1.date == data.m2.date).toBeFalsy();
			done();
		});
	});
});
