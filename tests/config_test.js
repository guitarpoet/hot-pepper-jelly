const { configure } = require("../node");

configure("./test.yaml", module).subscribe(data => {
	console.info(data);
});
