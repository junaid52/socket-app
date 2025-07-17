const userQueries = require('../queries/userQueries');

async function authMiddleware(req, res, next) {
    const userId = req.headers['x-user-id'];

    if (userId) {
        const user = await userQueries.getUserById(userId)
        if (user) {
            req.user = user;

            next();
        } else {

            res.status(401).json({ error: 'Not authenticated' });
        }

    } else {

        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = authMiddleware; 