"use client";

import { useCallback } from "react";
import { toast } from "sonner";

interface SupabaseErrorLike {
  message: string;
  code?: string;
  details?: string | null;
}

const FRIENDLY_MESSAGES: Record<string, string> = {
  "23505": "That record already exists. Check for duplicates and try again.",
  "23503": "This record is linked to other data and the reference is invalid.",
  "42501": "You don't have permission to do that.",
  P0001: "The database rejected this change.",
};

export function describeSupabaseError(error: SupabaseErrorLike): string {
  if (error.code && FRIENDLY_MESSAGES[error.code]) {
    if (error.code === "P0001") {
      return error.message.replace(/^.*?:\s*/, "") || FRIENDLY_MESSAGES[error.code];
    }
    return FRIENDLY_MESSAGES[error.code];
  }
  return error.message || "Something went wrong. Please try again.";
}

export function useToastError() {
  return useCallback((title: string, error: SupabaseErrorLike) => {
    toast.error(title, { description: describeSupabaseError(error) });
  }, []);
}
