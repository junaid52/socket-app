const db = require('../db');

function getPermittedUsersForNote(noteId, callback) {
    db.all('SELECT user_id FROM note_permissions WHERE note_id = ?', [noteId], callback);
}

function addPermission(noteId, userId, callback) {
    db.run('INSERT INTO note_permissions (note_id, user_id) VALUES (?, ?)', [noteId, userId], callback);
}

function removePermission(noteId, userId, callback) {
    db.run('DELETE FROM note_permissions WHERE note_id = ? AND user_id = ?', [noteId, userId], callback);
}

function getNotesForUser(userId, callback) {
    db.all('SELECT note_id FROM note_permissions WHERE user_id = ?', [userId], callback);
}

module.exports = {
    getPermittedUsersForNote,
    addPermission,
    removePermission,
    getNotesForUser
}; 