# Collaborative Notes App

A real-time collaborative notes application built with Next.js, React, Socket.IO, and a modern UI using shadcn table components.

## Features

- **User Authentication:** Login with a username and password (users stored in SQLite).
- **Protected Notes Page:** Only authenticated users can access and edit notes.
- **Real-Time Collaboration:** All users see and edit the same note in real time.
- **User Presence:** See who is connected and who is currently editing.
- **Session Persistence:** User session is stored in localStorage for persistence across reloads.
- **Logout:** Users can log out from any page.
- **Modern Table UI:** Notes dashboard uses a shadcn table with advanced filtering options.
- **Advanced Filtering:** Filter notes by All, My Notes, Private (permitted), or Public using a dropdown.
- **Clean UI:** Minimal, responsive design using Tailwind CSS.

## Getting Started

### Prerequisites

- Node.js (v16+ recommended)
- npm

### Installation

1. **Clone the repository:**

   ```bash
   git clone <your-repo-url>
   cd next-socket-app
   ```

2. **Install dependencies for both frontend and backend:**

   ```bash
   cd backend
   npm install
   cd ../frontend
   npm install
   ```

3. **Seed the SQLite database:**
   ```bash
   cd backend
   node seed.js
   ```
   This will populate the SQLite database with example users and notes.

### Running the App

#### 1. Start the Backend

```bash
cd backend
npm start
```

The backend will run on [http://localhost:4000](http://localhost:4000).

#### 2. Start the Frontend

```bash
cd frontend
npm run dev
```

The frontend will run on [http://localhost:3000](http://localhost:3000).

### Usage

- Visit [http://localhost:3000](http://localhost:3000) in your browser.
- Log in with one of the seeded users (see `backend/seed.js` for usernames and passwords).
- Use the notes dashboard to view, filter, and manage your notes in a modern table UI.
- Use the filter dropdown to select:
  - **All:** All notes you can access
  - **My Notes:** Notes you own
  - **Private (permitted):** Private notes where you are permitted but not the owner
  - **Public:** Public notes
- Click on a note row to view or edit it (with real-time collaboration and presence).
- Open the note page in multiple tabs or browsers to test real-time collaboration.
- Use the logout button in the navbar to log out.

### Seeded Users

The backend now uses a SQLite database for persistent storage. Example users are seeded via `backend/seed.js`:

- **alice** / password1
- **bob** / password2
- **charlie** / password3

You can modify or add users in `backend/seed.js` and re-run the seed script to update the database.

### Project Structure

```
frontend/           # Next.js frontend app
  src/app/notes/    # Notes dashboard, table, and filters
  src/components/ui/table.tsx  # shadcn table component
backend/            # Express/Socket.IO backend
  app.js            # Main backend logic and API endpoints
  seed.js           # Seeds the SQLite database with users and notes
  db.sqlite         # SQLite database file
  queries/          # Database query modules
```

### API Endpoints (Backend)

- `POST /login` — Authenticate user
- `GET /notes` — List notes you can access (supports `?owner=`, `?public=` filters)
- `POST /notes` — Create a new note
- `PUT /notes/:id` — Edit a note (with permission checks)
- `POST /notes/:id/share` — Share a note with another user (owner only)
- `GET /notes/:id/permitted` — List users permitted for a note
- `DELETE /notes/:id/permissions/:userId` — Remove a user's permission (owner only)
- `GET /users` — List all users

---

For more details, see the code in each directory. Enjoy collaborating in real time with a modern, filterable notes dashboard!
