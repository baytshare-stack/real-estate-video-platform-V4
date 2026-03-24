import { handleAdminLoginPost } from "@/lib/admin-login-post";

/** @deprecated Prefer POST /api/admin/auth — kept for backwards compatibility. */
export async function POST(request: Request) {
  return handleAdminLoginPost(request);
}
