import JSZip from "jszip";
import { compareAlphanumeric } from "./sorting";

export type MangaPage = {
  name: string;
  load: () => Promise<string>;
};

/**
 * Parses a ZIP/CBZ manga archive buffer client-side.
 * Filters out metadata/hidden folders and sorts the page entries alphanumeric-naturally.
 */
export async function parseMangaArchive(arrayBuffer: ArrayBuffer): Promise<MangaPage[]> {
  const zip = await JSZip.loadAsync(arrayBuffer);

  const imagePaths = Object.keys(zip.files).filter((path) => {
    const isSystem =
      path.includes("__MACOSX") ||
      path.includes("/.") ||
      path.split("/").some((part) => part.startsWith("."));
    const isImage = /\.(jpe?g|png|webp|gif)$/i.test(path);
    return !isSystem && isImage && !zip.files[path].dir;
  });

  // Sort alphabetically and alphanumeric-naturally using the shared sorting compare utility
  imagePaths.sort(compareAlphanumeric);

  return imagePaths.map((path) => {
    const file = zip.files[path];
    return {
      name: path.split("/").pop() || path,
      load: async () => {
        const blob = await file.async("blob");
        return URL.createObjectURL(blob);
      },
    };
  });
}
