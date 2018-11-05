/**
 * The utils functions
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 0.0.1
 * @date Thu Nov 30 11:43:05 2017
 */

const {
    get
} = require("lodash");


/**
 * This function will check if we are in NodeJS 
 */
const isNode = () => {
    // Let's check if we can have the CommonJs first, since NodeJS must support CommonsJS in current version
    if (typeof module !== "undefined" && module.exports) {
        // Yes, we do have the CommonJs, but we are not sure if we are in the browser, let's check if we are in the browser
        return typeof window === "undefined";
    }
    // We are in the browser
    return false;
}

// TODO: Maybe find a better way to handle this? Using some webpack's function to make this working better?
const fs = isNode() ? require("fs") : {};
const path = isNode() ? require("path") : {};

const getFileContents = (path) => {
    return new Promise((resolve, reject) => {
        if (!isNode()) {
            // TODO: We only reject the function for current version(version 1.1), need to find a better way to handle this function in the future
            reject("We are not in the NodeJS environment, don't support file functions in browsers for version 1.1");
            return;
        }

        fs.access(path, fs.constants.R_OK | fs.constants.W_OK, (err) => {
            if (err) {
                reject(`Error: Reading file ${path} -> ${err}`);
            } else {
                fs.readFile(path, "utf-8", (err, data) => {
                    if (err) {
                        reject(`Error: Reading file ${module} -> ${err}`);
                    } else {
                        resolve(data);
                    }
                });
            }
        });
    });
}

const getFileContentsSync = (path) => {
    if (!isNode()) {
        // TODO: We only support NodeJS for the file functions for this version.
        return false;
    }

    if (fs.existsSync(path)) {
        return fs.readFileSync(path, "utf-8");
    }
    return false;
}


module.exports = {
    getFileContentsSync,
    getFileContents,
    isNode
}
