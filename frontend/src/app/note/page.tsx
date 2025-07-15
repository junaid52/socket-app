"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "../UserContext";
import { io, Socket } from "socket.io-client";

// Types for socket messages and note data
interface NoteData {
  note: { id: string; content: string };
}
interface UserInfo {
  id: string;
  username: string;
}

interface InitPayload {
  note: { id: string; content: string };
  users: UserInfo[];
}

let socket: Socket | null = null;

export default function NotePage() {
  const router = useRouter();
  const { user, loading, logout } = useUser();

  const [note, setNote] = useState<{ id: string; content: string } | null>(
    null
  );
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const editingTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (loading || !user) return;
    // Connect to socket.io server

    socket = io("http://localhost:4000", {
      auth: { username: user?.username, id: user?.id },
      transports: ["websocket"],
    });

    // On initial connection, receive note and user list
    socket.on("init", (payload: InitPayload) => {
      setNote(payload.note);
      setUsers(payload.users);
    });

    // Note updated by another user
    socket.on("note-updated", (data: NoteData) => {
      setNote(data.note);
    });

    // Editing indicator
    socket.on(
      "editing-indicator",
      (data: { id: string; username: string; editing: boolean }) => {
        if (user && data.editing && data.id !== user.id) {
          setEditingUser(data.username);
        } else {
          setEditingUser(null);
        }
      }
    );

    // User joined/left
    socket.on("user-joined", (userList: UserInfo[]) => {
      setUsers(userList);
    });
    socket.on("user-left", (userList: UserInfo[]) => {
      setUsers(userList);
    });

    // Clean up on unmount
    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [user, router, loading]);

  // Handle note change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!note) return;
    const value = e.target.value;
    setNote({ ...note, content: value });
    socket?.emit("edit-note", { note: { ...note, content: value } });
    socket?.emit("editing", user?.id);
    // Remove editing indicator after 2s of inactivity
    if (editingTimeout.current) clearTimeout(editingTimeout.current);
    editingTimeout.current = setTimeout(() => {
      socket?.emit("editing", null);
    }, 2000);
  };

  // Handle focus/blur for editing indicator
  const handleFocus = () => {
    socket?.emit("editing", user?.id);
  };
  const handleBlur = () => {
    socket?.emit("editing", null);
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  if (loading || !user || !note) return null;
  // Filter out undefined or invalid users
  const validUsers = users.filter((u) => u && u.id && u.username);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Simple Navbar */}
      <nav className="w-full flex items-center justify-between bg-gray-100 dark:bg-gray-900 px-6 py-3 shadow">
        <span className="font-bold text-lg">Collaborative Note</span>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Logout
        </button>
      </nav>
      <div className="flex flex-col items-center justify-center flex-1 p-4">
        <div className="bg-white dark:bg-black shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-2xl">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Collaborative Note
          </h2>
          <textarea
            className="w-full h-48 p-3 border rounded resize-none text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
            value={note.content}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Start typing..."
          />
          {editingUser && (
            <div className="text-yellow-600 dark:text-yellow-400 text-sm mb-2 text-center">
              {editingUser} is editing…
            </div>
          )}
          <div className="mt-4">
            <h3 className="font-semibold text-sm mb-1">Connected Users:</h3>
            <ul className="flex flex-wrap gap-2">
              {validUsers.map((u) => (
                <li
                  key={u.id}
                  className={`px-2 py-1 rounded text-xs ${
                    user && u.id === user.id
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {u.username}
                  {user && u.id === user.id && " (You)"}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
