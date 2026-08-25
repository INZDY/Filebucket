import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist";
import { compareAlphanumeric } from "./sorting";

// Set up worker source dynamically for pdfjs-dist if in browser
if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  // Use a standard CDN link matching the version of pdfjs-dist installed
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

/**
 * Extracts the first image alphabetically from a Manga ZIP or CBZ file.
 */
export async function extractMangaCover(file: File): Promise<Blob | null> {
  try {
    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);

    const imagePaths = Object.keys(zip.files).filter((path) => {
      const isSystem =
        path.includes("__MACOSX") ||
        path.includes("/.") ||
        path.split("/").some((part) => part.startsWith("."));
      const isImage = /\.(jpe?g|png|webp|gif)$/i.test(path);
      return !isSystem && isImage && !zip.files[path].dir;
    });

    if (imagePaths.length === 0) return null;

    // Sort alphabetically naturally using our natural sorting helper
    imagePaths.sort(compareAlphanumeric);

    const firstImagePath = imagePaths[0];
    const imageFile = zip.file(firstImagePath);
    if (!imageFile) return null;

    return await imageFile.async("blob");
  } catch (err) {
    console.error("Manga cover extraction failed:", err);
    return null;
  }
}

/**
 * Extracts the cover image from an EPUB document by parsing the container and package document (OPF).
 */
export async function extractEpubCover(file: File): Promise<Blob | null> {
  try {
    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);

    // 1. Read container.xml to locate the OPF file
    const containerXmlText = await zip.file("META-INF/container.xml")?.async("string");
    if (!containerXmlText) return null;

    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(containerXmlText, "text/xml");
    const rootfileEl = containerDoc.querySelector("rootfile");
    const opfPath = rootfileEl?.getAttribute("full-path");
    if (!opfPath) return null;

    // 2. Read the OPF package document
    const opfText = await zip.file(opfPath)?.async("string");
    if (!opfText) return null;

    const opfDoc = parser.parseFromString(opfText, "text/xml");

    // 3. Locate the cover image href
    let coverHref: string | null = null;

    // Try finding by metadata cover ID tag
    const coverMetaId = opfDoc.querySelector("meta[name='cover']")?.getAttribute("content");
    if (coverMetaId) {
      const coverItem = opfDoc.getElementById(coverMetaId) || opfDoc.querySelector(`item[id='${coverMetaId}']`);
      coverHref = coverItem?.getAttribute("href") || null;
    }

    // Fallback: item with properties="cover-image"
    if (!coverHref) {
      const coverItem = opfDoc.querySelector("item[properties~='cover-image']");
      coverHref = coverItem?.getAttribute("href") || null;
    }

    // Fallback: item with id="cover" or id="cover-image"
    if (!coverHref) {
      const coverItem = opfDoc.querySelector("item[id='cover']") || opfDoc.querySelector("item[id='cover-image']");
      coverHref = coverItem?.getAttribute("href") || null;
    }

    if (!coverHref) return null;

    // 4. Resolve the cover path relative to the OPF directory inside the ZIP
    const opfDir = opfPath.substring(0, opfPath.lastIndexOf("/"));
    const resolvedPath = opfDir ? `${opfDir}/${coverHref}` : coverHref;
    const normalizedPath = normalizePath(resolvedPath);

    // Get the file from ZIP (exact match or case-insensitive search)
    const imageFile =
      zip.file(normalizedPath) ||
      zip.files[normalizedPath] ||
      zip.files[Object.keys(zip.files).find((k) => k.toLowerCase() === normalizedPath.toLowerCase()) || ""];

    if (!imageFile) return null;

    return await imageFile.async("blob");
  } catch (err) {
    console.error("EPUB cover extraction failed:", err);
    return null;
  }
}

/**
 * Normalizes relative paths containing . or .. segments.
 */
function normalizePath(path: string): string {
  const parts = path.split("/");
  const stack: string[] = [];
  for (const part of parts) {
    if (part === "." || part === "") continue;
    if (part === "..") {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join("/");
}

/**
 * Renders page 1 of a PDF onto an offscreen canvas and outputs it as a PNG blob.
 */
export async function extractPdfCover(file: File): Promise<Blob | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return null;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    }).promise;

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, "image/png");
    });
  } catch (err) {
    console.error("PDF cover extraction failed:", err);
    return null;
  }
}

/**
 * Unifying method that inspects the file type/extension and extracts a cover thumbnail.
 */
export async function extractCoverThumbnail(file: File): Promise<Blob | null> {
  const filename = file.name.toLowerCase();

  if (filename.endsWith(".epub")) {
    return extractEpubCover(file);
  }

  if (filename.endsWith(".pdf") || file.type === "application/pdf") {
    return extractPdfCover(file);
  }

  if (
    filename.endsWith(".zip") ||
    filename.endsWith(".cbz") ||
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed" ||
    file.type === "application/x-cbz"
  ) {
    return extractMangaCover(file);
  }

  return null;
}
