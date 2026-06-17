# Redirect media requests to presigned R2/S3 URLs

Instead of downloading entire media files from Cloudflare R2 into Next.js server memory and streaming them to the client, the `/api/media` GET endpoint redirects (307 Temporary Redirect) requests directly to short-lived presigned URLs. This offloads data transit to Cloudflare R2, reduces server memory consumption to zero for media delivery, and natively supports HTTP Range requests for video and audio seeking.
