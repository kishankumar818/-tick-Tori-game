const SUPPORTED_QUALITIES = ["1080", "720", "480", "mp3"];

function parseYouTubeUrl(value) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    let id = null;
    if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)) {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      if (url.pathname.startsWith("/shorts/")) id = url.pathname.split("/")[2];
    }
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
    return { id, url: `https://www.youtube.com/watch?v=${id}` };
  } catch { return null; }
}

function getQuality(value) {
  return typeof value === "string" && SUPPORTED_QUALITIES.includes(value) ? value : null;
}

module.exports = { SUPPORTED_QUALITIES, parseYouTubeUrl, getQuality };
