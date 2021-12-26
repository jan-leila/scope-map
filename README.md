
# scope-map

language for defining a tree of scopes, creating scope strings to provide access without redundancy, and matching agains required scopes

### usage

```js
const scope = require('../src/index.js');

// defined the layout for what scopes inherit from others
let scopes = scope`
    user {
        profile {
            auth
            profile_picture
            about
        }
        post
    }
`;

// create a scope for general users
let user_profile = scopes.allow`
    user:rw
`;

// create a scope that has access to read and write profile data but not authentication data
let access_profile = scopes.allow`
    profile:rw {
        auth:x
    }
`;

// craete a requirement
let write_about = scopes.require`
    about:w
`

// true
write_about.test(user_profile);
// true
write_about.test(access_profile);

let read_auth = scopes.require`
    auth:r
`

// true
read_auth.test(user_profile);
// false
read_auth.test(access_profile);

let manage_content = scopes.require`
    about:w
    post:rw
`
// true
read_auth.test(user_profile);
// false
read_auth.test(access_profile);
```