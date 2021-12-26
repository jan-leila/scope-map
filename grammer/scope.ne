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
            ...data[0],
            sub_scopes: data[1][0],
        }
    }
    return data[0];
}%}

SUB_SCOPE -> "{" SCOPE:* "}" {% (data) => {
    let out = data[1];
    return out;
}%}

SINGLE_SCOPE -> %scope (%modifier):? {% (data) => {
    if(data[1]){
        return {
            scope: data[0].value,
            modifier: data[1][0].value.slice(1),
        };
    }
    return {
        scope: data[0].value,
        modifier: "r"
    };
}%}
