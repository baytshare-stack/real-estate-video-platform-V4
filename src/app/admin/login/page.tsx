import { redirect } from "next/navigation";

/** Legacy URL — canonical admin login is `/admin-login`. */
export default function LegacyAdminLoginRedirect() {
  redirect("/admin-login");
}
