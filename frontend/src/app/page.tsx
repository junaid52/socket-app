"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "./UserContext";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useUser();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/note");
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  // Don't render anything while redirecting
  return null;
}
