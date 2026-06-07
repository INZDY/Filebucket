# Filebucket Deployment & Safety Plan

This plan details the steps required to deploy the Filebucket project to Vercel (or similar serverless providers), establish a secure single-user bootstrapped account, and harden data safety and media access.

---

## High-Level Goals

1. **Vercel Serverless Deployment:** Deploy the Next.js app to Vercel, integrating with a serverless-compatible PostgreSQL database.
2. **Bootstrapped Single-User Setup:** Automatically seed the admin account during deployment, keeping the vault strictly private without public signup forms.
3. **Hardened Authentication Safety:** Secure session management (NextAuth JWT) and add rate-limiting or protection against brute-force login attempts.
4. **Secure Media Assets:** Transition media previews from public R2 URLs to secure, authenticated proxy routes or pre-signed download URLs to prevent unauthorized access to uploaded files.

---

## Milestones

### Milestone 8: Serverless Database & Migration Setup
*   **Goal:** Configure a production database and build pipeline compatible with serverless architecture.
*   **Tasks:**
    *   Provision a PostgreSQL database using Neon, Supabase, or Vercel Postgres.
    *   Configure Prisma connection pooling (e.g., using Neon's connection pooling or PgBouncer-compatible connection strings).
    *   Update the Vercel build command to run migrations and seed the user: `npm run prisma:generate && prisma migrate deploy && npm run prisma:seed`.
    *   Validate the database adapter behavior in a serverless environment.

### Milestone 9: Hardening Authentication & Session Safety
*   **Goal:** Secure the login endpoint and session management.
*   **Tasks:**
    *   Set up a production-ready `AUTH_SECRET` (using a high-entropy string) in Vercel environment variables.
    *   Verify NextAuth cookie attributes (Secure, HttpOnly, SameSite) are correctly configured in production.
    *   Ensure password verification uses `bcryptjs` with a secure work factor (currently 12 in seed).
    *   Add login rate-limiting / brute-force protection to the [loginAction](file:///C:/Users/Akina/repos/Filebucket/app/login/actions.ts) endpoint (e.g., using an in-memory lock or Upstash Redis/similar serverless rate-limiter).

### Milestone 10: Private Media Delivery & Storage Hardening
*   **Goal:** Protect media assets from public exposure.
*   **Tasks:**
    *   Remove public bucket access requirements from the Cloudflare R2 bucket.
    *   Replace direct public URL serving (`R2_PUBLIC_BASE_URL`) with either:
        *   **Option A (Pre-signed download URLs):** Use `GetObjectCommand` with `getSignedUrl` inside [getMediaAssetUrl](file:///C:/Users/Akina/repos/Filebucket/app/page.tsx) to generate short-lived signed URLs.
        *   **Option B (Authenticated proxy route):** Serve files via a Next.js API route (e.g. `/api/media/[key]`) that validates the user session before fetching from R2.
    *   Configure CORS on R2 to restrict uploads/gets to your specific deployed domain.

### Milestone 11: Production Deployment & Verification
*   **Goal:** Deploy, configure, and verify the fully running production vault.
*   **Tasks:**
    *   Connect the repository to Vercel.
    *   Configure all production environment variables:
        *   `DATABASE_URL` (pooled connection string)
        *   `AUTH_SECRET` (NextAuth secret)
        *   `AUTH_URL` (production deployment URL)
        *   `FILEBUCKET_ADMIN_EMAIL`
        *   `FILEBUCKET_ADMIN_PASSWORD`
        *   `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
    *   Run build, verify migration execution, and log in to test folder/note/media CRUD operations.
