import { Suspense } from "react";
import RegisterClient from "./register-client";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          …
        </main>
      }
    >
      <RegisterClient />
    </Suspense>
  );
}
