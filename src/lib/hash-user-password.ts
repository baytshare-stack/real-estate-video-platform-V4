import bcrypt from "bcryptjs";

/**
 * Same algorithm as credential registration (`src/app/api/auth/register/route.ts`):
 * bcrypt.genSalt(10) + bcrypt.hash.
 */
export async function hashCredentialPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}
