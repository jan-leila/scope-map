const assert = require('assert');
const scope = require('../src/index.js');

describe('Layout', () => {

    it('should fail on duplicate scope names', () => {
        let success = true;
        try {
            scope`
                user {
                    profile {
                        posts
                    }
                    posts
                }
            `
        }
        catch {
            success = false;
        }
        assert.equal(false, success);
    });

    let layout = scope`
        user {
            profile {
                auth
                profile_picture
                about
            }
            posts
        }
    `;

    describe('simplify', () => {
        it('should return same object for all forms of input with single param', () => {
            let obj = [
                layout.allow('user'),
                layout.allow`user`,
                layout.allow`
                    user
                `,
            ];
            assert.equal(...obj);
        });

        it('should return same object for all forms of input with multiple parameters', () => {
            let obj = [
                layout.allow('profile posts'),
                layout.allow('profile', 'posts'),
                layout.allow('profile', `
                    posts
                `),
                layout.allow`profile posts`,
                layout.allow`
                    profile
                    posts
                `,
            ];
            assert.equal(...obj);
        });

        it('should alphabetize scopes consistently no mater input order', () => {
            let obj = [
                layout.allow('profile posts'),
                layout.allow('posts profile'),
            ];
            assert.equal(...obj);
        });

        it('should orginize modifiers alphabetically', () => {
            let obj = [
                layout.allow('user:rw'),
                layout.allow('user:wr'),
            ];
            assert.equal(...obj);
        });

        it('should join sperated modifiers', () => {
            let obj = [
                layout.allow('user:rw'),
                layout.allow('user:r', 'user:w'),
            ];
            assert.equal(...obj);
        });
    });

    describe('allow', () => {
        const allow_single = layout.allow('user');
        it('should return single scope', () => {
            assert.equal('user', allow_single);
        });

        const allow_siblings = layout.allow('profile posts');
        it('should return spibling scopes', () => {
            assert.equal('posts profile', allow_siblings);
        });

        const allow_redundent = layout.allow('user profile');
        it('should return single scope without redundancy', () => {
            assert.equal('user', allow_redundent);
        });

        const allow_read = layout.allow('user:r');
        it('should return single scope with read implied', () => {
            assert.equal('user', allow_read);
        });

        const allow_write = layout.allow('user:w');
        it('should return single scope with write perms', () => {
            assert.equal('user:w', allow_write);
        });

        const allow_read_write = layout.allow('user:rw');
        it('should return single scope with read and write perms', () => {
            assert.equal('user:rw', allow_read_write);
        });

        const exclude_child = layout.allow('user', 'auth:x');
        it('should return scope with excluded child', () => {
            assert.equal('auth:x user', exclude_child);
        });

        const exclude_siblings = layout.allow('user', 'auth:x', 'profile_picture:x');
        it('should return scope with excluded siblings', () => {
            assert.equal('auth:x profile_picture:x user', exclude_siblings);
        });

        const exclude_redundent = layout.allow('user', 'auth:x', 'profile:x');
        it('should return scope with excluded child without redundancy', () => {
            assert.equal('profile:x user', exclude_redundent);
        });
    });

    describe('require', () => {

        const require_auth = layout.require('auth');

        it('shouldn\'t allow with no scope', () => {
            assert.equal(false, require_auth(''));
        });

        it('shouldn\'t allow with wrong scope', () => {
            assert.equal(false, require_auth('about'));
        });

        it('should allow with correct scope', () => {
            assert.equal(true, require_auth('auth'));
        });

        it('should allow with parent scope', () => {
            assert.equal(true, require_auth('user'));
        });

        it('shouldn\'t allow with parent scope but target excluded', () => {
            assert.equal(false, require_auth('user auth:x'));
        });

        it('shouldn\'t allow with grandparent scope but parent excluded', () => {
            assert.equal(false, require_auth('user profile:x'));
        });

        const redundant_requirement = layout.require('user auth');
        it('shouldn\'t allow with both element and parent required but child excluded', () => {
            assert.equal(false, redundant_requirement('user auth:x'));
        });

        const require_root = layout.require('user');
        it('should allow excluded child if only parent is required', () => {
            assert.equal(true, require_root('user auth:x'));
        });
    });

    describe('caching', () => {
        it('allow calls should be faster after first run', () => {
            const count = 1000;

            let layout;
            
            let no_cache_time = 0;
            let cache_time = 0;
            
            for(let i = 0; i < count; i++){
                layout = scope`
                    user {
                        profile {
                            auth
                            profile_picture
                            about
                        }
                        posts
                    }
                `;

                let start = performance.now();
                layout.allow('about auth posts');
                no_cache_time += performance.now() - start;
            }
            for (let i = 0; i < count; i++) {
                let start = performance.now();
                layout.allow('about auth posts');
                cache_time += performance.now() - start;
            }

            assert.equal(true, cache_time < no_cache_time);
        });

        it('require calls should be faster after first run', () => {
            const count = 10000;
            
            const scope = layout.allow('auth');
            let require_auth;

            let no_cache_time = 0;
            let cache_time = 0;            
            for (let i = 0; i < count; i++) {
                require_auth = layout.require('auth');
                let start = performance.now();
                require_auth(scope);
                no_cache_time += performance.now() - start;
            }
            for (let i = 0; i < count; i++) {
                let start = performance.now();
                require_auth(scope);
                cache_time += performance.now() - start;
            }
            assert.equal(true, cache_time < no_cache_time);
        });

        it('require calls should be faster after first run after they are primed', () => {
            const count = 5000;

            const layout = scope`
                user {
                    profile {
                        auth
                        profile_picture
                        about
                    }
                    posts
                }
            `;
            const auth_scope = layout.allow('auth');

            function benchmark(){
                let time = 0;
                for (let i = 0; i < count; i++) {
                    require_auth = layout.require('auth');
                    let start = performance.now();
                    require_auth(auth_scope);
                    time += performance.now() - start;
                }
                return time;
            }
            let no_prime_time = benchmark();
            layout.prime(auth_scope);
            let prime_time = benchmark();
            assert.equal(true, prime_time < no_prime_time);
        });

        it('pre existing requirments also get primed', () => {
            const count = 10000;
            const layout = scope`
                user {
                    profile {
                        auth
                        profile_picture
                        about
                    }
                    posts
                }
            `;
            const auth_scope = layout.allow('auth');

            let pre = Array.apply(null, Array(count)).map(() => {
                return layout.require('auth');
            });
            let pre_time = 0;
            pre.forEach((req) => {
                let start = performance.now();
                req(auth_scope);
                pre_time += performance.now() - start;
            });

            let post = Array.apply(null, Array(count)).map(() => {
                return layout.require('auth');
            });
            let post_time = 0;
            post.forEach((req) => {
                let start = performance.now();
                req(auth_scope);
                post_time += performance.now() - start;
            });
            assert.equal(true, post_time < pre_time);
        });
    });
});