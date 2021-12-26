@{%
	const lexer = require('../src/lexer.js');
%}
@lexer lexer

SCOPES -> SCOPE:* {% (data) => {
    return data[0];
}%}

SCOPE -> SINGLE_SCOPE (SUB_SCOPE):? {% (data) => {
    if(data[1]){
        return {
            scope: data[0],
            sub_scopes: data[1][0],
        }
    }
    return {
        scope: data[0]
    };
}%}

SUB_SCOPE -> "{" SCOPE:* "}" {% (data) => {
    let out = data[1];
    return out;
}%}

SINGLE_SCOPE -> %scope {% (data) => {
    let out = data[0].value;
    return out;
}%}
