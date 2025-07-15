const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { users, note } = require('./mockData');
const cors = require('cors');

const app = express();
app.use(cors({
    origin: 'http://localhost:3000', // Allow frontend origin
    credentials: true
}));
app.use(express.json()); // Add JSON body parsing

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

io.on('connection', (socket) => {
    const { id, username } = socket.handshake.auth;

    if (id && username) {
        connectedUsers[socket.id] = { id, username };
    }
    editingUsers[socket.id] = { editing: false };

    // Only emit valid users
    const validUsers = Object.values(connectedUsers).filter(u => u && u.id && u.username);

    socket.emit('init', { note, users: validUsers });
    socket.broadcast.emit('user-joined', validUsers);

    // Handle note edits
    socket.on('edit-note', (data) => {
        note.content = data.note.content;
        // Broadcast updated note to all other clients
        socket.broadcast.emit('note-updated', { note, userId: socket.id });
    });

    // Handle editing indicator
    socket.on('editing', (isEditing) => {
        editingUsers[socket.id].editing = isEditing;
        const user = connectedUsers[socket.id];
        socket.broadcast.emit('editing-indicator', { id: user?.id, username: user?.username, editing: isEditing });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        delete editingUsers[socket.id];
        delete connectedUsers[socket.id];
        const validUsers = Object.values(connectedUsers).filter(u => u && u.id && u.username);
        socket.broadcast.emit('user-left', validUsers);
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
