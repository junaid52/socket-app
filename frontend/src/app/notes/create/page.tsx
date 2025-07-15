"use client";
import { useState } from "react";
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
        body: JSON.stringify({ content, public: isPublic }),
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
