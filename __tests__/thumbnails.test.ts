import { describe, it, expect, vi, beforeAll } from "vitest";
import JSZip from "jszip";
import { extractMangaCover, extractEpubCover, extractPdfCover, extractCoverThumbnail } from "@/lib/thumbnails";

// Mock pdfjs-dist
vi.mock("pdfjs-dist", () => {
  return {
    GlobalWorkerOptions: {
      workerSrc: "",
    },
    version: "4.0.0",
    getDocument: vi.fn().mockReturnValue({
      promise: Promise.resolve({
        getPage: vi.fn().mockReturnValue(
          Promise.resolve({
            getViewport: vi.fn().mockReturnValue({ width: 100, height: 150 }),
            render: vi.fn().mockReturnValue({
              promise: Promise.resolve(),
            }),
          })
        ),
      }),
    }),
  };
});

describe("Client-Side Cover Extraction Utility (TDD)", () => {
  beforeAll(() => {
    // Mock HTMLCanvasElement.toBlob in jsdom
    if (typeof HTMLCanvasElement !== "undefined") {
      HTMLCanvasElement.prototype.toBlob = function (callback) {
        callback(new Blob(["mock-pdf-cover-blob"], { type: "image/png" }));
      };
      
      // Mock getContext if JSDOM is missing a full canvas support
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
        drawImage: vi.fn(),
        fillRect: vi.fn(),
      } as any);
    }

    // Mock DOMParser if running in non-browser env (though JSDOM has it)
    if (typeof DOMParser === "undefined") {
      global.DOMParser = class {
        parseFromString(str: string) {
          return {
            querySelector: () => null,
            getElementById: () => null,
          } as any;
        }
      } as any;
    }
  });

  describe("extractMangaCover", () => {
    it("should extract the first image file alphabetically", async () => {
      const zip = new JSZip();
      zip.file("002_page.jpg", "page2_data");
      zip.file("001_cover.jpg", "cover_data");
      zip.file("003_page.jpg", "page3_data");
      zip.file("unrelated.txt", "text_data");

      const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
      const file = new File([zipBuffer], "manga.cbz", { type: "application/x-cbz" });

      const coverBlob = await extractMangaCover(file);
      expect(coverBlob).not.toBeNull();
      const text = await coverBlob?.text();
      expect(text).toBe("cover_data");
    });

    it("should return null if there are no images in the zip", async () => {
      const zip = new JSZip();
      zip.file("unrelated.txt", "text_data");

      const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
      const file = new File([zipBuffer], "manga.zip", { type: "application/zip" });

      const coverBlob = await extractMangaCover(file);
      expect(coverBlob).toBeNull();
    });
  });

  describe("extractEpubCover", () => {
    it("should parse container.xml & OPF and extract the cover image file", async () => {
      const zip = new JSZip();

      // 1. META-INF/container.xml
      zip.file(
        "META-INF/container.xml",
        `<?xml version="1.0"?>
        <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
          <rootfiles>
            <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
          </rootfiles>
        </container>`
      );

      // 2. OEBPS/content.opf
      zip.file(
        "OEBPS/content.opf",
        `<?xml version="1.0" encoding="utf-8"?>
        <package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uuid_id" version="2.0">
          <metadata>
            <meta name="cover" content="cover-image-id" />
          </metadata>
          <manifest>
            <item id="cover-image-id" href="images/cover.jpg" media-type="image/jpeg" />
          </manifest>
        </package>`
      );

      // 3. OEBPS/images/cover.jpg
      zip.file("OEBPS/images/cover.jpg", "epub_cover_data");

      const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
      const file = new File([zipBuffer], "book.epub", { type: "application/epub+zip" });

      const coverBlob = await extractEpubCover(file);
      expect(coverBlob).not.toBeNull();
      const text = await coverBlob?.text();
      expect(text).toBe("epub_cover_data");
    });

    it("should fall back to properties='cover-image' manifest item if meta tag is missing", async () => {
      const zip = new JSZip();

      zip.file(
        "META-INF/container.xml",
        `<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
          <rootfiles>
            <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
          </rootfiles>
        </container>`
      );

      zip.file(
        "content.opf",
        `<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
          <metadata></metadata>
          <manifest>
            <item id="my-cover" properties="cover-image" href="cover.png" media-type="image/png" />
          </manifest>
        </package>`
      );

      zip.file("cover.png", "epub3_cover_data");

      const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
      const file = new File([zipBuffer], "book3.epub", { type: "application/epub+zip" });

      const coverBlob = await extractEpubCover(file);
      expect(coverBlob).not.toBeNull();
      const text = await coverBlob?.text();
      expect(text).toBe("epub3_cover_data");
    });
  });

  describe("extractPdfCover", () => {
    it("should render the first page to a canvas and return a png blob", async () => {
      const file = new File([new ArrayBuffer(100)], "document.pdf", { type: "application/pdf" });
      const coverBlob = await extractPdfCover(file);
      expect(coverBlob).not.toBeNull();
      expect(coverBlob?.type).toBe("image/png");
      const text = await coverBlob?.text();
      expect(text).toBe("mock-pdf-cover-blob");
    });
  });

  describe("extractCoverThumbnail", () => {
    it("should routing correctly based on file types", async () => {
      // PDF
      const pdfFile = new File([new ArrayBuffer(100)], "document.pdf", { type: "application/pdf" });
      const pdfCover = await extractCoverThumbnail(pdfFile);
      expect(pdfCover).not.toBeNull();
      expect(await pdfCover?.text()).toBe("mock-pdf-cover-blob");

      // ZIP/CBZ (Manga)
      const zip = new JSZip();
      zip.file("cover.jpg", "zip_cover");
      const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
      const cbzFile = new File([zipBuffer], "manga.cbz", { type: "application/x-cbz" });
      const cbzCover = await extractCoverThumbnail(cbzFile);
      expect(cbzCover).not.toBeNull();
      expect(await cbzCover?.text()).toBe("zip_cover");

      // Unsupported
      const txtFile = new File(["hello"], "info.txt", { type: "text/plain" });
      const txtCover = await extractCoverThumbnail(txtFile);
      expect(txtCover).toBeNull();
    });
  });
});
