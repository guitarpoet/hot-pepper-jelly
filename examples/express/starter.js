/**
 * The starter of the server, only run and listen
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 1.0.0
 * @date Tue Dec  5 17:33:49 2017
 */

const { watch_and_reload } = require("../../src/index");

module.exports = (app) => {
    return new Promise((resolve, reject) => {
        // Let's watch all file change in current folder, and reload them into NodeJS
        watch_and_reload([__dirname]);

        app.listen(8080, () => {
            resolve(app);
        });
    });
}

