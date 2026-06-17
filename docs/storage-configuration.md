# Storage & CORS Configuration Guide

Filebucket uses Cloudflare R2 (or any S3-compatible blob storage) to securely store and deliver media assets such as images, audio, video, PDFs, and ZIP/CBZ manga archives.

This guide details the recommended security settings and CORS configuration required for the application to function correctly.

---

## 1. Bucket Privacy Settings (Disable Public URLs)

For security, your R2 bucket should remain completely private:
* **Disable Public Access**: You do **not** need to enable the R2 Public Dev URL or attach a public Custom Domain to your bucket.
* **How it works**: Filebucket's secure backend generates temporary, short-lived **presigned download URLs** using your secret keys. When a user requests a file, the app securely redirects them to this signed URL, bypassing public blocking.
* **Result**: Images, video, audio, and PDF previews will load perfectly because the browser accesses them natively via signed request links.

---

## 2. CORS (Cross-Origin Resource Sharing) Configuration

While standard media elements (`<img>`, `<video>`, `<audio>`) do not enforce CORS restrictions when loading source assets, features that fetch and process files in JavaScript do.

### Why CORS is required for ZIP/CBZ Manga Reader
In Filebucket, when you click **Read Archive** on a ZIP or CBZ file, the app downloads the archive directly in the browser using the JavaScript `fetch` API and decompresses it client-side.
* Since the browser is requesting file resources from the remote Cloudflare R2 domain (`*.r2.cloudflarestorage.com`) from your application's origin (e.g. `http://localhost:3000` in development or `https://filebucket.yourdomain.com` in production), the request is subject to **CORS**.
* If R2 is not configured to allow requests from your website's origin, the browser blocks the JavaScript download, and the archive reader will fail.

### Required CORS JSON Policy
To permit the client-side Manga Reader to fetch and extract ZIP archives, configure the CORS policy on your R2 bucket. In the Cloudflare R2 Bucket settings, add the following CORS rule:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-production-domain.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": []
  }
]
```

> [!NOTE]
> Adjust the list of `AllowedOrigins` to include your actual local development and production URLs.
