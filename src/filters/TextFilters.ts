/**
 * This module provides the text filters that need to be used.
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 2.0.0
 * @date Thu Jul  5 18:30:08 2018
 */

import { Observable } from "rxjs";
import "rxjs/add/observable/of";
import "rxjs/add/observable/from";
import "rxjs/add/operator/mergeMap";

import { ResourceResolver, RESULT_TYPE_TXT } from "../interfaces";
import { flatten, replace, isArray, isString } from "lodash";


const INCLUDE_PATTERN:RegExp = /^[ \t]*#include ([a-zA-Z0-9\\._\/]+)/;
const IF_STATE:string = "if";
const ELSE_STATE:string = "else";
const IF_PATTERN:RegExp = /^([ \t])*#if (.+)$/;
const IF_DEF_PATTERN:RegExp = /^([ \t])*#ifdef (.+)$/;
const IF_ENV_PATTERN:RegExp = /^([ \t])*#ifenv (.+)$/;
const ELSE_PATTERN:RegExp = /^([ \t])*#else$/;
const END_IF_PATTERN:RegExp = /^([ \t])*#endif$/;
const DEFINE_PATTERN:RegExp = /^([ \t])*#define ([a-z\\.A-Z_]+)( (.+))?/;
const UNDEFINE_PATTERN:RegExp = /^([ \t])*#undefine ([a-z\\.A-Z_]+)/;
const EXPR_PATTERN:RegExp = /^([ \t])*#expr (.+)$/;
const PLACE_HOLDER_PATTERN:RegExp = /\$\([a-zA-Z0-9\\._]+\)/g;
const JSON_PATTERN:RegExp = /([ \t])*#json ([a-zA-Z0-9\\._\/]+)$/; // Yes, sorry, we don't support blank in the file name
const ENABLE_PATTERN:RegExp = /^([ \t])*#enable (([a-z\\.A-Z_]+)([ \t]*,[ \t]*[a-z\\.A-Z_]+)*)$/;


// Let's define the evluate function
export const evaluate = (expr) => (eval(`(${expr})`))

/**
 * Split the contents, lines by default
 */
export const split = (sep:string = "\n"):any => {
	return (contents:any):Observable<string> => {
		if(contents) {
			let c:string = contents as string;
			return Observable.from(c.split(sep));
		} else {
			return Observable.from([]);
		}
	}
}

export const process_includes = (resolver:ResourceResolver):any => {
	return (contents:string):Observable<string> => {
		if(contents) {
			let m = contents.match(INCLUDE_PATTERN);
			if(m) {
				// Get the resource
				return resolver.getContents(m[1], RESULT_TYPE_TXT)
				// Then process it
					.flatMap(process_common())
				// Then split it
					.flatMap(split())
				// And process the includes of it again
					.flatMap(process_includes(resolver))
			}
			return Observable.of(contents);
		} else {
			return Observable.from([]);
		}
	}
}

export class Block {
	process():any {
	}
}

export const handleDefine = (t:string): Block|string => {
	let m = t.match(DEFINE_PATTERN);
	if(m) {
		// This is a define operation
		let name = m[2];
		let value = m[4] || true;
		// OK, let's set the value to the process.env only
		if(name) {
			return new DefineBlock(name, value);
		}
	}

	m = t.match(EXPR_PATTERN);
	if(m) {
		// This is the expression block
		let expr = m[2];
		if(expr) {
			return new ExprBlock(expr);
		}
	}

	m = t.match(UNDEFINE_PATTERN);
	if(m) {
		// This is a undefine operation
		let name = m[2];
		if(name) {
			return new UndefineBlock(name);
		}
	}

	return t;
}

class DefineBlock extends Block {
	private variable:string;
	private value:any;

	constructor(variable:string, value:any = true) {
		super();
		this.variable = variable;
		this.value = value;
	}

	process() {
		process.env[this.variable] = this.value;
	}
}

class UndefineBlock extends Block {
	private variable:string;
	constructor(variable:string) {
		super();
		this.variable = variable;
	}

	process():any {
		if(this.variable &&
			typeof process.env[this.variable] !== "undefined") {
			delete process.env[this.variable];
		}
	}
}

class ExprBlock extends Block {
	private expression:string;

	constructor(expression:string) {
		super();
		this.expression = expression;
	}

	process():any {
		if(this.expression) {
			// Let's evaluate the expression
			return evaluate(this.expression);
		}
	}
}

