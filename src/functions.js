/**
 * The utils functions
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 0.0.1
 * @date Thu Nov 30 11:43:05 2017
 */

const fs = require("fs");
const path = require("path");

const safeGet = (obj, name, defaultValue = null) => {
    if(obj && name) {
        return obj[name] || defaultValue;
    }
    return defaultValue;
}

const propGet = (obj, property, defaultValue = null) => {
    let ps = property.split(".");
    let o = obj;
    while(ps.length) {
        // Get the first key in the properties
        let key = ps.shift();
        o = safeGet(o, key);
        if(!o) {
            // If there is no value, let's break
            break;
        }
    }

    if([o, o === false, o === "", o === 0]
        .filter(i => !!i)) {
        return o;
    }

    return defaultValue;
}

const getFileContents = (path) => {
	return new Promise((resolve, reject) => {
		fs.access(path, fs.constants.R_OK | fs.constants.W_OK, (err) => {
			if(err) {
				reject(`Error: Reading file ${path} -> ${err}`);
			} else {
				fs.readFile(path, "utf-8", (err, data) => {
					if(err) {
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
	if(fs.existsSync(path)) {
		return fs.readFileSync(path, "utf-8");
	}
	return false;
}


module.exports = {
	safeGet, propGet, getFileContentsSync, getFileContents
}
