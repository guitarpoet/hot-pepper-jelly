/**
 * The express main entry for the demo of hot pepper jelly
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 1.0.0
 * @date Tue Dec  5 17:29:17 2017
 */

const express = require("express");
const { global_registry, enable_hotload, load } = require("../../src/index");
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
