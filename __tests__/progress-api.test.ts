import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/media/progress/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mediaProgress: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe("Media Progress API (/api/media/progress) - (TDD)", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/media/progress", () => {
    it("should return 401 Unauthorized if no active session", async () => {
      vi.mocked(auth).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/media/progress?mediaAssetId=media-123");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("should return 400 Bad Request if mediaAssetId query param is missing", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId },
        expires: "tomorrow",
      });
      const req = new NextRequest("http://localhost/api/media/progress");
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it("should return null if no progress is found for the media asset", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId },
        expires: "tomorrow",
      });
      vi.mocked(prisma.mediaProgress.findUnique).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/media/progress?mediaAssetId=media-123");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toBeNull();
      expect(prisma.mediaProgress.findUnique).toHaveBeenCalledWith({
        where: {
          userId_mediaAssetId: {
            userId: mockUserId,
            mediaAssetId: "media-123",
          },
        },
      });
    });

    it("should return progress details if found", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId },
        expires: "tomorrow",
      });
      const mockProgress = {
        id: "prog-123",
        userId: mockUserId,
        mediaAssetId: "media-123",
        position: "epubcfi(/6/4[chap-2]!/4/2/10/1:0)",
        percentage: 45.5,
        volumeLevel: 0.8,
        settings: { theme: "sepia" },
      };
      vi.mocked(prisma.mediaProgress.findUnique).mockResolvedValue(mockProgress as any);
      const req = new NextRequest("http://localhost/api/media/progress?mediaAssetId=media-123");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.position).toBe("epubcfi(/6/4[chap-2]!/4/2/10/1:0)");
      expect(json.percentage).toBe(45.5);
    });
  });

  describe("POST /api/media/progress", () => {
    it("should return 401 Unauthorized if no active session", async () => {
      vi.mocked(auth).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/media/progress", {
        method: "POST",
        body: JSON.stringify({ mediaAssetId: "media-123", position: "10", percentage: 5.2 }),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("should return 400 Bad Request if required fields are missing", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId },
        expires: "tomorrow",
      });
      const req = new NextRequest("http://localhost/api/media/progress", {
        method: "POST",
        body: JSON.stringify({ position: "10" }), // missing mediaAssetId and percentage
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("should upsert progress successfully", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId },
        expires: "tomorrow",
      });
      const mockProgress = {
        id: "prog-123",
        userId: mockUserId,
        mediaAssetId: "media-123",
        position: "12",
        percentage: 60.0,
      };
      vi.mocked(prisma.mediaProgress.upsert).mockResolvedValue(mockProgress as any);

      const req = new NextRequest("http://localhost/api/media/progress", {
        method: "POST",
        body: JSON.stringify({
          mediaAssetId: "media-123",
          position: "12",
          percentage: 60.0,
          volumeLevel: 0.5,
          settings: { layout: "paged" },
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(prisma.mediaProgress.upsert).toHaveBeenCalledWith({
        where: {
          userId_mediaAssetId: {
            userId: mockUserId,
            mediaAssetId: "media-123",
          },
        },
        create: {
          userId: mockUserId,
          mediaAssetId: "media-123",
          position: "12",
          percentage: 60.0,
          volumeLevel: 0.5,
          settings: { layout: "paged" },
        },
        update: {
          position: "12",
          percentage: 60.0,
          volumeLevel: 0.5,
          settings: { layout: "paged" },
        },
      });
    });
  });
});
