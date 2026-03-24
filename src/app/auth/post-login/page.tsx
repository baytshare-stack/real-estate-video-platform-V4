"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function studioRole(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export default function PostLoginRedirectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    const role = session?.user?.role;
    router.replace(studioRole(role) ? "/studio" : "/");
  }, [status, session, router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center text-gray-400">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
    </div>
  );
}
