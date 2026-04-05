export function normalizeTargetingValue(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

export function categoryMatches(adTarget: string, videoCategory: string): boolean {
  const a = normalizeTargetingValue(adTarget);
  const v = normalizeTargetingValue(videoCategory);
  if (!a) return false;
  if (!v) return false;
  return v === a || v.includes(a) || a.includes(v);
}

export function locationMatches(adTarget: string, videoLocation: string): boolean {
  const a = normalizeTargetingValue(adTarget);
  const v = normalizeTargetingValue(videoLocation);
  if (!a) return false;
  if (!v) return false;
  return v.includes(a) || a.includes(v);
}

export function passesTargetingFilter(input: {
  targetCategory: string;
  targetLocation: string;
  videoCategoryNorm: string;
  videoLocationNorm: string;
}): boolean {
  const tc = input.targetCategory.trim();
  const tl = input.targetLocation.trim();
  const catOk = !tc || categoryMatches(tc, input.videoCategoryNorm);
  const locOk = !tl || locationMatches(tl, input.videoLocationNorm);
  return catOk && locOk;
}
