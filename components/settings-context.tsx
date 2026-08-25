"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type UserSettingsData = {
  quotaLimit: number; // in bytes
  autosaveDelay: number; // in ms
  defaultNoteFont: "sans" | "serif" | "mono";
  fileCardAspect: "VIDEO" | "PORTRAIT" | "SQUARE";
};

type SettingsContextType = {
  settings: UserSettingsData;
  updateSettings: (newSettings: Partial<UserSettingsData>) => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings: UserSettingsData;
}) {
  const [settings, setSettings] = useState<UserSettingsData>(initialSettings);

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  const updateSettings = (newSettings: Partial<UserSettingsData>) => {
    setSettings((prev) => ({
      ...prev,
      ...newSettings,
    }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    return {
      settings: {
        quotaLimit: 10 * 1024 * 1024 * 1024, // 10 GB
        autosaveDelay: 1500,
        defaultNoteFont: "sans" as const,
        fileCardAspect: "VIDEO" as const,
      },
      updateSettings: () => {},
    };
  }
  return context;
}
