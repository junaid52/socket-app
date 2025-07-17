const express = require('express');
const userQueries = require('../queries/userQueries');

const router = express.Router();

// GET /users: return all users (id, username)
router.get('/', async (req, res) => {
    try {
        // If you have a getAllUsers query, use it. Otherwise, use db directly with a Promise.
        const db = require('../db');
        const users = await new Promise((resolve, reject) => {
            db.all('SELECT id, username FROM users', [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
        res.json({ users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router; 