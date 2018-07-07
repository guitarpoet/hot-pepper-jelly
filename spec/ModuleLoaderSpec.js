const {
	NodeModuleLoader
} = require("../src/node/NodeModuleLoader");

require("rxjs/add/operator/delay");

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
		let { date } = require("./sample");
		loader.reload("./sample")
			.concat(loader.reload("./sample")).reduce((a, i) => a.push(i) && a, []).subscribe(data => {
				let orig = data[0];
				let now = data[1];
				expect(require("./sample").Hello === now.Hello).toBeFalsy()
				expect(now.date !== date).toBeTruthy();
				done();
			});
	});
});
