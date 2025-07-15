const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { users, note } = require('./mockData');
const cors = require('cors');
const db = require('./db');
const userQueries = require('./queries/userQueries');
const noteQueries = require('./queries/noteQueries');
const permissionQueries = require('./queries/permissionQueries');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors({
    origin: 'http://localhost:3000', // Allow frontend origin
    credentials: true
}));
app.use(express.json()); // Add JSON body parsing

// Middleware placeholder: set req.user (to be replaced with real auth)
app.use((req, res, next) => {
    // For now, get user id from header for testing
    const userId = req.headers['x-user-id'];
    if (userId) {
        userQueries.getUserById(userId, (err, user) => {
            if (user) req.user = user;
            next();
        });
    } else {
        next();
    }
});

// GET /notes: fetch all notes user can access
app.get('/notes', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userId = req.user.id;
    db.all(
        `SELECT * FROM notes
         WHERE public = 1
            OR owner = ?
            OR id IN (SELECT note_id FROM note_permissions WHERE user_id = ?)`,
        [userId, userId],
        (err, notes) => {
            if (err) return res.status(500).json({ error: 'DB error' });
            res.json(notes);
        }
    );
});

// PUT /notes/:id: edit note with permission logic
app.put('/notes/:id', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userId = req.user.id;
    const noteId = req.params.id;
    const { content } = req.body;
    noteQueries.getNoteById(noteId, (err, note) => {
        if (err || !note) return res.status(404).json({ error: 'Note not found' });
        if (note.public) {
            // Public: allow edit
            noteQueries.updateNote(noteId, content, 1, (err) => {
                if (err) return res.status(500).json({ error: 'Update failed' });
                res.json({ success: true });
            });
        } else if (note.owner === userId) {
            // Owner: allow edit
            noteQueries.updateNote(noteId, content, 0, (err) => {
                if (err) return res.status(500).json({ error: 'Update failed' });
                res.json({ success: true });
            });
        } else {
            // Check permissions
            permissionQueries.getPermittedUsersForNote(noteId, (err, users) => {
                if (err) return res.status(500).json({ error: 'DB error' });
                const permitted = users.map(u => u.user_id);
                if (permitted.includes(userId)) {
                    noteQueries.updateNote(noteId, content, 0, (err) => {
                        if (err) return res.status(500).json({ error: 'Update failed' });
                        res.json({ success: true });
                    });
                } else {
                    res.status(403).json({ error: 'No permission to edit this note' });
                }
            });
        }
    });
});

// POST /notes: create a new note
app.post('/notes', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userId = req.user.id;
    const { content, public: isPublic } = req.body;
    const noteId = uuidv4();
    noteQueries.createNote(noteId, userId, content, isPublic ? 1 : 0, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to create note' });
        res.json({ success: true, id: noteId });
    });
});

// POST /notes/:id/share: add a user to a note's permitted list (only owner can share)
app.post('/notes/:id/share', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userId = req.user.id;
    const noteId = req.params.id;
    const { targetUserId } = req.body;
    noteQueries.getNoteById(noteId, (err, note) => {
        if (err || !note) return res.status(404).json({ error: 'Note not found' });
        if (note.owner !== userId) return res.status(403).json({ error: 'Only owner can share this note' });
        permissionQueries.addPermission(noteId, targetUserId, (err) => {
            if (err) return res.status(500).json({ error: 'Failed to add permission' });
            res.json({ success: true });
        });
    });
});

// GET /notes/:id/permitted: list users who have access to the note (with usernames)
app.get('/notes/:id/permitted', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userId = req.user.id;
    const noteId = req.params.id;
    noteQueries.getNoteById(noteId, (err, note) => {
        if (err || !note) return res.status(404).json({ error: 'Note not found' });
        const sendUsers = (userIds) => {
            // Fetch usernames for all userIds
            const userLookups = userIds.map(id => new Promise((resolve) => {
                userQueries.getUserById(id, (err, user) => {
                    if (user) resolve({ id: user.id, username: user.username, owner: id === note.owner });
                    else resolve({ id, username: id, owner: id === note.owner });
                });
            }));
            Promise.all(userLookups).then(users => {
                res.json({ users });
            });
        };
        if (note.public || note.owner === userId) {
            permissionQueries.getPermittedUsersForNote(noteId, (err, users) => {
                if (err) return res.status(500).json({ error: 'DB error' });
                const permitted = users.map(u => u.user_id);
                sendUsers([note.owner, ...permitted]);
            });
        } else {
            permissionQueries.getPermittedUsersForNote(noteId, (err, users) => {
                if (err) return res.status(500).json({ error: 'DB error' });
                const permitted = users.map(u => u.user_id);
                if (permitted.includes(userId)) {
                    sendUsers([note.owner, ...permitted]);
                } else {
                    res.status(403).json({ error: 'No permission to view permitted users' });
                }
            });
        }
    });
});

