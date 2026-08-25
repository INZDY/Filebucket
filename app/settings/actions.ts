"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updateUserSettingsAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized" };
  }

  const userId = session.user.id;

  const quotaLimitGbStr = formData.get("quotaLimitGb");
  const autosaveDelaySecStr = formData.get("autosaveDelaySec");
  const defaultNoteFont = formData.get("defaultNoteFont");
  const fileCardAspect = formData.get("fileCardAspect");

  // Validate Font
  if (defaultNoteFont !== "sans" && defaultNoteFont !== "serif" && defaultNoteFont !== "mono") {
    return { ok: false, error: "Font must be 'sans', 'serif', or 'mono'" };
  }

  // Validate File Card Aspect
  if (fileCardAspect !== "VIDEO" && fileCardAspect !== "PORTRAIT" && fileCardAspect !== "SQUARE") {
    return { ok: false, error: "Card aspect ratio must be 'VIDEO', 'PORTRAIT', or 'SQUARE'" };
  }

  // Validate Quota Limit
  const quotaLimitGb = parseFloat(String(quotaLimitGbStr ?? ""));
  if (isNaN(quotaLimitGb) || quotaLimitGb < 1) {
    return { ok: false, error: "Quota limit must be at least 1 GB" };
  }

  // Validate Autosave Delay
  const autosaveDelaySec = parseFloat(String(autosaveDelaySecStr ?? ""));
  if (isNaN(autosaveDelaySec) || autosaveDelaySec < 0.5 || autosaveDelaySec > 10) {
    return { ok: false, error: "Autosave delay must be between 0.5 and 10 seconds" };
  }

  const quotaLimitBytes = quotaLimitGb * 1024 * 1024 * 1024;
  const autosaveDelayMs = Math.round(autosaveDelaySec * 1000);

  try {
    await prisma.userSettings.upsert({
      where: { userId },
      update: {
        quotaLimit: quotaLimitBytes,
        autosaveDelay: autosaveDelayMs,
        defaultNoteFont,
        fileCardAspect,
      },
      create: {
        userId,
        quotaLimit: quotaLimitBytes,
        autosaveDelay: autosaveDelayMs,
        defaultNoteFont,
        fileCardAspect,
        theme: "dark",
      },
    });

    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("Failed to update user settings:", err);
    return { ok: false, error: "Failed to update user settings in the database" };
  }
}
