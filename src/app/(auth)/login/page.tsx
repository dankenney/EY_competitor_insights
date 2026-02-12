import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-xl">
          <div className="mx-auto h-1 w-16 rounded-full bg-[#FFE600]" />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-[#2E2E38]">
              CCaSS Intelligence Engine
            </h1>
            <p className="mt-2 text-sm text-[#747480]">Loading...</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
