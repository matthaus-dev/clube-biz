"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";

export function PasswordResetConfirmForm({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: form.get("password"),
          passwordConfirm: form.get("passwordConfirm"),
        }),
      });
      const payload = await response.json() as { error?: string; redirectTo?: string };
      if (!response.ok) return setError(payload.error ?? "Não foi possível redefinir a senha.");
      router.replace(payload.redirectTo ?? "/login");
      router.refresh();
    } catch {
      setError("Não foi possível conectar.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="stack">
        <p className="message error" role="alert">Link inválido ou expirado.</p>
        <nav className="auth-links" aria-label="Solicitar novo link">
          <Link href="/recuperar-senha">Solicitar novo link</Link>
        </nav>
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={submit}>
      <label>Nova senha <span className="input-with-icon"><LockKeyhole size={17} /><input name="password" type="password" autoComplete="new-password" minLength={6} placeholder="Mínimo 6 caracteres" required /></span></label>
      <label>Repetir senha <span className="input-with-icon"><LockKeyhole size={17} /><input name="passwordConfirm" type="password" autoComplete="new-password" minLength={6} placeholder="Repita a senha" required /></span></label>
      <button disabled={loading}>{loading ? "Salvando..." : "Salvar nova senha"}</button>
      <nav className="auth-links" aria-label="Voltar ao login">
        <Link href="/login">Voltar para login</Link>
      </nav>
      {error && <p className="message error" role="alert">{error}</p>}
    </form>
  );
}
