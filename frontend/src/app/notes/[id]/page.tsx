"use client";
import { useEffect, useState, useRef } from "react";
import { useUser } from "../../UserContext";
import { useRouter, useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";

interface Note {
  id: string;
  owner: string;
  content: string;
  public: number;
}

export default function NoteViewPage() {
  const { user } = useUser();
  const router = useRouter();
  const params = useParams();
  const noteId = params?.id as string;
  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [shareUserId, setShareUserId] = useState("");
  const [shareMsg, setShareMsg] = useState("");
  const [permittedUsers, setPermittedUsers] = useState<
    { id: string; username: string; owner: boolean }[]
  >([]);
  const [allUsers, setAllUsers] = useState<{ id: string; username: string }[]>(
    []
  );
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<
    { id: string; username: string }[]
  >([]);
  const editingTimeout = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isEditingLocally, setIsEditingLocally] = useState(false);

  useEffect(() => {
    if (!user || !noteId) return;
    setLoading(true);
    fetch(`http://localhost:4000/notes`, {
      headers: { "x-user-id": user.id },
    })
      .then((res) => res.json())
      .then((notes) => {
        const found = notes.find((n: Note) => n.id === noteId);
        if (found) {
          setNote(found);
          setContent(found.content);
          // Fetch permitted users for private notes
          if (found.public === 0) {
            fetch(`http://localhost:4000/notes/${noteId}/permitted`, {
              headers: { "x-user-id": user.id },
            })
              .then((res) => res.json())
              .then((data) => {
                setPermittedUsers(data.users || []);
              });
          } else {
            setPermittedUsers([]);
          }
        } else {
          setError("Note not found or you do not have access.");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch note.");
        setLoading(false);
      });
    // Fetch all users for sharing
    fetch("http://localhost:4000/users")
      .then((res) => res.json())
      .then((data) => setAllUsers(data.users || []));
    // --- Real-time updates and presence ---
    const socket = io("http://localhost:4000", {
      auth: { id: user.id },
      transports: ["websocket"],
    });
    socketRef.current = socket;
    socket.on(
      "note-updated",
      ({ noteId: updatedId, content: updatedContent }) => {
        if (updatedId === noteId && !isEditingLocally) {
          setContent(updatedContent);
          setNote((prev) =>
            prev ? { ...prev, content: updatedContent } : prev
          );
        }
      }
    );
    socket.on(
      "content-update",
      ({ noteId: updatedId, content: updatedContent }) => {
        if (updatedId === noteId && !isEditingLocally) {
          setContent(updatedContent);
          setNote((prev) =>
            prev ? { ...prev, content: updatedContent } : prev
          );
        }
      }
    );
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
    socket.on(
      "init",
      (payload: { users: { id: string; username: string }[] }) => {
        setConnectedUsers(payload.users || []);
      }
    );
    socket.on("user-joined", (userList: { id: string; username: string }[]) => {
      setConnectedUsers(userList);
    });
    socket.on("user-left", (userList: { id: string; username: string }[]) => {
      setConnectedUsers(userList);
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, noteId, isEditingLocally]);
  console.log(permittedUsers.some((u) => u.id === user?.id));
  console.log(note?.owner === user?.id);
  console.log(note?.public);
  console.log(note);
  const canEdit =
    note &&
    (note.public ||
      note.owner === user?.id ||
      permittedUsers.some((u) => u.id === user?.id));

  const handleSave = async () => {
    if (!user || !note) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      // Also emit real-time update
      if (socketRef.current) {
        socketRef.current.emit("edit-note", { noteId: note.id, content });
      }
      // Save to backend
      const res = await fetch(`http://localhost:4000/notes/${note.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save note");
        setSaving(false);
        return;
      }
      setSuccess("Note saved!");
    } catch {
      setError("Network error");
    }
    setSaving(false);
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setShareMsg("");
    if (!user || !note || !shareUserId) return;
    try {
      const res = await fetch(`http://localhost:4000/notes/${note.id}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({ targetUserId: shareUserId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setShareMsg(data.error || "Failed to share note");
        return;
      }
      const sharedUser = allUsers.find((u) => u.id === shareUserId);
      setShareMsg(
        "Note shared with " + (sharedUser ? sharedUser.username : shareUserId)
      );
      setShareUserId("");
      // Refresh permitted users
      fetch(`http://localhost:4000/notes/${note.id}/permitted`, {
        headers: { "x-user-id": user.id },
      })
        .then((res) => res.json())
        .then((data) => {
          setPermittedUsers(data.users || []);
        });
    } catch {
      setShareMsg("Network error");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (editingTimeout.current) clearTimeout(editingTimeout.current);
    // Emit editing event with content
    if (socketRef.current) {
      socketRef.current.emit("editing", {
        isEditing: true,
        content: e.target.value,
      });
      editingTimeout.current = setTimeout(() => {
        socketRef.current?.emit("editing", { isEditing: false });
      }, 2000);
    }
  };
  const handleFocus = () => {
    setIsEditingLocally(true);
    if (socketRef.current) {
      socketRef.current.emit("editing", { isEditing: true, content });
    }
  };
  const handleBlur = () => {
    setIsEditingLocally(false);
    if (socketRef.current) {
      socketRef.current.emit("editing", { isEditing: false });
    }
  };

  const handleRemovePermission = async (removeUserId: string) => {
    if (!user || !note) return;
    try {
      const res = await fetch(
        `http://localhost:4000/notes/${note.id}/permissions/${removeUserId}`,
        {
          method: "DELETE",
          headers: { "x-user-id": user.id },
        }
      );
      if (!res.ok) return;
      // Refresh permitted users
      fetch(`http://localhost:4000/notes/${note.id}/permitted`, {
        headers: { "x-user-id": user.id },
      })
        .then((res) => res.json())
        .then((data) => {
          setPermittedUsers(data.users || []);
        });
    } catch {}
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!note) return null;

  return (
    <div className="max-w-xl mx-auto p-4">
      <button
        className="mb-4 text-blue-500 underline"
        onClick={() => router.push("/notes")}
      >
        &larr; Back to Notes
      </button>
      <h1 className="text-2xl font-bold mb-2">Note</h1>
      <div className="mb-2 text-gray-600">
        {note.public ? "Public" : "Private"} | Owner:{" "}
        {permittedUsers.find((u) => u.owner)?.username || note.owner}
      </div>
      {/* Sharing controls for private notes, owner only */}
      {note.public === 0 && note.owner === user?.id && (
        <>
          <form onSubmit={handleShare} className="mb-2 flex items-center gap-2">
            <select
              value={shareUserId}
              onChange={(e) => setShareUserId(e.target.value)}
              className="border rounded p-2"
              required
            >
              <option value="">Select user to share with</option>
              {allUsers
                .filter(
                  (u) =>
                    u.id !== note.owner &&
                    !permittedUsers.some((pu) => pu.id === u.id)
                )
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                  </option>
                ))}
            </select>
            <button
              type="submit"
              className="bg-green-500 text-white px-3 py-2 rounded"
              disabled={!shareUserId}
            >
              Share
            </button>
            {shareMsg && (
              <span className="ml-2 text-sm text-blue-600">{shareMsg}</span>
            )}
          </form>
          <div className="mb-4 text-sm text-gray-700">
            <span className="font-semibold">Permitted users:</span>
            <ul className="list-disc ml-6">
              {permittedUsers.map((u) => (
                <li key={u.id} className="flex items-center gap-2">
                  {u.username} {u.owner ? "(owner)" : ""}
                  {note.owner === user?.id && !u.owner && (
                    <button
                      className="ml-2 text-red-500 hover:underline text-xs"
                      onClick={() => handleRemovePermission(u.id)}
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      {canEdit ? (
        <>
          <textarea
            className="w-full border rounded p-2 mb-2"
            value={content}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            rows={6}
          />
          {editingUser && (
            <div className="text-yellow-600 dark:text-yellow-400 text-sm mb-2 text-center">
              {editingUser} is editing…
            </div>
          )}
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {success && <div className="text-green-600 mt-2">{success}</div>}
          {error && <div className="text-red-500 mt-2">{error}</div>}
          <div className="mt-4">
            <h3 className="font-semibold text-sm mb-1">Connected Users:</h3>
            <ul className="flex flex-wrap gap-2">
              {connectedUsers.map((u) => (
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
        </>
      ) : (
        <div className="border rounded p-2 bg-gray-100">{note.content}</div>
      )}
    </div>
  );
}
