// Renders a PDF's pages to image blobs so image-based PDFs can be read in the
// manga reader pipeline (see docs/adr/0006-manga-reader-and-zip-archives.md).
export type PdfPage = {
  name: string;
  load: () => Promise<string>;
};

const MAX_RENDER_SCALE = 2;
const MAX_CANVAS_WIDTH = 2400;

/**
 * Loads a PDF document and exposes each page as a lazily rendered image.
 * Rendering happens on demand so opening a long PDF stays fast.
 */
export async function parsePdfDocument(url: string): Promise<PdfPage[]> {
  const pdfjs = await import("pdfjs-dist");

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const pdf = await pdfjs.getDocument({ url }).promise;
  const pages: PdfPage[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    pages.push({
      name: `Page ${pageNumber}`,
      load: async () => {
        const page = await pdf.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(MAX_RENDER_SCALE, MAX_CANVAS_WIDTH / baseViewport.width);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        await page.render({ canvas, viewport }).promise;

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );
        if (!blob) {
          throw new Error(`Failed to render PDF page ${pageNumber}`);
        }
        return URL.createObjectURL(blob);
      },
    });
  }

  return pages;
}
