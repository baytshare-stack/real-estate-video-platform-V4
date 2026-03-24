function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

export function serializeVideoForClient(video: any): any {
  const property = video?.property;

  const serializedProperty = property
    ? {
        ...property,
        price: property.price !== null && property.price !== undefined ? toNumberOrUndefined(property.price) : property.price,
        sizeSqm: property.sizeSqm !== null && property.sizeSqm !== undefined ? toNumberOrUndefined(property.sizeSqm) : property.sizeSqm,
      }
    : property;

  const createdAt = video?.createdAt ? new Date(video.createdAt).toISOString() : video?.createdAt;

  return {
    ...video,
    createdAt,
    thumbnailUrl: video?.thumbnailUrl ?? video?.thumbnail ?? undefined,
    property: serializedProperty,
    // Some UI code uses top-level `price` / `sizeSqm` as well.
    price: serializedProperty?.price ?? toNumberOrUndefined(video?.price) ?? video?.price,
    currency: serializedProperty?.currency ?? video?.currency ?? "USD",
    sizeSqm: serializedProperty?.sizeSqm ?? toNumberOrUndefined(video?.sizeSqm) ?? video?.sizeSqm,
    latitude: toNumberOrUndefined(serializedProperty?.latitude ?? video?.latitude),
    longitude: toNumberOrUndefined(serializedProperty?.longitude ?? video?.longitude),
  };
}

export function serializeVideosForClient(videos: any[] | undefined | null): any[] {
  if (!Array.isArray(videos)) return [];
  return videos.map((v) => serializeVideoForClient(v));
}

