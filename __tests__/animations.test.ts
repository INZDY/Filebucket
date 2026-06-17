import { describe, it, expect } from "vitest";
import { buttonVariants } from "@/components/ui/button";

describe("Tactile Animations", () => {
  it("should have globally configured active-scaling active:scale-95 on buttons", () => {
    const classes = buttonVariants();
    expect(classes).toContain("active:scale-95");
    expect(classes).toContain("transition-all");
    expect(classes).toContain("duration-100");
  });
});
