"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettings } from "./settings-context";
import { updateUserSettingsAction } from "@/app/settings/actions";
import { useRouter } from "next/navigation";

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const QUOTA_PRESETS = [
  { label: "1 GB", value: 1 },
  { label: "5 GB", value: 5 },
  { label: "10 GB", value: 10 },
  { label: "20 GB", value: 20 },
];

const DELAY_PRESETS = [
  { label: "1 second", value: 1 },
  { label: "2 seconds", value: 2 },
  { label: "5 seconds", value: 5 },
  { label: "10 seconds", value: 10 },
];

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const { settings, updateSettings } = useSettings();

  // Local Form States
  const [quotaPreset, setQuotaPreset] = useState<string>("10");
  const [customQuota, setCustomQuota] = useState<string>("10");

  const [delayPreset, setDelayPreset] = useState<string>("1.5");
  const [customDelay, setCustomDelay] = useState<string>("1.5");

  const [fontFamily, setFontFamily] = useState<"sans" | "serif" | "mono">("sans");
  const [cardAspect, setCardAspect] = useState<string>("VIDEO");

  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Initialize form state from settings context
  useEffect(() => {
    if (!isOpen || !settings) return;

    // 1. Quota
    const currentQuotaGb = settings.quotaLimit / (1024 * 1024 * 1024);
    const isQuotaPreset = QUOTA_PRESETS.some((p) => p.value === currentQuotaGb);
    if (isQuotaPreset) {
      setQuotaPreset(String(currentQuotaGb));
    } else {
      setQuotaPreset("custom");
      setCustomQuota(String(currentQuotaGb));
    }

    // 2. Autosave delay
    const currentDelaySec = settings.autosaveDelay / 1000;
    const isDelayPreset = DELAY_PRESETS.some((p) => p.value === currentDelaySec);
    if (isDelayPreset) {
      setDelayPreset(String(currentDelaySec));
    } else {
      setDelayPreset("custom");
      setCustomDelay(String(currentDelaySec));
    }

    // 3. Font family
    setFontFamily(settings.defaultNoteFont);

    // 4. File Card Aspect
    if (settings.fileCardAspect) {
      setCardAspect(settings.fileCardAspect);
    }
    setErrorMsg("");
  }, [isOpen, settings]);

  // Handle outside clicks to close
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setErrorMsg("");

    const quotaGb = quotaPreset === "custom" ? parseFloat(customQuota) : parseFloat(quotaPreset);
    if (isNaN(quotaGb) || quotaGb < 1) {
      setErrorMsg("Quota limit must be at least 1 GB.");
      setIsPending(false);
      return;
    }

    const delaySec = delayPreset === "custom" ? parseFloat(customDelay) : parseFloat(delayPreset);
    if (isNaN(delaySec) || delaySec < 0.5 || delaySec > 10) {
      setErrorMsg("Autosave delay must be between 0.5 and 10 seconds.");
      setIsPending(false);
      return;
    }

    const formData = new FormData();
    formData.append("quotaLimitGb", String(quotaGb));
    formData.append("autosaveDelaySec", String(delaySec));
    formData.append("defaultNoteFont", fontFamily);
    formData.append("fileCardAspect", cardAspect);

    try {
      const res = await updateUserSettingsAction(formData);
      if (res.ok) {
        updateSettings({
          quotaLimit: quotaGb * 1024 * 1024 * 1024,
          autosaveDelay: Math.round(delaySec * 1000),
          defaultNoteFont: fontFamily,
          fileCardAspect: cardAspect as "VIDEO" | "PORTRAIT" | "SQUARE",
        });
        onClose();
        router.refresh();
      } else {
        setErrorMsg(res.error ?? "Failed to save settings.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("An error occurred while saving.");
    } finally {
      setIsPending(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div
        ref={modalRef}
        className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-xl border border-slate-800 bg-[#171a20] shadow-2xl flex flex-col justify-between text-slate-100"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 shrink-0">
          <h2 className="text-base font-semibold tracking-wide">Settings</h2>
          <Button
            aria-label="Close settings"
            className="h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-slate-100 rounded-lg"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-6">
          {errorMsg && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/25 px-4 py-2.5 text-sm text-rose-400">
              {errorMsg}
            </div>
          )}

          {/* Storage settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-300">Storage Quota</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                aria-label="Storage quota preset"
                value={quotaPreset}
                onChange={(e) => {
                  setQuotaPreset(e.target.value);
                  if (e.target.value !== "custom") {
                    setCustomQuota(e.target.value);
                  }
                }}
                className="flex h-9 w-full rounded-md border border-slate-800 bg-[#111318] px-3 py-1 text-sm text-slate-100 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-slate-700"
              >
                {QUOTA_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
                <option value="custom">Custom...</option>
              </select>

              {quotaPreset === "custom" && (
                <div className="flex items-center gap-2">
                  <Input
                    aria-label="Custom storage quota in GB"
                    type="number"
                    min="1"
                    step="any"
                    value={customQuota}
                    onChange={(e) => setCustomQuota(e.target.value)}
                    className="h-9 bg-[#111318] border-slate-800 focus-visible:ring-1"
                    placeholder="Enter limit"
                    required
                  />
                  <span className="text-sm text-slate-400">GB</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Set the total storage space available for uploaded media attachments in your vault.
            </p>
          </div>

          {/* Note Editor settings */}
          <div className="space-y-4 border-t border-slate-800 pt-5">
            <h3 className="text-sm font-medium text-slate-300">Note Editor Preferences</h3>

            {/* Autosave delay */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium">Autosave Delay</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  aria-label="Autosave delay preset"
                  value={delayPreset}
                  onChange={(e) => {
                    setDelayPreset(e.target.value);
                    if (e.target.value !== "custom") {
                      setCustomDelay(e.target.value);
                    }
                  }}
                  className="flex h-9 w-full rounded-md border border-slate-800 bg-[#111318] px-3 py-1 text-sm text-slate-100 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-slate-700"
                >
                  {DELAY_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                  <option value="custom">Custom...</option>
                </select>

                {delayPreset === "custom" && (
                  <div className="flex items-center gap-2">
                    <Input
                      aria-label="Custom autosave delay in seconds"
                      type="number"
                      min="0.5"
                      max="10"
                      step="any"
                      value={customDelay}
                      onChange={(e) => setCustomDelay(e.target.value)}
                      className="h-9 bg-[#111318] border-slate-800 focus-visible:ring-1"
                      placeholder="Seconds"
                      required
                    />
                    <span className="text-sm text-slate-400">sec</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Duration of inactivity before the editor autosaves changes to the database.
              </p>
            </div>

            {/* Editor Font family */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium">Default Font Style</label>
              <select
                aria-label="Note editor default font style"
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value as "sans" | "serif" | "mono")}
                className="flex h-9 w-full rounded-md border border-slate-800 bg-[#111318] px-3 py-1 text-sm text-slate-100 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-slate-700"
              >
                <option value="sans">Sans-serif (Inter)</option>
                <option value="serif">Serif (Georgia)</option>
                <option value="mono">Monospace (Code)</option>
              </select>
              <p className="text-xs text-slate-500">
                Choose the font family to apply cascadingly to the note editor text and headings.
              </p>
            </div>
          </div>

          {/* Files & Media Grid settings */}
          <div className="space-y-4 border-t border-slate-800 pt-5">
            <h3 className="text-sm font-medium text-slate-300">Files & Media Grid</h3>
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium">File Card Aspect Ratio</label>
              <select
                aria-label="File card aspect ratio settings"
                value={cardAspect}
                onChange={(e) => setCardAspect(e.target.value)}
                className="flex h-9 w-full rounded-md border border-slate-800 bg-[#111318] px-3 py-1 text-sm text-slate-100 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-slate-700"
              >
                <option value="VIDEO">Landscape (16:9)</option>
                <option value="PORTRAIT">Portrait (3:4)</option>
                <option value="SQUARE">Square (1:1)</option>
              </select>
              <p className="text-xs text-slate-500">
                Choose the uniform grid height for displaying note and media file cards in folder views.
              </p>
            </div>
          </div>

          {/* Modal Actions Footer */}
          <div className="border-t border-slate-800 pt-4 flex justify-end gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="h-9 border-slate-800 hover:bg-slate-800 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-900/20"
            >
              {isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
