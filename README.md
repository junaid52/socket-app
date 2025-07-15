# Collaborative Notes App

A real-time collaborative notes application built with Next.js, React, and Socket.IO.

## Features

- **User Authentication:** Login with a username and password (mocked users).
- **Protected Notes Page:** Only authenticated users can access and edit the shared note.
- **Real-Time Collaboration:** All users see and edit the same note in real time.
- **User Presence:** See who is connected and who is currently editing.
- **Session Persistence:** User session is stored in localStorage for persistence across reloads.
- **Logout:** Users can log out from any page.
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
- Log in with one of the mock users (see `backend/mockData.js` for usernames and passwords).
- Open the note page in multiple tabs or browsers to test real-time collaboration.
- Use the logout button in the navbar to log out.

### Mock Users

The backend uses mock users defined in `backend/mockData.js`. Example users:

- **alice** / password1
- **bob** / password2
- **charlie** / password3

### Project Structure

```

```
