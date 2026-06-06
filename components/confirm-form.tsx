"use client";

import { type ReactNode } from "react";

type ConfirmFormProps = {
  action: (formData: FormData) => void;
  message: string;
  className?: string;
  children: ReactNode;
};

export function ConfirmForm({ action, message, className, children }: ConfirmFormProps) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(e) => {
        if (!confirm(message)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </form>
  );
}
