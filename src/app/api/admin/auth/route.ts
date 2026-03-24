import { handleAdminLoginPost } from "@/lib/admin-login-post";

/**
 * POST /api/admin/auth
 * Admin-only login (not NextAuth). Sets httpOnly admin session cookie on success.
 */
export async function POST(request: Request) {
  return handleAdminLoginPost(request);
}
