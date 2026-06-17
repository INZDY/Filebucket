# PWA Standalone Mode and Caching Strategy

To make Filebucket installable as a mobile and desktop application, we decided to implement a Web App Manifest and register a Service Worker that applies a hybrid caching strategy. Static UI assets (JavaScript, CSS, fonts, icons) are served using a Stale-While-Revalidate pattern for instant page loads, while dynamic API calls and note-saving/auth Server Actions are routed Network-First to guarantee data consistency and prevent desynchronization of vault notes.
