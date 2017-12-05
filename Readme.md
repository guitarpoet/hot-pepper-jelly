# The real JavaScript hot reloader you really need.

## The problem

Everything is dynamic is the one of the best nature of the JavaScript.

But, when is the last time you are getting benefits from it?

You mean [WebPack](http://webpack.github.io)'s hot loader?

No! It is not even worth to check out.

I've work on a hack of WebPack's hot loader recently, the design of it is pretty bad, and, to say, very very very old school(It is 2017 now, what's the point of using a setInterval to check if the module is compiled when you already have WebSocket already working in the NodeJS, besides, many references are local, and hard coded, so the really "hot" is refresh the browser only.)

This apply to the [expressjs](http://expressjs.com) too, express is a good framework for create small and beautiful applications using the power of NodeJS.

But, how can it get the benefits of the JavaScript's dynamic nature? Nothing.

What you can only do now is make it watch your code change, and restart it again. Pardon me, it is year 2017 now! When is the first time you saw Java's hot loading? Apache Tomcat did this 18 years ago from now. And we still need to restart the server to reload the code change for JavaScript!


## The Problem in Code

Then, how can we get this fixed? Let's face the code first, say, we have a small express server running using the code like this:

		// index.js
		const express = require("express");
		const init = require("./initializer.js");
		const router = require("./router");
		const run = require("./starter");

		const error_report = console.error;
		const setup_router = (app) => {
			return new Promise((resolve, reject) => {
				app.use("/", router);
				resolve(app);
			});
		}

		init(express())
			.then(setup_router)
			.then(run)
			.catch(error_report);

		// router.js
		const { Router } = require('express');

		const router = new Router();

		router.get("/", (req, res) => {
			res.send("Hello world");
		});

		module.exports = router;

After the server is running, how can you update the router file and reload it?

What's the problem we are facing here?

1. The router object that created and transfered after the app is initialized and before the app start. It will stay there for ever before the server restart
2. In fact, the app we used here, is just a local references all around, there is no way to get hold the server unless we are in the chain
3. Everything is dynamic, yet static, no dynamic feature of JavaScript is used, only the weak type system.

## The Solution

So, how can we make this better?

NodeJS is already give us enough flexibility to make this done. Here is the code how hot-pepper-jelly checked for this

1. hot-pepper-jelly will provide a function called `load` will replace the old `require`, it is the entry point for all magic.
2. hot-pepper-jelly will manage a global registry to manage all object loaded, so every loaded object will have only one in the whole lifetime
3. hot-pepper-jelly will create a Proxy for any object loaded using the `load` function, this proxy is the magic for the hot loading, it will support all functions that the loaded object provides, but only use the loaded in the global registry for the target

This means that, even the object reference is not changed in the run time, the implementation can be changed, this is just the way Java's hot load and replace.

And then, hot-pepper-jelly will provide you the functions to watch the file changes, and reload the file change into the global object registry. So that the proxy will use the newly loaded code.

By using this way, you won't need restart anything(or even rewrite much of your code), you can get the hot loading done beautifully.

The code is like this:


		// The index.js
		const express = require("express");
		const { global_registry, enable_hotload, load } = require("hot-pepper-jelly");
		const init = require("./initializer.js");
		const run = require("./starter");
		const path = require("path");

		enable_hotload(); // Let's enable the hot reload feature

		const error_report = console.error;
		const setup_router = (app) => {
			return new Promise((resolve, reject) => {
				app.use("/", load("./router"));
				resolve(app);
			});
		}

		init(express())
			.then(setup_router)
			.then(run)
			.catch(error_report);

		// The starter.js
		const { watch_and_reload } = require("hot-pepper-jelly");

		module.exports = (app) => {

			// Let's watch all file change in current folder, and reload them into NodeJS
			watch_and_reload([__dirname]);

			app.listen(8080, () => {
				console.log("Started....");
			});
		}

