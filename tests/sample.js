class Test {
    hello() {
        return "Hello";
    }
}
class Hello {
    constructor() {
    }

	world() {
		return "world";
	}
}

Test.date = new Date();
Test.Hello = Hello;
module.exports = Test; 
