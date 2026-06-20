import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/export/route";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storageEngine } from "@/lib/storage";
import JSZip from "jszip";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    folder: {
      findMany: vi.fn(),
    },
    note: {
      findMany: vi.fn(),
    },
    mediaAsset: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/storage", () => ({
  storageEngine: {
    presignUploadUrl: vi.fn(),
    downloadFile: vi.fn(),
    deleteFile: vi.fn(),
  },
}));

const OriginalResponse = global.Response;
class MockResponse extends OriginalResponse {
  private _rawBody: any;
  constructor(body: any, init?: any) {
    super(body, init);
    this._rawBody = body;
  }
  async arrayBuffer() {
    if (this._rawBody && typeof this._rawBody.arrayBuffer === "function") {
      return this._rawBody.arrayBuffer();
    }
    if (this._rawBody && (Buffer.isBuffer(this._rawBody) || this._rawBody instanceof Uint8Array)) {
      return this._rawBody.buffer.slice(
        this._rawBody.byteOffset,
        this._rawBody.byteOffset + this._rawBody.byteLength
      );
    }
    return super.arrayBuffer();
  }
  async text() {
    if (this._rawBody && typeof this._rawBody === "string") {
      return this._rawBody;
    }
    if (this._rawBody && typeof this._rawBody.text === "function") {
      return this._rawBody.text();
    }
    return super.text();
  }
}
global.Response = MockResponse as any;

