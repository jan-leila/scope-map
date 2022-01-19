const assert = require('assert');
const scope = require('../src/index.js');

describe('Layout', () => {
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
    });
});