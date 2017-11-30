const { cache, reload, load, loaded, watcher } = require("../src/index");

describe("Core Function Test", () => {
	it("registry test", () => {
		cache("name", "Jack");
		expect(cache("name")).toEqual("Jack");
	});

	it("reload test", () => {
		let t = reload(`${__dirname}/sample`);
		let h = new t.Hello();
		h.world();
		expect(new t.Hello().world()).toEqual("world");
		let time = t.date;
		reload(`${__dirname}/sample`);
		expect(time == t.date).toBeFalsy();

		t = reload(`${__dirname}/sample1`);
		expect(new t().world()).toEqual("world");
	});

	it("load test", () => {
		// Load if first
		let t = load(`${__dirname}/sample`);

		// It must be loaded now
		expect(loaded(`${__dirname}/sample.js`)).toBeTruthy();
	});

	it("watcher test", () => {
		// It must be loaded now
		expect(watcher()).toBeTruthy();
	});
});
