const db = require('../db');

function getUserByUsername(username, callback) {
    db.get('SELECT * FROM users WHERE username = ?', [username], callback);
}

function getUserById(id, callback) {
    db.get('SELECT * FROM users WHERE id = ?', [id], callback);
}

function createUser(id, username, password, callback) {
    db.run('INSERT INTO users (id, username, password) VALUES (?, ?, ?)', [id, username, password], callback);
}

module.exports = {
    getUserByUsername,
    getUserById,
    createUser
}; 