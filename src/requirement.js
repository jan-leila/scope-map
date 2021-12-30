
const { scope_parser } = require('./parser.js');

module.exports = function requirment(layout, literals) {
    let stack = scope_parser.compile(literals);

    const map = {};

    // flatten out the tree into a list of permissions
    while (stack.length) {
        let next = stack.pop();

        // if the key doesnt exist in the layout then we can just ignore it
        if (layout.map[next.scope] === undefined) {
            continue;
        }

        // dont add ignored modifiers
        if (next.modifier !== 'x') {
            // get read an write perms
            let read = next.modifier.includes('r');
            let write = next.modifier.includes('w');
            if(map[next.scope]){
                map[next.scope] = {
                    read: read || map[next.scope].read,
                    write: write || map[next.scope].write,
                }
            }
            else {
                map[next.scope] = {
                    read,
                    write,
                }
            }
        }

        // if we have children then we need to add them to the queue
        if (next.sub_scopes) {
            stack.push(...next.sub_scopes);
        }
    }

    // TODO: remove redundent perms

    const keys = Object.keys(map);

    const cache = {};

    return function (args) {

        if(cache[args]){
            return cache[args];
        }

        let scopes = args.split(' ').map((arg) => {
            let scope = arg.split(':');
            let modifier = scope[1] || 'r';
            return {
                scope: scope[0],
                excluded: modifier === 'x',
                read: modifier.includes('r'),
                write: modifier.includes('w'),
            };
        });

        // keep track of the required scopes that we find
        let found = new Set();

        let all_match = keys.every((key) => {
            let target = map[key];
            let pointer = layout.map[key];
            while(pointer){
                // see if this key is in the requirements list
                let scope = scopes.find((scope) => {
                    return scope.scope === pointer.scope;
                });

                if(scope){
                    // if this scope is excluded from the scopes return false
                    if(scope.excluded){
                        return false;
                    }
                    // if not then make sure we have all the required perms and add it to the found set
                    if(
                        target.read || !(target.read || scope.read)
                        &&
                        target.write || !(target.write || scope.write)
                    ){
                        found.add(pointer.scope);
                        return true;
                    }
                    // if we dont have the correct perms then return false
                    else {
                        return false;
                    }
                }

                pointer = pointer.parent;
            }
            // if we didnt find a requirement that matches this scope then we are fine
            return true;
        });

        let result = all_match && found.size === keys.length;

        cache[args] = result;
        return result;
    }
}