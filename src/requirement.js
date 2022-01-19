
module.exports = function requirment(layout, scopes) {
    // turn the array of scopes into a map for easier access
    const map = {};
    scopes.forEach(({ scope, read, write, excluded }) => {
        // ignore excluded modifiers
        if(excluded){
            return;
        }

        // check for an existing modifier
        let existing = map[scope];
        // if it doesnt exist just set it
        if(!existing) {
            map[scope] = { read, write };
        }
        // if it does exist then merge them
        else {
            // merge modifiers together
            map[scope] = {
                read: read || existing.read,
                write: write || existing.write,
            };
        }
    });

    const requirements = Object.keys(map).map((key) => {
        return {
            scope: key,
            ...map[key],
        }
    });

    const cache = {};
    return function(literals){
        if(cache[literals]){
            return cache[literals];
        }

        let scopes = {};
        layout.parse(literals).forEach(({ scope, modifier }) => {
            scopes[scope] = layout.deserialize(modifier);
        });

        let result = requirements.every(({ scope, read, write }) => {
            let pointer = layout.map[scope];
            let found_read = false;
            let found_write = false;
            while(pointer){
                // check to see if we specified a scope for this ancester
                let ancester = scopes[pointer.scope];
                if(ancester){
                    // if our nearist ancester is an exclution we failed
                    if(ancester.excluded){
                        return false;
                    }
                    // update search criteria
                    found_read = found_read || ancester.read;
                    found_write = found_write || ancester.write;
                    // check if we match the criteria
                    if(!read || found_read && !write || found_write){
                        return true;
                    }
                }
                // if we didnt find an ancester or failed to match criteria then try next ancester
                pointer = pointer.parent;
            }

            return false;
        });

        cache[literals] = result;
        return result;
    }
}