// DELETE /notes/:id/permissions/:userId: remove a permitted user from a note (owner only)
app.delete('/notes/:id/permissions/:userId', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userId = req.user.id;
    const noteId = req.params.id;
    const targetUserId = req.params.userId;
    noteQueries.getNoteById(noteId, (err, note) => {
        if (err || !note) return res.status(404).json({ error: 'Note not found' });
        if (note.owner !== userId) return res.status(403).json({ error: 'Only owner can remove permissions' });
        if (targetUserId === userId) return res.status(400).json({ error: 'Owner cannot remove themselves' });
        permissionQueries.removePermission(noteId, targetUserId, (err) => {
            if (err) return res.status(500).json({ error: 'Failed to remove permission' });
            res.json({ success: true });
        });
    });
});

// GET /users: return all users (id, username)
app.get('/users', (req, res) => {
    const db = require('./db');
    db.all('SELECT id, username FROM users', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        res.json({ users: rows });
    });
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000', // Allow frontend origin
        methods: ['GET', 'POST']
    }
});

// In-memory users editing state
let editingUsers = {};
let connectedUsers = {}; // socket.id -> { id, username }

// Simple login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        res.json({ success: true, user: { id: user.id, username: user.username } });
    } else {
        res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
});

// Serve a simple API endpoint (optional, for testing)
app.get('/', (req, res) => {
    res.send('Collaborative Notes Backend Running');
});

// --- Socket.IO real-time logic for per-note rooms and user presence ---
const noteRoomUsers = {}; // noteId -> { [socket.id]: { id, username } }

io.on('connection', (socket) => {
    const { id: userId } = socket.handshake.auth;
    if (!userId) {
        socket.disconnect();
        return;
    }
    const userQueries = require('./queries/userQueries');
    const db = require('./db');
    userQueries.getUserById(userId, (err, user) => {
        if (err || !user) {
            socket.disconnect();
            return;
        }
        // Get all notes user can access
        db.all(
            `SELECT * FROM notes
             WHERE public = 1
                OR owner = ?
                OR id IN (SELECT note_id FROM note_permissions WHERE user_id = ?)`,
            [userId, userId],
            (err, notes) => {
                if (err) {
                    socket.disconnect();
                    return;
                }
                // Join a room for each note
                notes.forEach(note => {
                    socket.join(note.id);
                    // Track user in noteRoomUsers
                    if (!noteRoomUsers[note.id]) noteRoomUsers[note.id] = {};
                    noteRoomUsers[note.id][socket.id] = { id: user.id, username: user.username };
                });
                // For the current note (if only one, or pick first for init):
                const firstNoteId = notes.length > 0 ? notes[0].id : null;
                if (firstNoteId) {
                    const usersInRoom = Object.values(noteRoomUsers[firstNoteId]);
                    socket.emit('init', { users: usersInRoom });
                    socket.to(firstNoteId).emit('user-joined', usersInRoom);
                }
            }
        );
    });

    // Handle note edits
    socket.on('edit-note', ({ noteId, content }) => {
        const noteQueries = require('./queries/noteQueries');
        const permissionQueries = require('./queries/permissionQueries');
        noteQueries.getNoteById(noteId, (err, note) => {
            if (err || !note) return;
            if (note.public) {
                noteQueries.updateNote(noteId, content, 1, (err) => {
                    if (!err) {
                        io.to(noteId).emit('note-updated', { noteId, content });
                    }
                });
            } else if (note.owner === userId) {
                noteQueries.updateNote(noteId, content, 0, (err) => {
                    if (!err) {
                        io.to(noteId).emit('note-updated', { noteId, content });
                    }
                });
            } else {
                permissionQueries.getPermittedUsersForNote(noteId, (err, users) => {
                    if (err) return;
                    const permitted = users.map(u => u.user_id);
                    if (permitted.includes(userId)) {
                        noteQueries.updateNote(noteId, content, 0, (err) => {
                            if (!err) {
                                io.to(noteId).emit('note-updated', { noteId, content });
                            }
                        });
                    }
                });
            }
        });
    });

    // Handle editing indicator and real-time content
    socket.on('editing', (data) => {
        let isEditing, content;
        if (typeof data === 'object' && data !== null) {
            isEditing = data.isEditing;
            content = data.content;
        } else {
            isEditing = data;
            content = undefined;
        }
        // Find all rooms this socket is in (except its own id room)
        const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
        rooms.forEach(noteId => {
            const user = noteRoomUsers[noteId]?.[socket.id];
            socket.to(noteId).emit('editing-indicator', { id: user?.id, username: user?.username, editing: isEditing });
            if (typeof content === 'string') {
                socket.to(noteId).emit('content-update', { noteId, content });
            }
        });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        // Remove user from all note rooms
        Object.keys(noteRoomUsers).forEach(noteId => {
            if (noteRoomUsers[noteId][socket.id]) {
                delete noteRoomUsers[noteId][socket.id];
                const usersInRoom = Object.values(noteRoomUsers[noteId]);
                io.to(noteId).emit('user-left', usersInRoom);
            }
        });
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
