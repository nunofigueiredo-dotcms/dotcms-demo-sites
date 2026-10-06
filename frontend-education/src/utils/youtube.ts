/** The 11-character id of a YouTube video link (watch, youtu.be, embed, shorts, live), or undefined. */
export function youtubeId(url: string | undefined): string | undefined {
  const m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(url ?? "");
  return m?.[1];
}
