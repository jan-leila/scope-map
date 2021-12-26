const scope = require('../src/index.js');

let scopes = scope`
    user {
        profile {
            auth
            profile_picture
            about
        }
        runs
    }
`;

let access_profile = scopes.allow`
    profile:rw {
        auth:x
    }
`;

console.log(access_profile);

let require_about = scopes.require`
    about:w
`

let require_auth = scopes.require`
    auth
`

console.log("about test: ", require_about.test(access_profile));
console.log("auth test: ", require_auth.test(access_profile));