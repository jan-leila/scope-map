
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

class Requirment {

    constructor(layout, literals){
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

        this.map = {};

        keys.forEach((key) => {
            // find key on layout diagram
            let pointer = layout.map[key.scope];
            while(pointer){
                if(this.map[pointer.scope]){
                    if(this.map[pointer.scope] === key.modifier){
                        return;
                    }
                    this.map[pointer.scope] += key.modifier;
                }
                else {
                    this.map[pointer.scope] = key.modifier;
                }
                pointer = pointer.parent;
            }
        });
    }

    test(scopes){
        return scopes.split(' ').map((arg) => {
            let scope = arg.split(':');
            return {
                scope: scope[0],
                modifier: scope[1] || 'r',
            };
        }).every(({ scope, modifier }) => {
            if(!this.map[scope]){
                return true;
            }
            return modifier.includes(this.map[scope]);
        });
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
        return new Requirment(this, literals);
    }
}

module.exports = function scope(args){
    return new Scope(args[0]);
}