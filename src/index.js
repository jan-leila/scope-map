
const { layout_parser } = require('./parser.js');
const requirement = require('./requirement.js');

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

        this._simplify_cache = {};

        this.requirements = [];
    }

    _normalize(args){
        return args
            .flat()
            .map(arg => arg.split(/\s+/))
            .flat()
            .filter(literal => literal !== '')
            .sort();
    }

    // get the parts of the requirements
    deserialize(modifier){
        if(modifier.includes('x')){
            return {
                excluded: true,
                read: false,
                write: false,
            };
        }
        return {
            excluded: false,
            read: modifier.includes('r'),
            write: modifier.includes('w'),
        }
    }

    // Take in a list of literals and split into scope and modifier
    _parse(literals){
        return literals.map((literal) => {
            let [ scope, modifier = 'r' ] = literal.split(':');
            if(modifier === ''){
                modifier = 'r';
            }
            return { scope, modifier }
        });
    }

    parse(literals){
        return this._parse([ literals ]);
    }

    // Take in a list of scopes and remove redundants
    _simplify(args){
        // normalize inputs
        let literals = this._normalize(args);

        // check for a cached value
        let key = literals.join(' ');
        let cached = this._simplify_cache[key];
        if(cached){
            return cached;
        }

        let scopes = this._parse(literals);

        // turn the list into a hash table for quicker access and to de duplicate
        let keys = {};
        scopes.forEach(({ scope, modifier }) => {
            // get the value modifer parts
            let current = this.deserialize(modifier);
            // check for an existing modifier
            let existing = keys[scope];
            if(!existing){
                keys[scope] = current;
            }
            else {
                // merge modifiers together
                keys[scope] = {
                    excluded: current.excluded || existing.excluded,
                    read: current.read || existing.read,
                    write: current.write || existing.write,
                };
            }
        });

        // turn hash table back into list
        scopes = Object.keys(keys).map((key) => {
            return {
                scope: key,
                ...keys[key],
            }
        });

        // filter out redundant permissions
        scopes = scopes.filter(({ scope, excluded, read, write }) => {
            // find key on layout diagram
            let pointer = this.map[scope].parent;
            // traverse through that keys ancestors till we find one that is set
            while (pointer) {
                let ancester = keys[pointer.scope];
                // if we found a matching ancester then remove if the ancester has greater permitions then us
                if(ancester){
                    return (
                        (!ancester.read && read) ||
                        (!ancester.write && write) || 
                        (ancester.excluded !== excluded)
                    );
                }
                // if we didnt find a match then check its parent for a match
                pointer = pointer.parent;
            }
            // if no matches where found then keep it
            return true;
        })
        // sort so downstreams can use memoization
        .sort((a, b) => {
            return (a.scope < b.scope) ? -1 : (a.scope > b.scope) ? 1 : 0;
        });

        // cache value
        this._simplify_cache[key] = scopes;

        return scopes;
    }

    allow(...args) {
        let scopes = this._simplify(args);

        let scope = scopes.map(({ scope, excluded, read, write }) => {
            let modifier = excluded ? 'x' : (read ? 'r' : '') + (write ? 'w' : '');
            if(modifier === 'r'){
                return scope;
            }
            return `${scope}:${modifier}`;
        }).join(" ");
        return scope;
    }

    prime(scope){
        this.requirements.forEach((req) => {
            req(scope);
        });
    }

    require(...args) {
        let scopes = this._simplify(args);
        let out = requirement(this, scopes);
        this.requirements.push(out);
        return out;
    }
}

module.exports = function scope(args){
    return new Scope(args[0]);
}