"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  return <button className="button-secondary" aria-label="Sair" onClick={async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }}><LogOut size={16} /><span>Sair</span></button>;
}
