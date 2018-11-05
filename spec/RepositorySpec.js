const {
    SimpleRepository
} = require("../src/Repository");

const {
    flatMap,
    map
} = require("rxjs/operators");

describe("the repository implementation tests", () => {
    it("test repository apis", () => {
        let r = new SimpleRepository();
        r.set("hello", "world")
            .pipe(
                flatMap(reg => reg.get("hello"))
            )
            .subscribe({
                next(data) {
                    expect(data)
                        .toEqual("world");
                }
            });

        let data = {
            a: 1,
            b: 2,
            c: 3
        }

        r.setAll(data)
            .pipe(
                flatMap(reg => reg.get("a"))
            )
            .subscribe({
                next(data) {
                    expect(data)
                        .toEqual(1);
                }
            });

        r.watch("a")
            .pipe(
                map(sub => {
                    sub.subscribe({
                        next(x) {
                            expect(x)
                                .toBeTruthy();
                            expect(x.tag)
                                .toBeTruthy();
                            expect(x.type)
                                .toEqual("change");
                            expect(x.tag.origin)
                                .toEqual(data.a);
                            expect(x.tag.value)
                                .toEqual(10);
                        }
                    });
                })
            )
            .subscribe();

        r.set("a", 10)
            .subscribe();
        r.set("b", 10)
            .subscribe();

        r.keys()
            .subscribe({
                next(data) {
                    expect(data.indexOf("hello") != -1)
                        .toBeTruthy();
                    expect(data.indexOf("a") != -1)
                        .toBeTruthy();
                    expect(data.indexOf("b") != -1)
                        .toBeTruthy();
                    expect(data.indexOf("c") != -1)
                        .toBeTruthy();
                }
            });
    });
});
