const db = require('../db');

function getNoteById(id) {
    return new Promise((resolve, reject) => {
        if (!id) return reject(new Error('Note ID is required'));
        db.get('SELECT * FROM notes WHERE id = ?', [id], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function getAllNotes() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM notes', [], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function createNote(id, owner, content, isPublic) {
    return new Promise((resolve, reject) => {
        if (!id || !owner || !content) return reject(new Error('Missing required fields'));
        db.run('INSERT INTO notes (id, owner, content, public) VALUES (?, ?, ?, ?)', [id, owner, content, isPublic ? 1 : 0], function (err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
}

function updateNote(id, content, isPublic) {
    return new Promise((resolve, reject) => {
        if (!id || !content) return reject(new Error('Missing required fields'));
        db.run('UPDATE notes SET content = ?, public = ? WHERE id = ?', [content, isPublic ? 1 : 0, id], function (err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
}

function deleteNote(id) {
    return new Promise((resolve, reject) => {
        if (!id) return reject(new Error('Note ID is required'));
        db.run('DELETE FROM notes WHERE id = ?', [id], function (err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
}

module.exports = {
    getNoteById,
    getAllNotes,
    createNote,
    updateNote,
    deleteNote
}; 