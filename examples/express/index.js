/**
 * The express main entry for the demo of hot pepper jelly
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 1.0.0
 * @date Tue Dec  5 17:29:17 2017
 */

const express = require("express");
const { enable_hotload, load, chain } = require("../../src/index");
const init = require("./initializer.js");
const run = require("./starter");
const path = require("path");

enable_hotload(); // Let's enable the hot reload feature

const error_report = console.error;
const setup_router = (app) => {
    app.use("/", load("./router"));
    return app;
}

chain([ init, setup_router, run ])(express()).
    then(() => console.info("Done")).catch(error_report);
