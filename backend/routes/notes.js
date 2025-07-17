const express = require('express');
const userQueries = require('../queries/userQueries');
const noteQueries = require('../queries/noteQueries');
const permissionQueries = require('../queries/permissionQueries');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /notes: fetch all notes user can access, with optional filters
router.get('/', auth, async (req, res) => {
    console.log('in notes route')
    const userId = req.user.id;
    const { public: publicFilter, owner: ownerFilter } = req.query;
    let sql = `SELECT * FROM notes WHERE (public = 1 OR owner = ? OR id IN (SELECT note_id FROM note_permissions WHERE user_id = ?))`;
    const params = [userId, userId];
    if (publicFilter !== undefined) {
        sql += ' AND public = ?';
        params.push(publicFilter === '1' ? 1 : 0);
    }
    if (ownerFilter !== undefined) {
        sql += ' AND owner = ?';
        params.push(ownerFilter);
    }
    try {
        // This is a custom query, so we use db directly
        const db = require('../db');
        console.log(db)
        db.all(sql, params, (err, notes) => {
            if (err) return res.status(500).json({ error: 'DB error' });
            res.json(notes);
        });
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message });
    }
});

// PUT /notes/:id: edit note with permission logic
router.put('/:id', auth, async (req, res) => {
    const userId = req.user.id;
    const noteId = req.params.id;
    const { content } = req.body;
    try {
        const note = await noteQueries.getNoteById(noteId);
        if (!note) return res.status(404).json({ error: 'Note not found' });
        if (note.public) {
            await noteQueries.updateNote(noteId, content, 1);
            res.json({ success: true });
        } else if (note.owner === userId) {
            await noteQueries.updateNote(noteId, content, 0);
            res.json({ success: true });
        } else {
            const users = await permissionQueries.getPermittedUsersForNote(noteId);
            const permitted = users.map((u) => u.user_id);
            if (permitted.includes(userId)) {
                await noteQueries.updateNote(noteId, content, 0);
                res.json({ success: true });
            } else {
                res.status(403).json({ error: 'No permission to edit this note' });
            }
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /notes: create a new note
router.post('/', auth, async (req, res) => {
    const userId = req.user.id;
    const { content, public: isPublic, permitted } = req.body;
    const noteId = uuidv4();
    try {
        await noteQueries.createNote(noteId, userId, content, isPublic ? 1 : 0);
        // Add permitted users if provided (for private notes)
        if (Array.isArray(permitted) && permitted.length > 0 && !isPublic) {
            await Promise.all(
                permitted.filter(uid => uid !== userId).map(uid => permissionQueries.addPermission(noteId, uid))
            );
        }
        // Fetch the created note for emitting (Socket.IO logic handled elsewhere)
        res.json({ success: true, id: noteId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /notes/:id/share: add a user to a note's permitted list (only owner can share)
router.post('/:id/share', auth, async (req, res) => {
    const userId = req.user.id;
    const noteId = req.params.id;
    const { targetUserId } = req.body;
    try {
        const note = await noteQueries.getNoteById(noteId);
        if (!note) return res.status(404).json({ error: 'Note not found' });
        if (note.owner !== userId)
            return res.status(403).json({ error: 'Only owner can share this note' });
        await permissionQueries.addPermission(noteId, targetUserId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /notes/:id/permitted: list users who have access to the note (with usernames)
router.get('/:id/permitted', auth, async (req, res) => {
    const userId = req.user.id;
    const noteId = req.params.id;
    try {
        const note = await noteQueries.getNoteById(noteId);
        if (!note) return res.status(404).json({ error: 'Note not found' });
        const sendUsers = async (userIds) => {
            const users = await Promise.all(
                userIds.map(async (id) => {
                    const user = await userQueries.getUserById(id);
                    if (user) {
                        return {
                            id: user.id,
                            username: user.username,
                            owner: id === note.owner,
                        };
                    } else {
                        return { id, username: id, owner: id === note.owner };
                    }
                })
            );
            res.json({ users });
        };
        const permittedUsers = await permissionQueries.getPermittedUsersForNote(noteId);
        const permitted = permittedUsers.map((u) => u.user_id);
        if (note.public || note.owner === userId) {
            await sendUsers([note.owner, ...permitted]);
        } else {
            if (permitted.includes(userId)) {
                await sendUsers([note.owner, ...permitted]);
            } else {
                res.status(403).json({ error: 'No permission to view permitted users' });
            }
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /notes/:id/permissions/:userId: remove a permitted user from a note (owner only)
router.delete('/:id/permissions/:userId', auth, async (req, res) => {
    const userId = req.user.id;
    const noteId = req.params.id;
    const targetUserId = req.params.userId;
    try {
        const note = await noteQueries.getNoteById(noteId);
        if (!note) return res.status(404).json({ error: 'Note not found' });
        if (note.owner !== userId)
            return res.status(403).json({ error: 'Only owner can remove permissions' });
        if (targetUserId === userId)
            return res.status(400).json({ error: 'Owner cannot remove themselves' });
        await permissionQueries.removePermission(noteId, targetUserId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router; 