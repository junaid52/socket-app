require('dotenv').config();
const { Server } = require('socket.io');
const userQueries = require('./queries/userQueries');
const noteQueries = require('./queries/noteQueries');
const permissionQueries = require('./queries/permissionQueries');
const db = require('./db');

function setupSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
            methods: ['GET', 'POST'],
        },
    });


    const noteRoomUsers = {}; // noteId -> { [socket.id]: { id, username } }

    io.on('connection', async (socket) => {
        const { id: userId } = socket.handshake.auth;
        if (!userId) {
            socket.disconnect();
            return;
        }
        // Join a room named after the user ID for private note events
        socket.join(userId);
        try {
            const user = await userQueries.getUserById(userId);
            if (!user) {
                socket.disconnect();
                return;
            }
            // Get all notes user can access
            const notes = await new Promise((resolve, reject) => {
                db.all(
                    `SELECT * FROM notes
                   WHERE public = 1
                      OR owner = ?
                      OR id IN (SELECT note_id FROM note_permissions WHERE user_id = ?)`,
                    [userId, userId],
                    (err, rows) => {
                        if (err) return reject(err);
                        resolve(rows);
                    }
                );
            });
            // Join a room for each note
            notes.forEach((note) => {
                socket.join(note.id);
                // Track user in noteRoomUsers
                if (!noteRoomUsers[note.id]) noteRoomUsers[note.id] = {};
                noteRoomUsers[note.id][socket.id] = {
                    id: user.id,
                    username: user.username,
                };
            });
            // For the current note (if only one, or pick first for init):
            const firstNoteId = notes.length > 0 ? notes[0].id : null;
            if (firstNoteId) {
                const usersInRoom = Object.values(noteRoomUsers[firstNoteId]);
                socket.emit('init', { users: usersInRoom });
                socket.to(firstNoteId).emit('user-joined', usersInRoom);
            }
        } catch (err) {
            socket.disconnect();
            return;
        }

        // Handle note edits
        socket.on('edit-note', async ({ noteId, content }) => {
            try {
                const note = await noteQueries.getNoteById(noteId);
                if (!note) return;
                if (note.public) {
                    await noteQueries.updateNote(noteId, content, 1);
                    io.to(noteId).emit('note-updated', { noteId, content });
                } else if (note.owner === userId) {
                    await noteQueries.updateNote(noteId, content, 0);
                    io.to(noteId).emit('note-updated', { noteId, content });
                } else {
                    const users = await permissionQueries.getPermittedUsersForNote(noteId);
                    const permitted = users.map((u) => u.user_id);
                    if (permitted.includes(userId)) {
                        await noteQueries.updateNote(noteId, content, 0);
                        io.to(noteId).emit('note-updated', { noteId, content });
                    }
                }
            } catch (err) {
                // Optionally log error
            }
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
            const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
            rooms.forEach((noteId) => {
                const user = noteRoomUsers[noteId]?.[socket.id];
                socket
                    .to(noteId)
                    .emit('editing-indicator', {
                        id: user?.id,
                        username: user?.username,
                        editing: isEditing,
                    });
                if (typeof content === 'string') {
                    socket.to(noteId).emit('content-update', { noteId, content });
                }
            });
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            // Remove user from all note rooms
            Object.keys(noteRoomUsers).forEach((noteId) => {
                if (noteRoomUsers[noteId][socket.id]) {
                    delete noteRoomUsers[noteId][socket.id];
                    const usersInRoom = Object.values(noteRoomUsers[noteId]);
                    io.to(noteId).emit('user-left', usersInRoom);
                }
            });
        });
    });

    return io;
}

module.exports = setupSocket; 