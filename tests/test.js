const {
	NodeModuleLoader
} = require("../src/node/NodeModuleLoader");

const {
	Watcher
} = require("../src/node/Watcher");

let loader = new NodeModuleLoader(module);
let watcher = new Watcher();


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

watcher.watch([__dirname], (file_path, type) => {
	if (file_path.match(/.js$/) || file_path.match(/.json$/)) {
		// Only check for js and json
		console.info(`Reloading file ${file_path}`);

		loader.reload(file_path).subscribe(m => {
			console.info(file_path, type);
		});
	}
});
