const { cache, reload, load, loaded, watcher, resolvePath, getCaller, enable_hotload, enabled_features , feature_enabled, chain} = require("../src/index");
const path = require("path");

enable_hotload();

describe("Core Function Test", () => {
    it("hot load feature enable test", () => {
        expect(feature_enabled("hotload")).toBeTruthy();
    });

    it("registry test", () => {
        cache("name", "Jack");
        expect(cache("name")).toEqual("Jack");
    });

    it("reload test", () => {
        let t = load("./sample");
        let h = new t.Hello();
        h.world();
        expect(new t.Hello().world()).toEqual("world");
        let time = t.date;
        reload("./sample");
        expect(time == t.date).toBeFalsy();
        t = reload("./sample");
        expect(new t.Hello().world()).toEqual("world");
    });

    it("chain test", () => {
        chain(name => "Hello " + name)("World")
            .chain(name => name + " Again")
            .then(name => expect(name).toEqual("Hello World Again"))
            .catch(console.error);

        chain([
            (name => "Hello " + name),
            (name => name + " Third Time")
        ])("World")
            .then(name => expect(name).toEqual("Hello World Third Time"))
            .catch(console.error);

        chain("World").chain(name => "Hello " + name)
            .then(name => expect(name).toEqual("Hello World"));
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
