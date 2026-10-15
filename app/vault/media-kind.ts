export type MediaPreviewKind =
  | "image"
  | "audio"
  | "video"
  | "pdf"
  | "text"
  | "epub"
  | "archive"
  | "unsupported";

export function getMediaPreviewKind(
  contentType: string | null | undefined,
  filename = ""
): MediaPreviewKind {
  // Check extension first for books and archives
  if (contentType === "application/epub+zip" || filename.toLowerCase().endsWith(".epub")) {
    return "epub";
  }
  if (
    contentType === "application/zip" ||
    contentType === "application/x-zip-compressed" ||
    filename.toLowerCase().endsWith(".zip") ||
    filename.toLowerCase().endsWith(".cbz")
  ) {
    return "archive";
  }

  if (!contentType) return "unsupported";
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType.startsWith("video/")) return "video";
  if (contentType === "application/pdf") return "pdf";
  if (contentType.startsWith("text/") || contentType === "application/json") return "text";

  return "unsupported";
}
