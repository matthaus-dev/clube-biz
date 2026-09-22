"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const payload = await response.json() as { error?: string; redirectTo?: string };
      if (!response.ok) return setError(payload.error ?? "Credenciais inválidas.");
      router.replace(payload.redirectTo ?? "/painel");
      router.refresh();
    } catch {
      setError("Não foi possível conectar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <label>E-mail <span className="input-with-icon"><Mail size={17} /><input name="email" type="email" autoComplete="username" placeholder="você@empresa.com" required /></span></label>
      <label>Senha <span className="input-with-icon"><LockKeyhole size={17} /><input name="password" type="password" autoComplete="current-password" placeholder="Sua senha" required /></span></label>
      <button disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
      <nav className="auth-links" aria-label="Acesso do lojista">
        <Link href="/recuperar-senha">Recuperar senha</Link>
        <Link href="/cadastro">Criar cadastro</Link>
      </nav>
      {error && <p className="message error" role="alert">{error}</p>}
    </form>
  );
}
