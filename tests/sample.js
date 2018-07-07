class Test {
    hello() {
        return "Hello";
    }
}

class Hello {
    constructor() {
    }

	world() {
		return "world aa";
	}
}

Test.date = new Date();
Test.Hello = Hello;
module.exports = Test; 
