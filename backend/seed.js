const db = require('./db');

const users = [
    { id: 'user1', username: 'alice', password: 'password1' },
    { id: 'user2', username: 'bob', password: 'password2' },
    { id: 'user3', username: 'charlie', password: 'password3' },
    { id: 'user4', username: 'diana', password: 'password4' },
    { id: 'user5', username: 'eve', password: 'password5' },
];

const notes = [
    { id: 'note1', owner: 'user1', content: 'Alice’s private note', public: 0 },
    { id: 'note2', owner: 'user2', content: 'Bob’s public note', public: 1 },
    { id: 'note3', owner: 'user3', content: 'Charlie’s private note', public: 0 },
    { id: 'note4', owner: 'user4', content: 'Diana’s public note', public: 1 },
    { id: 'note5', owner: 'user5', content: 'Eve’s private note', public: 0 },
];

const permissions = [
    { note_id: 'note1', user_id: 'user2' }, // Bob can access Alice’s note
    { note_id: 'note3', user_id: 'user1' }, // Alice can access Charlie’s note
    { note_id: 'note5', user_id: 'user3' }, // Charlie can access Eve’s note
];

function run() {
    db.serialize(() => {
        // Users
        users.forEach(u => {
            db.run(
                'INSERT OR IGNORE INTO users (id, username, password) VALUES (?, ?, ?)',
                [u.id, u.username, u.password],
                err => {
                    if (err) console.error('User insert error:', err.message);
                }
            );
        });
        // Notes
        notes.forEach(n => {
            db.run(
                'INSERT OR IGNORE INTO notes (id, owner, content, public) VALUES (?, ?, ?, ?)',
                [n.id, n.owner, n.content, n.public],
                err => {
                    if (err) console.error('Note insert error:', err.message);
                }
            );
        });
        // Permissions
        permissions.forEach(p => {
            db.run(
                'INSERT OR IGNORE INTO note_permissions (note_id, user_id) VALUES (?, ?)',
                [p.note_id, p.user_id],
                err => {
                    if (err) console.error('Permission insert error:', err.message);
                }
            );
        });
        console.log('Seeding complete.');
        setTimeout(() => db.close(), 500); // Give time for all inserts
    });
}

run(); 