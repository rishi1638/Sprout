"use client";

import { Toaster as Sonner } from "sonner";

function Toaster(props: React.ComponentProps<typeof Sonner>) {
  return (
    <Sonner
      position="top-center"
      toastOptions={{
        classNames: {
          toast: "rounded-lg border border-border bg-surface text-foreground shadow-lg",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
