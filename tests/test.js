const { load, reload, start_watch, watch_and_reload, debug } = require("../src/index");

const test = load("./sample");

console.info(test);

setInterval(() => {
	console.info(test.date);
}, 1000);

watch_and_reload([__dirname], (module, path, type) => {
    debug("The file {{path}} is updated, and the type is {{type}}", {path, type});
}, false);
