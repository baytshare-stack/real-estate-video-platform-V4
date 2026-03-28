/**
 * YouTube URL detection and embed URL building.
 * Supports watch, youtu.be, embed, shorts, and m.youtube hostnames.
 * Non-YouTube URLs are ignored by callers (native <video> stays unchanged).
 */

const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

function isValidVideoId(id: string): boolean {
  return VIDEO_ID_RE.test(id);
}

/**
 * Extracts the 11-character video id from a YouTube URL, or null if not a recognized YouTube link.
 */
export function parseYouTubeVideoId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let urlString = trimmed;
  if (!/^https?:\/\//i.test(urlString)) {
    urlString = `https://${urlString}`;
  }

  let u: URL;
  try {
    u = new URL(urlString);
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^www\./i, "").toLowerCase();

  if (host === "youtu.be") {
    const id = u.pathname.split("/").filter(Boolean)[0] ?? "";
    return isValidVideoId(id) ? id : null;
  }

  if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "m.youtube.com") {
    const path = u.pathname;

    if (path.startsWith("/embed/")) {
      const id = path.slice("/embed/".length).split("/")[0] ?? "";
      return isValidVideoId(id) ? id : null;
    }

    if (path.startsWith("/shorts/")) {
      const id = path.split("/")[2] ?? "";
      return isValidVideoId(id) ? id : null;
    }

    if (path === "/watch" || path.startsWith("/watch/")) {
      const v = u.searchParams.get("v");
      return v && isValidVideoId(v) ? v : null;
    }
  }

  return null;
}

/** True when the string is a URL we treat as YouTube (watch / share / embed / shorts). */
export function isYouTubeWatchUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  return parseYouTubeVideoId(url) !== null;
}

/**
 * Returns https://www.youtube.com/embed/VIDEO_ID for valid YouTube URLs; otherwise null.
 * Existing stored embed URLs are re-normalized through the same parser.
 */
export function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const id = parseYouTubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

/**
 * Shorts-feed embed: when playing, adds autoplay/mute/loop (playlist=id) so one iframe
 * can loop; when not playing, no autoplay (viewport left / another short active).
 */
export function getYouTubeShortsFeedEmbedSrc(watchUrl: string, playing: boolean): string | null {
  const id = parseYouTubeVideoId(watchUrl);
  if (!id) return null;
  const base = `https://www.youtube.com/embed/${id}`;
  const q = new URLSearchParams();
  q.set("mute", "1");
  q.set("controls", "0");
  q.set("playsinline", "1");
  q.set("rel", "0");
  if (playing) {
    q.set("autoplay", "1");
    q.set("loop", "1");
    q.set("playlist", id);
  }
  return `${base}?${q.toString()}`;
}
