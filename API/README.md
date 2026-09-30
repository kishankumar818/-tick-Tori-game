# YouTube Downloader API — Vercel

This project exposes one API endpoint:

GET `/api/download?url=YOUTUBE_URL&quality=QUALITY`

Supported values:

- `1080`
- `720`
- `480`
- `mp3`

## Example

```text
https://YOUR-DOMAIN.vercel.app/api/download?url=https://www.youtube.com/watch?v=VIDEO_ID&quality=720
```

## Local test

```bash
npm install
npm run
```

There is no normal local web server in this minimal project. For local development with Vercel CLI:

```bash
npm install -g vercel
vercel dev
```

Then open:

```text
http://localhost:3000/api/download?url=https://www.youtube.com/watch?v=VIDEO_ID&quality=720
```

## Deploy to Vercel

1. Put this folder in a GitHub repository.
2. Import the repository into Vercel.
3. Framework preset: Other.
4. Build command: leave empty.
5. Output directory: leave empty.
6. Deploy.

After deployment:

```text
https://YOUR-DOMAIN.vercel.app/api/download?url=YOUTUBE_URL&quality=1080
```

## Important

1080p YouTube streams are commonly delivered as separate video and audio streams, so this API uses FFmpeg to mux them. MP3 also uses FFmpeg for conversion.

Serverless execution limits, large videos, YouTube changes, copyright restrictions, and Vercel limits can affect downloads. Use this API only for content you are authorized to download.
