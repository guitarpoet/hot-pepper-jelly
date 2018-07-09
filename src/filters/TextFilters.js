"use strict";
/**
 * This module provides the text filters that need to be used.
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @date Thu Jul  5 18:30:08 2018
 */
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
require("rxjs/add/observable/of");
require("rxjs/add/observable/from");
require("rxjs/add/operator/mergeMap");
const interfaces_1 = require("../interfaces");
const lodash_1 = require("lodash");
const INCLUDE_PATTERN = /^[ \t]*#include ([a-zA-Z0-9\\._\/]+)/;
const IF_STATE = "if";
const ELSE_STATE = "else";
const IF_PATTERN = /^([ \t])*#if (.+)$/;
const IF_DEF_PATTERN = /^([ \t])*#ifdef (.+)$/;
const IF_ENV_PATTERN = /^([ \t])*#ifenv (.+)$/;
const ELSE_PATTERN = /^([ \t])*#else$/;
const END_IF_PATTERN = /^([ \t])*#endif$/;
const DEFINE_PATTERN = /^([ \t])*#define ([a-z\\.A-Z_]+)( (.+))?/;
const UNDEFINE_PATTERN = /^([ \t])*#undefine ([a-z\\.A-Z_]+)/;
const EXPR_PATTERN = /^([ \t])*#expr (.+)$/;
//const ENABLE_PATTERN:RegExp = /^([ \t])*#enable (([a-z\\.A-Z_]+)([ \t]*,[ \t]*[a-z\\.A-Z_]+)*)$/;
// Let's define the evluate function
exports.evaluate = (expr) => (eval(`(${expr})`));
/**
 * Split the contents, lines by default
 */
