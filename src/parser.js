
const nearley = require("nearley");
const layout = require("../build/layout.js");

class Parser {
    constructor(grammar) {
        this.parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
        this.start_state = this.parser.save();
    }

    compile(literals) {
        this.parser.restore(this.start_state);
        this.parser.feed(literals);
        return this.parser.results[0];
    }
}

const layout_parser = new Parser(layout);

module.exports = { layout_parser };