class IfBlock extends Block {
	private _expression:string;
	private _state:string;
	private _block:Array<Block>;
	private _alternative:Array<Block>;

	constructor(expression:string) {
		super();
		this._expression = expression;
		this._state = IF_STATE;
		this._block = [];
		this._alternative = [];
	}

	state(state:string = ELSE_STATE):void {
		this._state = state;
	}

	expr():any {
		return evaluate(this._expression);
	}

	process():any {
		if(this._expression) {
			if(!!this.expr()) {
				return flatten(this._block.map(b => b instanceof Block? b.process(): b).filter(i=>!!i));
			}
		}

		return flatten(this._alternative.map(b => b instanceof Block? b.process(): b).filter(i=>!!i));
	}

	add(line) {
		if(line) {
			switch(this._state) {
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
	constructor(variable:string) {
		super(`typeof ${variable} !== "undefined"`);
	}
}

class IfEnvBlock extends IfBlock {
	constructor(variable) {
		super(`typeof process.env.${variable} !== "undefined"`);
	}
}

export const process_common = ():any => {
	return	(contents:string):Observable<string> => {
		if(contents) {
			let text:Array<string> = contents.split("\n");
			// The stack for if else blocks
			let stack:Array<string | Block> = [];
			let currentBlock:string|Block = null;
			let ret:Array<string> = [];

			let lineNumber:number = 0;
			for(let t of text) {
				// Increment the line number
				lineNumber++;

				let m = t.match(IF_PATTERN);
				let block:IfBlock = null;
				if(m) {
					block = new IfBlock(m[2]);

					if(currentBlock) {
						// Push the old block into the stack first
						stack.push(currentBlock);

						// Then add the block into the current block
						(currentBlock as IfBlock).add(block);
					}

					// Update the current block using the new one
					currentBlock = block;

					// Then move to next line
					continue;
				}

				m = t.match(IF_DEF_PATTERN);
				if(m) {
					block = new IfDefBlock(m[2]);

					if(currentBlock) {
						// Push the old block into the stack first
						stack.push(currentBlock);

						// Then add the block into the current block
						(currentBlock as IfBlock).add(block);
					}

					// Update the current block using the new one
					currentBlock = block;

					// Then move to next line
					continue;
				}

				m = t.match(IF_ENV_PATTERN);
				if(m) {
					let block = new IfEnvBlock(m[2]);

					if(currentBlock) {
						// Push the old block into the stack first
						stack.push(currentBlock);

						// Then add the block into the current block
						(currentBlock as IfBlock).add(block);
					}

					// Update the current block using the new one
					currentBlock = block;

					// Then move to next line
					continue;
				}

				if(t.match(ELSE_PATTERN)) {
					// This is an else line, let's update the current block
					if(!currentBlock) {
						// We got an error here!
						throw new Error("You can't use #else if there is no according #if! line: " + lineNumber);
					}

					// Let's update the state for current block to else
					(currentBlock as IfBlock).state(ELSE_STATE);

					// Move to the next line
					continue;
				}

				if(t.match(END_IF_PATTERN)) {
					// This is an end if line, let's finish the current block
					if(stack.length) {
						// We have the block in the stack, this means this block is a nested block, let's just update the current block
						currentBlock = stack.pop();
					} else {
						// We don't have any blocks in the stack, this means this block is the topmost block, let's add its values to the result
						ret = ret.concat((currentBlock as Block).process() as string);
						// Then, let's update the current block to null again
						currentBlock = null;
					}

					// Move to the next line
					continue;
				}

				let b = handleDefine(t);

				if(currentBlock) {
					// If there is a block, let's add it into the current block
					(currentBlock as IfBlock).add(b);
				} else {
					if(b instanceof Block) {
						// If this is a block, let's process it
						t = b.process();
						if(!t) {
							// If there is nothing, let's move to next line
							continue;
						}

						if(isArray(t)) {
							// If the result is an array, let's put them all together into the return
							ret = ret.concat(t);
							// Move to next line
							continue;
						}

						if(!isString(t)) {
							t = t as string;
						}
					}

					// This is not any if macro, and there is no block here let's just add it into the ret
					ret.push(t);
				}
			}

			if(stack.length || !!currentBlock) {
				throw new Error("The text didn't have #if and the #endif match, you should check the text!");
			}
			return Observable.from(ret);
		} else {
			return Observable.from([]);
		}

		return null;
	}
}
