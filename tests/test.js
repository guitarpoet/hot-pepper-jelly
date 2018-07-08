const {
    NodeModuleLoader
} = require("../src/node/NodeModuleLoader");

const {
    enable_features
} = require("../src/core");


enable_features({hotload: true}).subscribe();
const {
    Watcher
} = require("../src/node/Watcher");

require("rxjs/add/operator/filter");

let loader = new NodeModuleLoader(module);

loader.load("./sample").subscribe(Test => {
    const {
        Hello,
        date
    } = Test;

    let h = new Hello();
    let t = new Test();

    setInterval(() => {
        console.info(Test.date);
        console.info(new Hello().world(), h.world());
        console.info(new Test().hello(), t.hello());
    }, 1000);
});

new Watcher().watch(__dirname).filter(({
    filename
}) => filename.match(/.js$/) || filename.match(/.json$/)).subscribe(({
    filename,
    eventType
}) => {
    console.info(`Reloading file ${filename}`);
    loader.reload(filename).subscribe(m => {
        console.info(filename, eventType);
    });
});
