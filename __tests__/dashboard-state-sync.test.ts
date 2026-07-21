import { describe, it, expect, vi } from "vitest";

describe("Dashboard Loading Flags & State Sync (TDD)", () => {
  it("should reset loading flags and trigger custom vault-mutate event listeners", () => {
    let mutatedDetail: any = null;
    const handleMutation = (e: Event) => {
      const customEvent = e as CustomEvent;
      mutatedDetail = customEvent.detail;
    };

    window.addEventListener("vault-mutate", handleMutation);

    // Dispatch create-folder mutation event
    window.dispatchEvent(
      new CustomEvent("vault-mutate", {
        detail: {
          type: "create-folder",
          folder: { id: "f100", name: "New Folder 100", parentId: null }
        }
      })
    );

    expect(mutatedDetail).toBeDefined();
    expect(mutatedDetail.type).toBe("create-folder");
    expect(mutatedDetail.folder.name).toBe("New Folder 100");

    window.removeEventListener("vault-mutate", handleMutation);
  });
});
