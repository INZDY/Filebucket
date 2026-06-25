import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
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
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    note: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    mediaAsset: {
      findMany: vi.fn(),
    },
    chatMessage: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/storage", () => ({
  storageEngine: {
    downloadFile: vi.fn(),
  },
}));

// Use MockResponse to get headers / text cleanly in JSDOM/node
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
    if (typeof this._rawBody === "string") return this._rawBody;
    if (this._rawBody && typeof this._rawBody.text === "function") return this._rawBody.text();
    return super.text();
  }
}
global.Response = MockResponse as any;

describe("Contextual Export API GET Route Handler", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSession).mockResolvedValue({
      user: { id: mockUserId },
      expires: "tomorrow",
    } as any);
  });

  describe("Note markdown export", () => {
    it("should export a single note as a raw markdown file", async () => {
      vi.mocked(prisma.note.findFirst).mockResolvedValue({
        id: "note-123",
        title: "Test Note",
        body: "# Test Note\nHello world",
        userId: mockUserId,
      } as any);

      const req = new NextRequest("http://localhost/api/export?noteId=note-123");
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/markdown");
      expect(res.headers.get("Content-Disposition")).toContain('filename="Test Note.md"');
      expect(await res.text()).toBe("# Test Note\nHello world");
    });

    it("should return 404 if the note is not found or not owned by user", async () => {
      vi.mocked(prisma.note.findFirst).mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/export?noteId=note-not-found");
      const res = await GET(req);

      expect(res.status).toBe(404);
      expect(await res.text()).toBe("Note not found");
    });
  });

  describe("Chat channel transcript markdown export", () => {
    it("should export a chat channel messages as formatted markdown", async () => {
      vi.mocked(prisma.folder.findFirst).mockResolvedValue({
        id: "folder-chat-1",
        name: "#general",
        userId: mockUserId,
      } as any);

      const mockMessages = [
        {
          id: "m-1",
          content: "Hello everyone!",
          createdAt: new Date("2026-06-20T10:00:00Z"),
          user: { name: "Alice", email: "alice@example.com" },
          mediaAssets: [],
        },
        {
          id: "m-2",
          content: "Look at this screenshot",
          createdAt: new Date("2026-06-20T10:05:00Z"),
          user: { name: "Bob", email: "bob@example.com" },
          mediaAssets: [
            { id: "asset-1", filename: "sc.png", r2Key: "sc.png" },
          ],
        },
      ];
      vi.mocked(prisma.chatMessage.findMany).mockResolvedValue(mockMessages as any);

      const req = new NextRequest("http://localhost/api/export?chatFolderId=folder-chat-1");
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/markdown");
      expect(res.headers.get("Content-Disposition")).toContain('filename="#general-transcript.md"');

      const text = await res.text();
      expect(text).toContain("# Chat Transcript - #general");
      expect(text).toContain("### Alice - 2026-06-20T10:00:00.000Z");
      expect(text).toContain("Hello everyone!");
      expect(text).toContain("### Bob - 2026-06-20T10:05:00.000Z");
      expect(text).toContain("Look at this screenshot");
      expect(text).toContain("- Attachment: sc.png");
    });

    it("should return 404 if the chat channel is not found or not owned by user", async () => {
      vi.mocked(prisma.folder.findFirst).mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/export?chatFolderId=invalid-chat");
      const res = await GET(req);

      expect(res.status).toBe(404);
      expect(await res.text()).toBe("Chat channel not found");
    });
  });

  describe("Subfolder ZIP export", () => {
    it("should export only the subset folder content recursively as a ZIP", async () => {
      const mockFolders = [
        { id: "folder-target", name: "Travel", parentId: null, userId: mockUserId },
        { id: "folder-child", name: "Photos", parentId: "folder-target", userId: mockUserId },
        { id: "folder-other", name: "Work", parentId: null, userId: mockUserId },
      ];
      const mockNotes = [
        {
          id: "note-in-target",
          title: "Itinerary",
          body: "Trip details",
          folderId: "folder-target",
          userId: mockUserId,
          tags: [],
        },
        {
          id: "note-outside",
          title: "Tasks",
          body: "Job details",
          folderId: "folder-other",
          userId: mockUserId,
          tags: [],
        },
      ];
      const mockMediaAssets = [
        {
          id: "media-in-child",
          filename: "sunset.jpg",
          r2Key: "r2-sunset",
          folderId: "folder-child",
          userId: mockUserId,
        },
        {
          id: "media-outside",
          filename: "logo.png",
          r2Key: "r2-logo",
          folderId: "folder-other",
          userId: mockUserId,
        },
      ];

      vi.mocked(prisma.folder.findFirst).mockResolvedValue(mockFolders[0] as any);
      vi.mocked(prisma.folder.findMany).mockResolvedValue(mockFolders as any);
      vi.mocked(prisma.note.findMany).mockResolvedValue(mockNotes as any);
      vi.mocked(prisma.mediaAsset.findMany).mockResolvedValue(mockMediaAssets as any);

      // Mock storageEngine downloadFile
      vi.mocked(storageEngine.downloadFile).mockResolvedValue(Buffer.from("sunset-bytes") as any);

      const req = new NextRequest("http://localhost/api/export?folderId=folder-target");
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/zip");
      expect(res.headers.get("Content-Disposition")).toContain('filename="Travel.zip"');

      // Load zip
      const arrayBuffer = await res.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      // Verify itinerary and sunset exist in zip, but Tasks and logo don't
      expect(zip.file("Travel/Itinerary.md")).not.toBeNull();
      expect(zip.file("Travel/Photos/sunset.jpg")).not.toBeNull();
      expect(zip.file("Work/Tasks.md")).toBeNull();
      expect(zip.file("Work/logo.png")).toBeNull();

      // Verify manifest contents
      const manifestFile = zip.file("manifest.json");
      expect(manifestFile).not.toBeNull();
      const manifest = JSON.parse(await manifestFile!.async("string"));
      expect(manifest.folders).toHaveLength(2); // Travel, Travel/Photos
      expect(manifest.notes).toHaveLength(1); // Itinerary
      expect(manifest.mediaAssets).toHaveLength(1); // sunset.jpg
    });

    it("should return 404 if the folder is not found or not owned by user", async () => {
      vi.mocked(prisma.folder.findFirst).mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/export?folderId=invalid-folder");
      const res = await GET(req);

      expect(res.status).toBe(404);
      expect(await res.text()).toBe("Folder not found");
    });
  });
});
