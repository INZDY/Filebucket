import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/media/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { storageEngine } from "@/lib/storage";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mediaAsset: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/storage", () => ({
  storageEngine: {
    presignUploadUrl: vi.fn(),
    downloadFile: vi.fn(),
    deleteFile: vi.fn(),
    presignDownloadUrl: vi.fn(),
  },
}));

describe("Media API GET Route Handler", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 Unauthorized if no active session", async () => {
    (vi.mocked(auth) as any).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/media?key=some-key");

    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Unauthorized");
  });

  it("should return 400 if key parameter is missing", async () => {
    (vi.mocked(auth) as any).mockResolvedValue({
      user: { id: mockUserId },
      expires: "tomorrow",
    });
    const req = new NextRequest("http://localhost/api/media");

    const res = await GET(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Missing key parameter");
  });

  it("should return 404 if media asset is not found", async () => {
    (vi.mocked(auth) as any).mockResolvedValue({
      user: { id: mockUserId },
      expires: "tomorrow",
    });
    vi.mocked(prisma.mediaAsset.findUnique).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/media?key=nonexistent-key");

    const res = await GET(req);
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("Not Found");
  });

  it("should return 307 redirect to presigned download URL when authorized and media is found", async () => {
    (vi.mocked(auth) as any).mockResolvedValue({
      user: { id: mockUserId },
      expires: "tomorrow",
    });
    vi.mocked(prisma.mediaAsset.findUnique).mockResolvedValue({
      id: "media-123",
      r2Key: "vaults/user-123/pic.jpg",
      userId: mockUserId,
      contentType: "image/jpeg",
    } as any);
    vi.mocked(storageEngine.presignDownloadUrl).mockResolvedValue("https://r2.cloudflarestorage.com/vaults/user-123/pic.jpg?token=abc");

    const req = new NextRequest("http://localhost/api/media?key=vaults%2Fuser-123%2Fpic.jpg");
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toBe("https://r2.cloudflarestorage.com/vaults/user-123/pic.jpg?token=abc");
    expect(storageEngine.presignDownloadUrl).toHaveBeenCalledWith("vaults/user-123/pic.jpg");
  });

  it("should return the file content as a direct stream if the file is an archive or book", async () => {
    (vi.mocked(auth) as any).mockResolvedValue({
      user: { id: mockUserId },
      expires: "tomorrow",
    });
    vi.mocked(prisma.mediaAsset.findUnique).mockResolvedValue({
      id: "media-123",
      r2Key: "vaults/user-123/book.epub",
      userId: mockUserId,
      contentType: "application/epub+zip",
      filename: "book.epub",
    } as any);
    const mockBuffer = Buffer.from("mock epub content");
    vi.mocked(storageEngine.downloadFile).mockResolvedValue(mockBuffer);

    const req = new NextRequest("http://localhost/api/media?key=vaults%2Fuser-123%2Fbook.epub");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/epub+zip");
    expect(res.headers.get("Content-Length")).toBe(String(mockBuffer.length));
    expect(storageEngine.downloadFile).toHaveBeenCalledWith("vaults/user-123/book.epub");
  });
});
