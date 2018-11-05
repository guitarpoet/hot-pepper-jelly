const {
    configure
} = require("../node");

const {
    features_enabled,
    enabled_features
} = require("../core");
const {
    flatMap,
    map
} = require("rxjs/operators");

describe("node", () => {
    it("configure", (done) => {
        configure("./m1.txt", module)
            .pipe(
                flatMap((data) => {
                    return enabled_features();
                }),
                map((data) => {
                    expect(data.test && data.play && data.dev)
                        .toBeTruthy();
                    expect(data.IMPOSSIBLE).toBeFalsy();
                })
            )
            .subscribe({
                next() {
                    done();
                },
                error(e) {
                    done(e);
                }
            });
    })
});
