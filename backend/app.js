require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');

const notesRouter = require('./routes/notes');
const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');
const setupSocket = require('./socket');
const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json()); // Add JSON body parsing
app.use((req, res, next) => {
  console.log(req.method)
  next()
})
app.use('/notes', notesRouter);
app.use('/users', usersRouter);
app.use('/auth', authRouter);

const server = http.createServer(app);
setupSocket(server);

// Serve a simple API endpoint (optional, for testing)
app.get('/', (req, res) => {
  res.send('Collaborative Notes Backend Running');
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
