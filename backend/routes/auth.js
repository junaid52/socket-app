const express = require('express');
const userQueries = require('../queries/userQueries');

const router = express.Router();

// POST /auth/login: user login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await userQueries.getUserByUsername(username);
        if (user && user.password === password) {
            res.json({ success: true, user: { id: user.id, username: user.username } });
        } else {
            res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router; 