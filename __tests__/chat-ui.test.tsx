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

  it("should submit the form on Enter key press but insert newline on Shift+Enter", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    let fetchCalled = false;
    global.fetch = vi.fn().mockImplementation((url, init) => {
      if (url === "/api/chat" && init?.method === "POST") {
        fetchCalled = true;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: "msg-2",
            content: "hello",
            userId: mockUserId,
            folderId: mockChannel.id,
            createdAt: new Date().toISOString(),
            mediaAssets: [],
            user: { name: "Test User", email: "test@example.com" }
          }),
        } as any);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as any);
    });

    await act(async () => {
      root.render(
        <ChatWorkspace
          activeChannel={mockChannel}
          sessionUserId={mockUserId}
          chatRootId={mockChatRootId}
        />
      );
    });

    const textarea = container.querySelector("textarea");
    expect(textarea).not.toBeNull();

    // Simulate typing text
    await act(async () => {
      const nativeValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      nativeValueSetter?.call(textarea, "hello");
      textarea!.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Simulate Shift+Enter keydown
    const shiftEnterEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    await act(async () => {
      textarea!.dispatchEvent(shiftEnterEvent);
    });
    
    // Shift+Enter should NOT have triggered the submit fetch
    expect(fetchCalled).toBe(false);

    // Simulate Enter keydown (desktop submit)
    const enterEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      shiftKey: false,
      bubbles: true,
      cancelable: true,
    });
    
    // Mock window.innerWidth to be desktop (>= 640px)
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });

    await act(async () => {
      textarea!.dispatchEvent(enterEvent);
    });

    // Restore innerWidth
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: originalInnerWidth });

    // Enter without Shift on desktop should trigger form submit
    expect(fetchCalled).toBe(true);

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});
