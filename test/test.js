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

    describe('allow', () => {
        const allow_root = layout.allow`
            user
        `;

        it('should return the root scopes for permitions', () => {
            assert.equal(allow_root, 'user');
        });

        const allow_siblings = layout.allow`
            profile
            posts
        `;

        it('should return spibling scopes for permitions', () => {
            assert.equal(allow_siblings, 'posts profile');
        });

        const allow_redundent = layout.allow`
            user
            profile
        `;

        it('should return only root permitions', () => {
            assert.equal(allow_redundent, 'user');
        });

        const allow_write = layout.allow`
            user:w
        `;

        it('should return user with write perms', () => {
            assert.equal(allow_write, 'user:w');
        });

        const exclude_child = layout.allow`
            user {
                auth:x
            }
        `;

        it('should return user with read perms and child with read and write perms', () => {
            assert.equal(exclude_child, 'user auth:x');
        });
    });

    describe('require', () => {

        it('require perms with no scope', () => {
            assert.equal(require_auth(''), false);
        });
        it('require perms with wrong scope', () => {
            assert.equal(require_auth('about'), false);
        });

        const allow_root = layout.allow`
            user
        `;
        const exclude_auth = layout.allow`
            user {
                auth:x
            }
        `;

        const require_about = layout.require`
            about
        `;
        const require_auth = layout.require`
            auth
        `;

        it('require about perms from root', () => {
            assert.equal(require_about(allow_root), true);
        });
        it('require about perms without auth perms', () => {
            assert.equal(require_about(exclude_auth), true);
        });
        it('require auth perms from root', () => {
            assert.equal(require_auth(allow_root), true);
        });
        it('require auth perms with them excluded from root', () => {
            assert.equal(require_auth(exclude_auth), false);
        });
    });
});