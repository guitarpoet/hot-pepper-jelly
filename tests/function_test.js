const { cache, reload, load, loaded, watcher, resolvePath, getCaller } = require("../src/index");
const path = require("path");

describe("Core Function Test", () => {
	it("registry test", () => {
		cache("name", "Jack");
		expect(cache("name")).toEqual("Jack");
	});

	it("reload test", () => {
		let t = reload("./sample");
		let h = new t.Hello();
		h.world();
		expect(new t.Hello().world()).toEqual("world");
		let time = t.date;
		reload("./sample");
		expect(time == t.date).toBeFalsy();

		t = reload("./sample");
		expect(new t.Hello().world()).toEqual("world");
	});

	it("load test", () => {
		// Load if first
		let t = load("./sample");

		// It must be loaded now
		expect(loaded(path.resolve(path.join(__dirname, "./sample.js")))).toBeTruthy();
	});

	it("watcher test", () => {
		// It must be loaded now
		expect(watcher()).toBeTruthy();
	});
});
