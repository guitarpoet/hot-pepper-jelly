const { global_registry, pipe, cache, reload, load, loaded, watcher, resolvePath, getCaller, enable_hotload, enable_features, enabled_features , feature_enabled, chain, template, handlebarTemplate, updateNodePath } = require("../src/index");
const path = require("path");

enable_features( {
    hotload: true, // Enable the hot load
    template_file: true // Enable the template file
});

// Add the templates directory of tests into the template path search
global_registry("template_path", [ path.join(__dirname, "templates")]);

describe("Core Function", () => {
    it("hot load feature enable test", () => {
        expect(feature_enabled("hotload")).toBeTruthy();
    });

    it("registry test", () => {
        cache("name", "Jack");
        expect(cache("name")).toEqual("Jack");
    });

    it("load node path test", () => {
        let t = load("sample");
        console.info(t, t.Hello, t.date);
        expect(t).toBeTruthy();
        expect(new t.Hello().world()).toEqual("world");
    });

    it("second level proxy test", () => {
        let { Hello } = load("sample");
        expect(Hello).toBeTruthy();
        expect(new Hello().world()).toEqual("world");
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

        chain("World").chain([
            (name => {
                return new Promise((resolve, reject) => {
                    resolve("Hello " + name);
                });
            }),
            (name => name + " Third Time")])
            .then(name => expect(name).toEqual("Hello World Third Time"));
        pipe("world")().then(text => expect(text).toBe("world"));
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

    it("template test", () => {
        let tt = "Hello {{name}}";
        let name = "World";
        expect(template(tt, {name})).toEqual("Hello World");
        expect(handlebarTemplate(tt)).toBeTruthy();
    });

    it("template file test", () => {
        let tt = "Hello {{name}}";
        let name = "World";
        expect(template(tt, {name})).toEqual("Hello World");
        expect(template("hello", {name}).trim()).toEqual("Hello World");
        expect(handlebarTemplate(tt)).toBeTruthy();
    });

    it("test load with resolver", () => {
        // Load and force
        let s = load("./sample", true, require.resolve);
        l = load("lodash", true, require.resolve);
        expect(s && s.Hello).toBeTruthy();
        expect(l).toBeTruthy();
    })

    it("Update Node Path Test", () => {
        expect(updateNodePath().indexOf(path.resolve(path.join(__dirname, "..")))).toBe(0);
    })

    it("Set Test", () => {
        const {Hello} = load("./sample.js", true, require.resolve);
        let h = new Hello();
        h.a = 1;
        expect(h.a).toEqual(1);
        let h2 = new Hello();
        h2.a = 2;
        expect(h2.a).toEqual(2);
        expect(h.a).toEqual(1);
    });

    it("template json test", () => {
        let str = template("{{{json hello}}}", {hello: {name : "world"}});
        console.info(str);
    });
});
