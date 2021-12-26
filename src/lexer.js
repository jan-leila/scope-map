const moo = require('moo');

let lexer = moo.compile({
	whitespace: [ { match: /[ \n\t]+/, lineBreaks: true }, /[ \t]+/s ],
    comment: /#.*/,
	scope: /\w+/,
	lcbracket:  '{',
	rcbracket:  '}',
	modifier: [
		':r', ':w', ':rw', ':x',
	],
});

module.exports = {
	next: () => {
		let next;
		do {
			next = lexer.next();
			if(next == undefined){
				return;
			}
		} while(next.type === 'comment' || next.type === 'whitespace');
		return next;
	},
	reset: (...args) => {
		return lexer.reset(...args);
	},
	save: (...args) => {
		return lexer.save(...args);
	},
	formatError: (...args) => {
		return lexer.formatError(...args);
	},
	has: (...args) => {
		return lexer.has(...args);
	},
};