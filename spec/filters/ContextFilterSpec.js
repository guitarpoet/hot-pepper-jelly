const {
    process_base,
    process_alias,
    process_composite,
    process_object
} = require("../../src/filters/ContextFilter");
const {
    NodeModuleLoader
} = require("../../src/node/NodeModuleLoader");

describe("context filter test", () => {
    it("process base test", () => {
        let a = {
            $base: {
                a: 1,
                b: 2
            },
            a: 3,
            c: [{
                $base: {
                    type: 1
                },
                a: 1
            }, {
                $base: {
                    type: 1
                },
                a: 2
            }]
        }

        a = process_base()(a);
        // Extend
        expect(a.b == 2).toBeTruthy();
        // Override
        expect(a.a == 3).toBeTruthy();
        // The array will be supported
        expect(a.c[0].type == 1).toBeTruthy();
    })

    it("process alias test", () => {
        let aliases = {
            "a": "ThisNameIsTooLong"
        }
        let a = {
            "~a": 1
        }

        a = process_alias(aliases)(a);
        expect(a.ThisNameIsTooLong).toBeTruthy();
    })

    it("process composite test", () => {
        let a = {
            "^a/b/c/d": 1
        }

        a = process_composite()(a);
        expect(a.a.b.c.d == 1).toBeTruthy();
    })

    it("process object test", () => {
        let a = {
            $clean: ["$type", "$module", "$name"],
            $type: "module",
            $module: "../sample",
            $name: "Hello",
            a: 1,
            b: {
                $type: "module",
                $module: "../sample",
                $name: "Hello",
                a: 2
            },
            arr: [{
                $type: "module",
                $module: "../sample",
                $name: "Hello",
                a: 3
            }]
        }

        process_object(new NodeModuleLoader(module))(a).subscribe(a => {
        });
    })
});
