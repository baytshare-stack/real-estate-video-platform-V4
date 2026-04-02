"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { useLocalizedPath } from "@/i18n/navigation";

function studioRole(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

function PostLoginRedirectInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const localizedPath = useLocalizedPath();
  const searchParams = useSearchParams();
  const fromRegister = searchParams.get("from") === "register";

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace(localizedPath("/login"));
      return;
    }
    const role = session?.user?.role;
    if (studioRole(role)) {
      router.replace(localizedPath("/studio"));
      return;
    }
    if (role === "AGENT" || role === "AGENCY") {
      router.replace(localizedPath("/create-channel"));
      return;
    }
    router.replace(localizedPath(fromRegister ? "/profile" : "/"));
  }, [status, session, router, fromRegister, localizedPath]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center text-gray-400">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
    </div>
  );
}

export default function PostLoginRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-gray-400">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
        </div>
      }
    >
      <PostLoginRedirectInner />
    </Suspense>
  );
}
