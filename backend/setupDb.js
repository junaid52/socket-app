const db = require('./db');

db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      owner TEXT,
      content TEXT,
      public INTEGER,
      FOREIGN KEY(owner) REFERENCES users(id)
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS note_permissions (
      note_id TEXT,
      user_id TEXT,
      PRIMARY KEY (note_id, user_id),
      FOREIGN KEY(note_id) REFERENCES notes(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

    console.log('Tables created (if not exist).');
    setTimeout(() => db.close(), 500);
}); 