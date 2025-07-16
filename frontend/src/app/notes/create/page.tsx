"use client";
import { useState, useEffect } from "react";
import { useUser } from "../../UserContext";
import { useRouter } from "next/navigation";

export default function CreateNotePage() {
  const { user } = useUser();
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [permitted, setPermitted] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: string; username: string }[]>(
    []
  );
  const [selectedUser, setSelectedUser] = useState("");

  useEffect(() => {
    // Fetch all users for sharing
    fetch("http://localhost:4000/users")
      .then((res) => res.json())
      .then((data) => setAllUsers(data.users || []));
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);
  if (loading || !user) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("http://localhost:4000/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify({
          content,
          public: isPublic,
          permitted: isPublic ? [] : permitted,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create note");
        setLoading(false);
        return;
      }
      setSuccess("Note created!");
      setTimeout(() => router.push("/notes"), 1000);
    } catch (err) {
      setError("Network error");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create a New Note</h1>
      <form onSubmit={handleCreate} className="mb-6">
        <textarea
          className="w-full border rounded p-2 mb-2"
          placeholder="Note content..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="public"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="public">Public</label>
        </div>
        {!isPublic && (
          <div className="mb-2">
            <label className="block mb-1 font-medium">Share with users:</label>
            <div className="flex gap-2 items-center mb-2">
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="border rounded p-2"
              >
                <option value="">Select user to permit</option>
                {allUsers
                  .filter((u) => u.id !== user?.id && !permitted.includes(u.id))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                className="bg-green-500 text-white px-3 py-2 rounded"
                disabled={!selectedUser}
                onClick={() => {
                  if (selectedUser && !permitted.includes(selectedUser)) {
                    setPermitted((prev) => [...prev, selectedUser]);
                    setSelectedUser("");
                  }
                }}
              >
                Add
              </button>
            </div>
            <ul className="list-disc ml-6">
              {permitted.map((uid) => {
                const u = allUsers.find((u) => u.id === uid);
                return (
                  <li key={uid} className="flex items-center gap-2">
                    {u ? u.username : uid}
                    <button
                      type="button"
                      className="ml-2 text-red-500 hover:underline text-xs"
                      onClick={() =>
                        setPermitted((prev) => prev.filter((id) => id !== uid))
                      }
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Note"}
        </button>
        {error && <div className="text-red-500 mt-2">{error}</div>}
        {success && <div className="text-green-600 mt-2">{success}</div>}
      </form>
      <button
        className="text-blue-500 underline"
        onClick={() => router.push("/notes")}
      >
        &larr; Back to Notes
      </button>
    </div>
  );
}
