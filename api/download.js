const ytdl = require("@distube/ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegPath);

const ALLOWED = new Set(["1080", "720", "480", "mp3"]);

function cleanName(title) {
  return String(title || "youtube-video")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "youtube-video";
}

function isYouTubeUrl(url) {
  try {
    const u = new URL(url);
    return [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "youtu.be",
      "www.youtube-nocookie.com"
    ].includes(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

module.exports = async (req, res) => {
  // Allow the hosted frontend to call this function from another origin.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Only GET is supported." });
  }

  const rawUrl = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  const url = String(rawUrl || "").trim();
  const quality = String(req.query.quality || "720");

  if (!url || !isYouTubeUrl(url)) {
    return res.status(400).json({
      error: "Valid YouTube URL is required.",
      example: "/api/download?url=https://www.youtube.com/watch?v=VIDEO_ID&quality=720"
    });
  }

  if (!ALLOWED.has(quality)) {
    return res.status(400).json({
      error: "Invalid quality.",
      allowed: ["1080", "720", "480", "mp3"]
    });
  }

  try {
    const info = await ytdl.getInfo(url);
    const title = cleanName(info.videoDetails.title);

    // MP3: audio is transcoded to MP3 by FFmpeg.
    if (quality === "mp3") {
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${title}.mp3"`
      );
      res.setHeader("Cache-Control", "no-store");

      const audio = ytdl(url, {
        quality: "highestaudio",
        filter: "audioonly"
      });

      return ffmpeg(audio)
        .audioCodec("libmp3lame")
        .audioBitrate(192)
        .format("mp3")
        .on("error", (err) => {
          if (!res.headersSent) {
            res.status(500).json({ error: "MP3 conversion failed." });
          } else {
            res.destroy(err);
          }
        })
        .pipe(res, { end: true });
    }

    // Prefer a progressive format (video + audio) at or below requested quality.
    // If unavailable, FFmpeg muxes separate video/audio streams.
    const target = Number(quality);
    const progressive = ytdl.chooseFormat(info.formats, {
      quality: [`${target}p`, `highest`],
      filter: (format) =>
        format.hasVideo &&
        format.hasAudio &&
        format.container === "mp4" &&
        Number(format.height || 0) <= target
    });

    if (progressive && progressive.url && Number(progressive.height || 0) >= Math.min(target, 480)) {
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${title}-${quality}p.mp4"`
      );
      res.setHeader("Cache-Control", "no-store");

      return ytdl(url, { format: progressive }).pipe(res);
    }

    const video = ytdl.chooseFormat(info.formats, {
      quality: [`${target}p`, "highestvideo"],
      filter: (format) =>
        format.hasVideo &&
        format.container === "mp4" &&
        Number(format.height || 0) <= target
    });

    const audio = ytdl.chooseFormat(info.formats, {
      quality: "highestaudio",
      filter: (format) => format.hasAudio && format.container === "mp4"
    });

    if (!video || !audio) {
      return res.status(404).json({
        error: `Requested ${quality}p format is not available for this video.`
      });
    }

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${title}-${quality}p.mp4"`
    );
    res.setHeader("Cache-Control", "no-store");

    const videoStream = ytdl(url, { format: video });
    const audioStream = ytdl(url, { format: audio });

    return ffmpeg()
      .input(videoStream)
      .input(audioStream)
      .videoCodec("copy")
      .audioCodec("aac")
      .format("mp4")
      .outputOptions([
        "-movflags frag_keyframe+empty_moov",
        "-shortest"
      ])
      .on("error", (err) => {
        if (!res.headersSent) {
          res.status(500).json({ error: "Video/audio muxing failed." });
        } else {
          res.destroy(err);
        }
      })
      .pipe(res, { end: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Unable to process this YouTube URL.",
      details: err && err.message ? err.message : "Unknown error"
    });
  }
};
