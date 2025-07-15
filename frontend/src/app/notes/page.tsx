"use client";
import { useEffect, useState } from "react";
import { useUser } from "../UserContext";
import { useRouter } from "next/navigation";

interface Note {
  id: string;
  owner: string;
  content: string;
  public: number;
}

export default function NotesDashboard() {
  const { user } = useUser();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [allUsers, setAllUsers] = useState<{ id: string; username: string }[]>(
    []
  );

  useEffect(() => {
    if (!user) return;
    fetch("http://localhost:4000/notes", {
      headers: { "x-user-id": user.id },
    })
      .then((res) => res.json())
      .then(setNotes);
    // Fetch all users for owner username mapping
    fetch("http://localhost:4000/users")
      .then((res) => res.json())
      .then((data) => setAllUsers(data.users || []));
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:4000/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify({ content, public: isPublic }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create note");
        setLoading(false);
        return;
      }
      setContent("");
      setIsPublic(false);
      // Refresh notes
      fetch("http://localhost:4000/notes", {
        headers: { "x-user-id": user?.id || "" },
      })
        .then((res) => res.json())
        .then(setNotes);
    } catch (err) {
      setError("Network error");
    }
    setLoading(false);
  };

  const handleSelect = (noteId: string) => {
    router.push(`/notes/${noteId}`);
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Notes Dashboard</h1>
        <button
          className="bg-green-500 text-white px-4 py-2 rounded"
          onClick={() => router.push("/notes/create")}
        >
          + Create Note
        </button>
      </div>
      <h2 className="text-xl font-semibold mb-2">Your Notes</h2>
      <ul>
        {notes.map((note) => {
          const ownerUser = allUsers.find((u) => u.id === note.owner);
          return (
            <li
              key={note.id}
              className="border rounded p-3 mb-2 flex justify-between items-center cursor-pointer hover:bg-gray-100"
              onClick={() => handleSelect(note.id)}
            >
              <div>
                <div className="font-bold">
                  {note.content.slice(0, 30)}
                  {note.content.length > 30 ? "..." : ""}
                </div>
                <div className="text-sm text-gray-600">
                  {note.public ? "Public" : "Private"} | Owner:{" "}
                  {ownerUser ? ownerUser.username : note.owner}
                  {user && note.owner === user.id ? " (You)" : ""}
                </div>
              </div>
              <span className="text-blue-500">View/Edit</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
