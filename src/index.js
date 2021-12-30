
const nearley = require("nearley");
const layout = require("../build/layout.js");
const scope = require("../build/scope.js");

class Parser {
    constructor(grammar){
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
const scope_parser = new Parser(scope);

function requirment(layout, literals){
    let stack = scope_parser.compile(literals);
    let keys = [];

    // flatten out the tree into a list of permissions
    while(stack.length){
        let next = stack.pop();

        // if the key doesnt exist in the layout then we can just ignore it
        if(layout.map[next.scope] === undefined){
            continue;
        }

        // dont add ignored modifiers
        if(next.modifier !== 'x'){
            // we only need the scope and modifier info in the flattened map
            keys.push({ scope: next.scope, modifier: next.modifier });
        }

        // if we have children then we need to add them to the queue
        if(next.sub_scopes){
            stack.push(...next.sub_scopes);
        }
    }

    // TODO: simplify key list

    const map = {};

    keys.forEach((key) => {
        // find key on layout diagram
        let pointer = layout.map[key.scope];
        let init_value = map[key.scope];
        while(pointer){
            if(map[pointer.scope] !== init_value){
                break;
            }
            map[pointer.scope] = key.scope;
            pointer = pointer.parent;
        }
    });

    let cache = {};

    return function(args){

        if(cache[args]){
            return cache[args];
        }

        let scopes = args.split(' ').map((arg) => {
            let scope = arg.split(':');
            return {
                scope: scope[0],
                modifier: scope[1] || 'r',
            };
        });

        scopes = scopes.map(({ scope, modifier }) => {
            return {
                scope: map[scope],
                modifier
            }
        }).filter(({ scope }) => {
            return scope !== undefined;
        });


        let compiled_scopes = {};

        scopes.forEach(({ scope, modifier }) => {
            if(compiled_scopes[scope] === undefined){
                compiled_scopes[scope] = modifier;
            }
            if(compiled_scopes[scope] === 'x'){
                return;
            }
            if(modifier === 'x'){
                compiled_scopes[scope] = 'x';
                return;
            }
            if(compiled_scopes[scope] === 'r'){
                if(modifier === 'w'){
                    compiled_scopes[scope] = 'rw';
                }
            }
            if(compiled_scopes[scope] === 'w'){
                if(modifier === 'r'){
                    compiled_scopes[scope] = 'rw';
                }
            }
        });

        let result = keys.every((key) => {
            let scope = compiled_scopes[key.scope];
            if(scope === undefined){
                return false;
            }
            return key.modifier.includes(scope);
        });

        cache[args] = result;

        return result;
    }
}

class Scope {
    constructor(literals){
        const stack = layout_parser.compile(literals);
        this.map = {};

        while(stack.length){
            let next = stack.pop();

            // add values to map avoiding duplicate keys
            if(this.map[next.scope]){
                throw new Error(`duplicate key ${value}`);
            }
            this.map[next.scope] = next;

            if(next.sub_scopes){
                next.sub_scopes.forEach((child) => {
                    child.parent = next;
                });
                stack.push(...next.sub_scopes);
            }
        }
    }

    allow([ literals ]){
        let stack = scope_parser.compile(literals);
        let keys = [];

        // flatten out the tree into a list of permissions
        while(stack.length){
            let next = stack.pop();

            // if the key doesnt exist in the layout then we can just ignore it
            if(this.map[next.scope] === undefined){
                continue;
            }

            // we only need the scope and modifier info in the flattened map
            keys.push({ scope: next.scope, modifier: next.modifier });
            // if we have children then we need to add them to the queue
            if(next.sub_scopes){
                stack.push(...next.sub_scopes);
            }
        }

        // filter out redundant permissions
        keys = keys.filter((key) => {
            // find key on layout diagram
            let pointer = this.map[key.scope].parent;
            // traverse through that keys ancestors till we find one that matches a defined scope
            while(pointer){
                let ancester = keys.find(({ scope }) => {
                    return scope === pointer.scope;
                });
                // if we found a matching ancester then remove if the ancester has the same permitions as the target scope
                if(ancester){
                    return ancester.modifier !== key.modifier;
                }
                pointer = pointer.parent;
            }
            return true;
        });

        // convert to sendable format removing redundent information
        return keys.map(({ scope, modifier }) => {
            if(modifier === 'r'){
                return scope;
            }
            return `${scope}:${modifier}`;
        }).join(" ");
    }

    require([ literals ]){
        return requirment(this, literals);
    }
}

module.exports = function scope(args){
    return new Scope(args[0]);
}