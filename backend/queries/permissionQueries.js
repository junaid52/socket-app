const db = require('../db');

function getPermittedUsersForNote(noteId) {
    return new Promise((resolve, reject) => {
        if (!noteId) return reject(new Error('Note ID is required'));
        db.all('SELECT user_id FROM note_permissions WHERE note_id = ?', [noteId], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function addPermission(noteId, userId) {
    return new Promise((resolve, reject) => {
        if (!noteId || !userId) return reject(new Error('Missing required fields'));
        db.run('INSERT INTO note_permissions (note_id, user_id) VALUES (?, ?)', [noteId, userId], function (err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
}

function removePermission(noteId, userId) {
    return new Promise((resolve, reject) => {
        if (!noteId || !userId) return reject(new Error('Missing required fields'));
        db.run('DELETE FROM note_permissions WHERE note_id = ? AND user_id = ?', [noteId, userId], function (err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
}

function getNotesForUser(userId) {
    return new Promise((resolve, reject) => {
        if (!userId) return reject(new Error('User ID is required'));
        db.all('SELECT note_id FROM note_permissions WHERE user_id = ?', [userId], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

module.exports = {
    getPermittedUsersForNote,
    addPermission,
    removePermission,
    getNotesForUser
}; 