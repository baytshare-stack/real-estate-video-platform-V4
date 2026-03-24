/**
 * Canonical phone storage: digits only, country code + national (no leading +).
 * fullPhoneNumber on User keeps E.164 with leading +.
 */

export function digitsOnly(input: string): string {
  return input.replace(/\D/g, "");
}

export function canonicalPhoneDigitsFromE164(full: string | null | undefined): string | null {
  if (!full) return null;
  const d = digitsOnly(full);
  return d.length ? d : null;
}

/** Build Prisma OR clause to find a user by flexible phone input. */
export function userWherePhoneMatches(rawInput: string) {
  const d = digitsOnly(rawInput);
  if (!d) return null;
  return {
    OR: [{ phone: d }, { phoneNumber: d }, { fullPhoneNumber: `+${d}` }],
  };
}