exports.split = (sep = "\n") => {
    return (contents) => {
        if (contents) {
            let c = contents;
            return rxjs_1.Observable.from(c.split(sep));
        }
        else {
            return rxjs_1.Observable.from([]);
        }
    };
};
exports.process_includes = (resolver) => {
    return (contents) => {
        if (contents) {
            let m = contents.match(INCLUDE_PATTERN);
            if (m) {
                // Get the resource
                return resolver.getContents(m[1], interfaces_1.RESULT_TYPE_TXT)
                    // Then process it
                    .flatMap(exports.process_common())
                    // Then split it
                    .flatMap(exports.split())
                    // And process the includes of it again
                    .flatMap(exports.process_includes(resolver));
            }
            return rxjs_1.Observable.of(contents);
        }
        else {
            return rxjs_1.Observable.from([]);
        }
    };
};
class Block {
    process() {
    }
}
exports.Block = Block;
exports.handleDefine = (t) => {
    let m = t.match(DEFINE_PATTERN);
    if (m) {
        // This is a define operation
        let name = m[2];
        let value = m[4] || true;
        // OK, let's set the value to the process.env only
        if (name) {
            return new DefineBlock(name, value);
        }
    }
    m = t.match(EXPR_PATTERN);
    if (m) {
        // This is the expression block
        let expr = m[2];
        if (expr) {
            return new ExprBlock(expr);
        }
    }
    m = t.match(UNDEFINE_PATTERN);
    if (m) {
        // This is a undefine operation
        let name = m[2];
        if (name) {
            return new UndefineBlock(name);
        }
    }
    return t;
};
class DefineBlock extends Block {
    constructor(variable, value = true) {
        super();
        this.variable = variable;
        this.value = value;
    }
    process() {
        process.env[this.variable] = this.value;
    }
}
class UndefineBlock extends Block {
    constructor(variable) {
        super();
        this.variable = variable;
    }
    process() {
        if (this.variable &&
            typeof process.env[this.variable] !== "undefined") {
            delete process.env[this.variable];
        }
    }
}
class ExprBlock extends Block {
    constructor(expression) {
        super();
        this.expression = expression;
    }
    process() {
        if (this.expression) {
            // Let's evaluate the expression
            return exports.evaluate(this.expression);
        }
    }
}
class IfBlock extends Block {
    constructor(expression) {
        super();
        this._expression = expression;
        this._state = IF_STATE;
        this._block = [];
        this._alternative = [];
    }
    state(state = ELSE_STATE) {
        this._state = state;
    }
    expr() {
        return exports.evaluate(this._expression);
    }
    process() {
        if (this._expression) {
            if (!!this.expr()) {
                return lodash_1.flatten(this._block.map(b => b instanceof Block ? b.process() : b).filter(i => !!i));
            }
        }
        return lodash_1.flatten(this._alternative.map(b => b instanceof Block ? b.process() : b).filter(i => !!i));
    }
    add(line) {
        if (line) {
            switch (this._state) {
                case IF_STATE:
                    this._block.push(line);
                    break;
                case ELSE_STATE:
                    this._alternative.push(line);
                    break;
            }
        }
    }
}
class IfDefBlock extends IfBlock {
    constructor(variable) {
        super(`typeof ${variable} !== "undefined"`);
    }
}
class IfEnvBlock extends IfBlock {
    constructor(variable) {
        super(`typeof process.env.${variable} !== "undefined"`);
    }
}
exports.process_common = () => {
    return (contents) => {
        if (contents) {
            let text = contents.split("\n");
            // The stack for if else blocks
            let stack = [];
            let currentBlock = null;
            let ret = [];
            let lineNumber = 0;
            for (let t of text) {
                // Increment the line number
                lineNumber++;
                let m = t.match(IF_PATTERN);
                let block = null;
                if (m) {
                    block = new IfBlock(m[2]);
                    if (currentBlock) {
                        // Push the old block into the stack first
                        stack.push(currentBlock);
                        // Then add the block into the current block
                        currentBlock.add(block);
                    }
                    // Update the current block using the new one
                    currentBlock = block;
                    // Then move to next line
                    continue;
                }
                m = t.match(IF_DEF_PATTERN);
                if (m) {
                    block = new IfDefBlock(m[2]);
                    if (currentBlock) {
                        // Push the old block into the stack first
                        stack.push(currentBlock);
                        // Then add the block into the current block
                        currentBlock.add(block);
                    }
                    // Update the current block using the new one
                    currentBlock = block;
                    // Then move to next line
                    continue;
                }
                m = t.match(IF_ENV_PATTERN);
                if (m) {
                    let block = new IfEnvBlock(m[2]);
                    if (currentBlock) {
                        // Push the old block into the stack first
                        stack.push(currentBlock);
                        // Then add the block into the current block
                        currentBlock.add(block);
                    }
                    // Update the current block using the new one
                    currentBlock = block;
                    // Then move to next line
                    continue;
                }
                if (t.match(ELSE_PATTERN)) {
                    // This is an else line, let's update the current block
                    if (!currentBlock) {
                        // We got an error here!
                        throw new Error("You can't use #else if there is no according #if! line: " + lineNumber);
                    }
                    // Let's update the state for current block to else
                    currentBlock.state(ELSE_STATE);
                    // Move to the next line
                    continue;
                }
                if (t.match(END_IF_PATTERN)) {
                    // This is an end if line, let's finish the current block
                    if (stack.length) {
                        // We have the block in the stack, this means this block is a nested block, let's just update the current block
                        currentBlock = stack.pop();
                    }
                    else {
                        // We don't have any blocks in the stack, this means this block is the topmost block, let's add its values to the result
                        ret = ret.concat(currentBlock.process());
                        // Then, let's update the current block to null again
                        currentBlock = null;
                    }
                    // Move to the next line
                    continue;
                }
                let b = exports.handleDefine(t);
                if (currentBlock) {
                    // If there is a block, let's add it into the current block
                    currentBlock.add(b);
                }
                else {
                    if (b instanceof Block) {
                        // If this is a block, let's process it
                        t = b.process();
                        if (!t) {
                            // If there is nothing, let's move to next line
                            continue;
                        }
                        if (lodash_1.isArray(t)) {
                            // If the result is an array, let's put them all together into the return
                            ret = ret.concat(t);
                            // Move to next line
                            continue;
                        }
                        if (!lodash_1.isString(t)) {
                            t = t;
                        }
                    }
                    // This is not any if macro, and there is no block here let's just add it into the ret
                    ret.push(t);
                }
            }
            if (stack.length || !!currentBlock) {
                throw new Error("The text didn't have #if and the #endif match, you should check the text!");
            }
            return rxjs_1.Observable.from(ret);
        }
        else {
            return rxjs_1.Observable.from([]);
        }
    };
};
//# sourceMappingURL=TextFilters.js.map