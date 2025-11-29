"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getUsernameFromToken } from "@/lib/jwt-utils";

export default function LiveEditorPage() {
  const router = useRouter();
  const params = useParams();
  const urlUsername = params?.username as string;

  useEffect(() => {
    const loggedInUsername = getUsernameFromToken();
    if (loggedInUsername && loggedInUsername.toLowerCase() === urlUsername.toLowerCase()) {
      router.replace("/admin/live-editor");
    } else {
      router.replace("/admin/login");
    }
  }, [router, urlUsername]);

  return null;
}

