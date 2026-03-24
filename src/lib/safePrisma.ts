/**
 * Safe wrappers for Prisma reads so empty DB / connection issues never crash the app.
 */
export async function safeFindMany<T>(run: () => Promise<T[]>): Promise<T[]> {
  try {
    const rows = await run();
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.error("[safeFindMany]", e);
    return [];
  }
}

export async function safeFindFirst<T>(run: () => Promise<T | null>): Promise<T | null> {
  try {
    return await run();
  } catch (e) {
    console.error("[safeFindFirst]", e);
    return null;
  }
}

export async function safeFindUnique<T>(run: () => Promise<T | null>): Promise<T | null> {
  try {
    return await run();
  } catch (e) {
    console.error("[safeFindUnique]", e);
    return null;
  }
}

export async function safeCount(run: () => Promise<number>): Promise<number> {
  try {
    return await run();
  } catch (e) {
    console.error("[safeCount]", e);
    return 0;
  }
}
