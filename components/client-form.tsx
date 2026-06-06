"use client";

import { type ReactNode } from "react";

type ClientFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  className?: string;
  children: ReactNode;
};

export function ClientForm({ action, className, children }: ClientFormProps) {
  return (
    <form action={action} className={className}>
      {children}
    </form>
  );
}
