/**
 * The initializer for the express server, for now, does nothing
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 1.0.0
 * @date Tue Dec  5 17:30:04 2017
 */

const { global_registry } = require("../../src/index");

module.exports = (app) => {
    // Add the app into the global registry to global access
    global_registry("app", app);
    return app;
}
