import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "@/app/api/chat/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    folder: {
      findFirst: vi.fn(),
    },
    chatMessage: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("Chat API GET Route Handler", () => {
  const mockUserId = "user-123";
  const mockFolderId = "folder-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 Unauthorized if no active session", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/chat?folderId=folder-123");

    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Unauthorized");
  });

  it("should return 400 if folderId is missing", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
      expires: "tomorrow",
    });
    const req = new NextRequest("http://localhost/api/chat");

    const res = await GET(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Missing folderId parameter");
  });

  it("should return 403 Forbidden if folder is not owned by the session user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
      expires: "tomorrow",
    });
    vi.mocked(prisma.folder.findFirst).mockResolvedValue(null);

    const req = new NextRequest(`http://localhost/api/chat?folderId=${mockFolderId}`);
    const res = await GET(req);

    expect(res.status).toBe(403);
    expect(await res.text()).toBe("Forbidden");
  });

  it("should return 200 with chat messages when authorized and owns the folder", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
      expires: "tomorrow",
    });
    vi.mocked(prisma.folder.findFirst).mockResolvedValue({
      id: mockFolderId,
      userId: mockUserId,
    } as any);

    const mockMessages = [
      {
        id: "msg-1",
        content: "Hello",
        userId: mockUserId,
        folderId: mockFolderId,
        createdAt: new Date("2026-06-20T09:00:00Z"),
        mediaAssets: [],
        user: { name: "Test User" },
      },
    ];
    vi.mocked(prisma.chatMessage.findMany).mockResolvedValue(mockMessages as any);

    const req = new NextRequest(`http://localhost/api/chat?folderId=${mockFolderId}`);
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(JSON.parse(JSON.stringify(mockMessages)));
  });
});

describe("Chat API POST Route Handler", () => {
  const mockUserId = "user-123";
  const mockFolderId = "folder-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 Unauthorized if no active session", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ content: "test", folderId: mockFolderId }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 400 if folderId is missing", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
      expires: "tomorrow",
    });
    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ content: "test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Missing folderId parameter");
  });

  it("should return 400 if both content and media assets are missing/empty", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
      expires: "tomorrow",
    });
    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ folderId: mockFolderId }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Message content or media is required");
  });

  it("should return 403 Forbidden if folder is not owned by user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
      expires: "tomorrow",
    });
    vi.mocked(prisma.folder.findFirst).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ content: "hello", folderId: mockFolderId }),
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
    expect(await res.text()).toBe("Forbidden");
  });

  it("should return 201 with created message when successful", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
      expires: "tomorrow",
    });
    vi.mocked(prisma.folder.findFirst).mockResolvedValue({
      id: mockFolderId,
      userId: mockUserId,
    } as any);

    const mockCreatedMessage = {
      id: "msg-123",
      content: "hello",
      userId: mockUserId,
      folderId: mockFolderId,
      mediaAssets: [],
    };
    vi.mocked(prisma.chatMessage.create).mockResolvedValue(mockCreatedMessage as any);

    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ content: "hello", folderId: mockFolderId }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toEqual(mockCreatedMessage);
    expect(prisma.chatMessage.create).toHaveBeenCalledWith({
      data: {
        content: "hello",
        userId: mockUserId,
        folderId: mockFolderId,
        mediaAssets: undefined,
      },
      include: {
        mediaAssets: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  });
});

describe("Chat API DELETE Route Handler", () => {
  const mockUserId = "user-123";
  const mockMessageId = "msg-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 Unauthorized if no active session", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const req = new NextRequest(`http://localhost/api/chat?messageId=${mockMessageId}`, {
      method: "DELETE",
    });

    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("should return 400 if messageId is missing", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
      expires: "tomorrow",
    });
    const req = new NextRequest("http://localhost/api/chat", {
      method: "DELETE",
    });

    const res = await DELETE(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Missing messageId parameter");
  });

  it("should return 404 Not Found if message is not found or not owned by user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
      expires: "tomorrow",
    });
    vi.mocked(prisma.chatMessage.findFirst).mockResolvedValue(null);

    const req = new NextRequest(`http://localhost/api/chat?messageId=${mockMessageId}`, {
      method: "DELETE",
    });
    const res = await DELETE(req);

    expect(res.status).toBe(404);
  });

  it("should return 204 No Content on successful soft delete", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
      expires: "tomorrow",
    });
    vi.mocked(prisma.chatMessage.findFirst).mockResolvedValue({
      id: mockMessageId,
      userId: mockUserId,
    } as any);

    const req = new NextRequest(`http://localhost/api/chat?messageId=${mockMessageId}`, {
      method: "DELETE",
    });
    const res = await DELETE(req);

    expect(res.status).toBe(204);
    expect(prisma.chatMessage.update).toHaveBeenCalledWith({
      where: { id: mockMessageId },
      data: { deletedAt: expect.any(Date) },
    });
  });
});
