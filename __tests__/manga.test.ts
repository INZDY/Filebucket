import { describe, it, expect, vi } from "vitest";
import JSZip from "jszip";
import { parseMangaArchive } from "@/lib/manga";

describe("Manga Archive Parser", () => {
  it("should extract, filter, and naturally sort image pages from a ZIP buffer", async () => {
    const zip = new JSZip();
    
    // Add files in scrambled order to test sorting
    zip.file("page_10.png", "img10");
    zip.file("page_2.png", "img2");
    zip.file("page_1.png", "img1");
    zip.file("__MACOSX/page_1.png", "macosx"); // system folder to exclude
    zip.file(".DS_Store", "store"); // system file to exclude
    zip.file("info.txt", "text"); // non-image file to exclude

    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const pages = await parseMangaArchive(buffer);

    expect(pages).toHaveLength(3);
    expect(pages[0].name).toBe("page_1.png");
    expect(pages[1].name).toBe("page_2.png");
    expect(pages[2].name).toBe("page_10.png");

    // Mock global URL.createObjectURL since JSDOM might not implement it
    const originalCreateObjectURL = global.URL.createObjectURL;
    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    
    const blobUrl = await pages[0].load();
    expect(blobUrl).toBe("blob:mock-url");

    global.URL.createObjectURL = originalCreateObjectURL;
  });
});