describe("ZIP Export Route Handler", () => {
  const mockUserId = "user123";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.R2_BUCKET_NAME = "test-export-bucket";
  });

  it("should return 401 Unauthorized if no active session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const res = await GET(new Request("http://localhost/api/export"));
    expect(res.status).toBe(401);
    const body = await res.text();
    expect(body).toBe("Unauthorized");
  });

  it("should successfully generate a ZIP with correct structure, rewritten paths, and manifest", async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: mockUserId },
      expires: "tomorrow",
    });

    // Mock folders: "Work" in root, "Work" nested in "Work" (no collision), and another sibling "Work" in root (collision)
    const mockFolders = [
      { id: "folder1", name: "Work", parentId: null },
      { id: "folder2", name: "Work", parentId: "folder1" }, // nested child: Work/Work
      { id: "folder3", name: "Work", parentId: null }, // sibling collision in root -> Work 2
    ];

    // Mock notes:
    // 1. A note in Work/Work. Title: "Plan"
    // 2. A note in Root. Title: "Plan"
    // 3. A note in Work. Title: "CollidingNote"
    // 4. Another note in Work. Title: "CollidingNote" (should get suffix)
    const mockNotes = [
      {
        id: "note1",
        title: "Plan",
        body: "Hello world. Here is an image: ![1.00](filebucket-media:media1) and a link: [pdf link](filebucket-media:media2)",
        folderId: "folder2", // lives in folder2 (Work/Work)
        tags: [{ tag: { name: "Personal" } }],
      },
      {
        id: "note2",
        title: "Plan",
        body: "Root plan note",
        folderId: null,
        tags: [],
      },
      {
        id: "note3",
        title: "CollidingNote",
        body: "First colliding note",
        folderId: "folder1",
        tags: [],
      },
      {
        id: "note4",
        title: "CollidingNote",
        body: "Second colliding note",
        folderId: "folder1",
        tags: [],
      },
    ];

    // Mock media assets:
    // 1. media1: photo.png in folder2 (Work/Work) referenced by note1
    // 2. media2: doc.pdf in root
    // 3. media3: file with name "Work" (no extension) in folder1 -> collides with folder2 name "Work" inside folder1
    const mockMediaAssets = [
      {
        id: "media1",
        filename: "photo.png",
        contentType: "image/png",
        sizeBytes: 100,
        r2Key: "r2-key-photo",
        folderId: "folder2",
      },
      {
        id: "media2",
        filename: "doc.pdf",
        contentType: "application/pdf",
        sizeBytes: 500,
        r2Key: "r2-key-doc",
        folderId: null,
      },
      {
        id: "media3",
        filename: "Work", // collides with child folder folder2 (Work) under folder1
        contentType: "application/octet-stream",
        sizeBytes: 200,
        r2Key: "r2-key-work-2",
        folderId: "folder1",
      },
    ];

    vi.mocked(prisma.folder.findMany).mockResolvedValue(mockFolders as any);
    vi.mocked(prisma.note.findMany).mockResolvedValue(mockNotes as any);
    vi.mocked(prisma.mediaAsset.findMany).mockResolvedValue(mockMediaAssets as any);

    // Mock storageEngine downloadFile
    vi.mocked(storageEngine.downloadFile).mockImplementation(async (key: string) => {
      let text = "dummy content";
      if (key === "r2-key-photo") text = "photo-bytes";
      if (key === "r2-key-doc") text = "pdf-bytes";
      if (key === "r2-key-work-2") text = "work2-bytes";

      const encoder = new TextEncoder();
      return Buffer.from(encoder.encode(text));
    });

    const response = await GET(new Request("http://localhost/api/export"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/zip");
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="filebucket-export.zip"');

    // Parse the generated ZIP using JSZip
    const arrayBuffer = await response.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Check manifest.json exists
    const manifestFile = zip.file("manifest.json");
    expect(manifestFile).not.toBeNull();
    const manifest = JSON.parse(await manifestFile!.async("string"));

    expect(manifest.version).toBe("1.0");
    expect(manifest.folders).toHaveLength(3);
    expect(manifest.folders[0].path).toBe("Work");
    expect(manifest.folders[1].path).toBe("Work/Work");
    expect(manifest.folders[2].path).toBe("Work 2");

    // Verify notes and their paths in the zip
    expect(zip.file("Work/Work/Plan.md")).not.toBeNull();
    expect(zip.file("Plan.md")).not.toBeNull(); // Root plan note
    expect(zip.file("Work/CollidingNote.md")).not.toBeNull();
    expect(zip.file("Work/CollidingNote 2.md")).not.toBeNull(); // Resolved note title collision

    // Verify media files and their paths in the zip
    expect(zip.file("Work/Work/photo.png")).not.toBeNull();
    expect(zip.file("doc.pdf")).not.toBeNull();
    expect(zip.file("Work/Work 2")).not.toBeNull(); // Resolved file-folder collision: Work/Work 2

    // Verify content of Work/Work/Plan.md note and rewritten media references:
    // note1: "Hello world. Here is an image: ![photo.png](photo.png) and a link: [pdf link](../../doc.pdf)"
    const note1Content = await zip.file("Work/Work/Plan.md")!.async("string");
    expect(note1Content).toContain("![photo.png](photo.png)");
    expect(note1Content).toContain("[pdf link](../../doc.pdf)");

    // Verify manifest contents match
    expect(manifest.notes).toHaveLength(4);
    const manifestNote1 = manifest.notes.find((n: any) => n.id === "note1");
    expect(manifestNote1.path).toBe("Work/Work/Plan.md");
    expect(manifestNote1.tags).toEqual(["Personal"]);
    expect(manifestNote1.mediaReferences).toEqual(["media1", "media2"]);
  });

  it("should handle S3 download failure gracefully by listing it as failed in manifest and skipping zip insertion", async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: mockUserId },
      expires: "tomorrow",
    });

    vi.mocked(prisma.folder.findMany).mockResolvedValue([]);
    vi.mocked(prisma.note.findMany).mockResolvedValue([]);
    vi.mocked(prisma.mediaAsset.findMany).mockResolvedValue([
      {
        id: "mediafail",
        filename: "broken.jpg",
        contentType: "image/jpeg",
        sizeBytes: 9999,
        r2Key: "r2-key-broken",
        folderId: null,
      },
    ] as any);

    // Mock storageEngine downloadFile throw error
    vi.mocked(storageEngine.downloadFile).mockRejectedValue(new Error("Connection refused"));

    const response = await GET(new Request("http://localhost/api/export"));
    expect(response.status).toBe(200);

    const arrayBuffer = await response.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Verify broken.jpg is NOT in the zip
    expect(zip.file("broken.jpg")).toBeNull();

    // Verify manifest lists the download as failed
    const manifestFile = zip.file("manifest.json");
    const manifest = JSON.parse(await manifestFile!.async("string"));
    const failedMedia = manifest.mediaAssets.find((m: any) => m.id === "mediafail");
    expect(failedMedia.downloadFailed).toBe(true);
  });
});
