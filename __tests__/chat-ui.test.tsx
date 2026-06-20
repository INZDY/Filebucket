import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { ChatWorkspace } from "@/app/vault/chat-workspace";

vi.mock("@/app/media/actions", () => ({
  getPresignedUploadUrlAction: vi.fn(),
  createChatAttachmentAction: vi.fn(),
}));

describe("ChatWorkspace UI Component", () => {
  const mockUserId = "user-123";
  const mockChatRootId = "folder-chat-root";
  const mockChannel = {
    id: "channel-1",
    name: "#general",
    parentId: mockChatRootId,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      } as any)
    );
  });

  it("should render welcome screen if at root (no active channel selected)", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ChatWorkspace
          activeChannel={null}
          sessionUserId={mockUserId}
          chatRootId={mockChatRootId}
        />
      );
    });

    expect(container.textContent).toContain("Welcome to Chat Channels");
    expect(container.textContent).toContain("Select a channel from the sidebar list");

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("should query and render messages when a channel is active", async () => {
    const mockMessages = [
      {
        id: "msg-1",
        content: "Check this cool website: https://example.com",
        userId: "user-999",
        folderId: mockChannel.id,
        createdAt: "2026-06-20T10:00:00.000Z",
        mediaAssets: [
          {
            id: "asset-1",
            filename: "log.txt",
            contentType: "text/plain",
            sizeBytes: 1536,
            r2Key: "attachments/log.txt",
          },
        ],
        user: { name: "Alice", email: "alice@example.com" },
      },
    ];

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes("/api/chat?folderId=")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMessages),
        } as any);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as any);
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ChatWorkspace
          activeChannel={mockChannel}
          sessionUserId={mockUserId}
          chatRootId={mockChatRootId}
        />
      );
    });

    // Check header
    expect(container.textContent).toContain("#general");

    // Check message sender and content
    expect(container.textContent).toContain("Alice");
    expect(container.textContent).toContain("Check this cool website: ");

    // Check hyperlinked anchor tag
    const anchor = container.querySelector("a[href='https://example.com']");
    expect(anchor).not.toBeNull();
    expect(anchor?.textContent).toBe("https://example.com");

    // Check file card
    expect(container.textContent).toContain("log.txt");
    expect(container.textContent).toContain("2 KB");

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});
