"use client";
import { useEffect, useState, useRef } from "react";
import { useUser } from "../UserContext";
import { useRouter } from "next/navigation";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "../../components/ui/table";
import { io, Socket } from "socket.io-client";

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
  const [filter, setFilter] = useState("all");
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);
  if (loading || !user) return null;

  useEffect(() => {
    if (!user) return;
    let url = "http://localhost:4000/notes";
    let params = [];
    if (filter === "my") {
      params.push(`owner=${user.id}`);
    } else if (filter === "public") {
      params.push("public=1");
    } else if (filter === "private-permitted") {
      // We'll fetch all notes, then filter client-side for private notes where user is permitted but not owner
    }
    if (params.length) url += `?${params.join("&")}`;
    fetch(url, {
      headers: { "x-user-id": user.id },
    })
      .then((res) => res.json())
      .then((data) => {
        if (filter === "private-permitted") {
          // Only show private notes where user is permitted but not owner
          setNotes(
            data.filter(
              (note: Note) => note.public === 0 && note.owner !== user.id
            )
          );
        } else {
          setNotes(data);
        }
      });
    // Fetch all users for owner username mapping
    fetch("http://localhost:4000/users")
      .then((res) => res.json())
      .then((data) => setAllUsers(data.users || []));
    // Real-time note creation
    const socket = io("http://localhost:4000", {
      auth: { id: user.id },
      transports: ["websocket"],
    });
    socketRef.current = socket;
    socket.on("note-created", ({ note }) => {
      // Only add if user can access (public, owner, or permitted)
      if (
        note.public === 1 ||
        note.owner === user.id ||
        (note.permitted && note.permitted.includes(user.id))
      ) {
        setNotes((prev) => [note, ...prev.filter((n) => n.id !== note.id)]);
      }
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, filter]);

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
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Notes Dashboard</h1>
        <button
          className="bg-green-500 text-white px-4 py-2 rounded"
          onClick={() => router.push("/notes/create")}
        >
          + Create Note
        </button>
      </div>
      <div className="flex gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Filter</label>
          <select
            className="border rounded p-2"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="my">My Notes</option>
            <option value="private-permitted">Private (permitted)</option>
            <option value="public">Public</option>
          </select>
        </div>
      </div>
      <Table>
        <TableCaption>Your Notes</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {notes.map((note) => {
            const ownerUser = allUsers.find((u) => u.id === note.owner);
            return (
              <TableRow
                key={note.id}
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSelect(note.id)}
              >
                <TableCell>
                  {note.content.slice(0, 30)}
                  {note.content.length > 30 ? "..." : ""}
                </TableCell>
                <TableCell>
                  {ownerUser ? ownerUser.username : note.owner}
                  {user && note.owner === user.id ? " (You)" : ""}
                </TableCell>
                <TableCell>{note.public ? "Public" : "Private"}</TableCell>
                <TableCell>
                  <span className="text-blue-500">View/Edit</span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
