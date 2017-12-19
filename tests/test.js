const { load, reload, start_watch, watch_and_reload, debug, enable_features } = require("../src/index");

enable_features( {
    hotload: true, // Enable the hot load
    template_file: true // Enable the template file
});

const { Hello, date } = load("./sample");
const Test = load("sample");

let h = new Hello();
let t = new Test();

setInterval(() => {
    console.info(new Hello().world(), h.world());
    console.info(new Test().hello(), t.hello());
}, 1000);

watch_and_reload([__dirname], (module, path, type) => {
    debug("The file {{path}} is updated, and the type is {{type}}", {path, type});
}, false);
