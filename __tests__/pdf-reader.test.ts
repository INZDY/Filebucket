import { describe, it, expect, vi, beforeEach } from "vitest";

const { getDocumentMock, getPageMock } = vi.hoisted(() => ({
  getDocumentMock: vi.fn(),
  getPageMock: vi.fn(),
}));

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: getDocumentMock,
}));

import { parsePdfDocument } from "@/lib/pdf";

describe("parsePdfDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    HTMLCanvasElement.prototype.toBlob = function toBlob(callback) {
      callback(new Blob(["page"], { type: "image/png" }));
    };

    global.URL.createObjectURL = vi.fn(() => "blob:pdf-page");

    getDocumentMock.mockReturnValue({
      promise: Promise.resolve({ numPages: 2, getPage: getPageMock }),
    });
    getPageMock.mockImplementation(async (pageNumber: number) => ({
      getViewport: ({ scale }: { scale: number }) => ({
        width: 100 * scale,
        height: 140 * scale,
      }),
      render: vi.fn(() => ({ promise: Promise.resolve() })),
    }));
  });

  it("exposes one lazily rendered page per PDF page", async () => {
    const pages = await parsePdfDocument("https://example.com/book.pdf");

    expect(getDocumentMock).toHaveBeenCalledWith({ url: "https://example.com/book.pdf" });
    expect(pages).toHaveLength(2);
    expect(pages.map((page) => page.name)).toEqual(["Page 1", "Page 2"]);

    const url = await pages[0].load();

    expect(getPageMock).toHaveBeenCalledWith(1);
    expect(url).toBe("blob:pdf-page");
  });
});
