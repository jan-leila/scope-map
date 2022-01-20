
# scope-map
![MIT license](https://img.shields.io/npm/l/scope-map) ![minified size 20kb](https://img.shields.io/bundlephobia/min/scope-map)

define trees of scopes, create scope strings to provide access without redundancy, and matching agains required scopes

[![NPM](https://nodei.co/npm/scope-map.png)](https://npmjs.org/package/scope-map)

### usage

creating a scope layout
```js
const scope = require('scope-map');

let layout = scope`
    root {
        scope1
        scope2
    }
`;
```

creating permissions to target route(s)
```js
let allow_root = layout.allow('root');
let allow_0 = layout.allow('scope1');
let allow_1 = layout.allow('scope1 scope2');
let allow_2 = layout.allow('scope1', 'scope2');
let allow_3 = layout.allow`scope1 scope2`;

/* NOTE:
 * scope map doesnt extrapolate all sub scopes to mean
 * a common parent scope so that parent scopes can later
 * be expanded without giving scopes to unauthorized clients
 */ 
// true
console.log(allow_root != allow_1);
```

scope modifiers
```js
let allow_read_0 = layout.allow('scope1');
let allow_read_1 = layout.allow('scope1:r');
let allow_write = layout.allow('scope1:w');
let allow_read_write_0 = layout.allow('scope1:rw');
let allow_read_write_1 = layout.allow('scope1:wr');
let allow_exclude = layout.allow('scope1:x');
```

creating requiremnts
```js
let require_0 = layout.require('scope1');
let require_1 = layout.require('scope1 scope2');
let require_2 = layout.require('scope1', 'scope2');
let require_3 = layout.require`scope1 scope2`;

let require_read_0 = layout.require('scope1');
let require_read_1 = layout.require('scope1:r');
let require_write = layout.require('scope1:w');
let require_read_write_0 = layout.require('scope1:rw');
let require_read_write_1 = layout.require('scope1:wr');
```

using requiremnts on a scope
```js
// true
console.log(require_0(allow_0));
```

requirements will remember scopes that are passed to them so that subsequent calls for the same scope run faster

you can also pre prime all requirments so that common scopes run faster. this effects all existing requirments and all future requirements
```
layout.prime(allow_0);
```