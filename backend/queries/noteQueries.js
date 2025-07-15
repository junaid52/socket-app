const db = require('../db');

function getNoteById(id, callback) {
    db.get('SELECT * FROM notes WHERE id = ?', [id], callback);
}

function getAllNotes(callback) {
    db.all('SELECT * FROM notes', [], callback);
}

function createNote(id, owner, content, isPublic, callback) {
    db.run('INSERT INTO notes (id, owner, content, public) VALUES (?, ?, ?, ?)', [id, owner, content, isPublic ? 1 : 0], callback);
}

function updateNote(id, content, isPublic, callback) {
    db.run('UPDATE notes SET content = ?, public = ? WHERE id = ?', [content, isPublic ? 1 : 0, id], callback);
}

function deleteNote(id, callback) {
    db.run('DELETE FROM notes WHERE id = ?', [id], callback);
}

module.exports = {
    getNoteById,
    getAllNotes,
    createNote,
    updateNote,
    deleteNote
}; 