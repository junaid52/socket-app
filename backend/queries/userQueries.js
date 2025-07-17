const db = require('../db');

function getUserByUsername(username) {
    return new Promise((resolve, reject) => {
        if (!username) return reject(new Error('Username is required'));
        db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function getUserById(id) {
    return new Promise((resolve, reject) => {
        if (!id) return reject(new Error('User ID is required'));
        db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function createUser(id, username, password) {
    return new Promise((resolve, reject) => {
        if (!id || !username || !password) return reject(new Error('Missing required fields'));
        db.run('INSERT INTO users (id, username, password) VALUES (?, ?, ?)', [id, username, password], function (err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
}

module.exports = {
    getUserByUsername,
    getUserById,
    createUser
}; 