"use client";

import { useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    clearToken();
    router.push("/login");
  };

  return (
    <button type="button" data-testid="logout-button" onClick={handleLogout}>
      Logout
    </button>
  );
}
