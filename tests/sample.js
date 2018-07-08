class Test {
    hello() {
        return "Hello";
    }
}

class Hello {
    constructor() {
    }

	world() {
		return "world 1";
	}
}

Test.date = new Date();
Test.Hello = Hello;
module.exports = Test; 
