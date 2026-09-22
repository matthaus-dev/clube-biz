"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";

export function PasswordResetRequestForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email") }),
      });
      const payload = await response.json() as { error?: string; message?: string };
      if (!response.ok) return setError(payload.error ?? "Não foi possível solicitar a recuperação.");
      setMessage(payload.message ?? "Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha.");
    } catch {
      setError("Não foi possível conectar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <label>E-mail <span className="input-with-icon"><Mail size={17} /><input name="email" type="email" autoComplete="username" placeholder="você@empresa.com" required /></span></label>
      <button disabled={loading}>{loading ? "Enviando..." : "Enviar link"}</button>
      <nav className="auth-links" aria-label="Voltar ao login">
        <Link href="/login">Voltar para login</Link>
      </nav>
      {message && <p className="message" role="status">{message}</p>}
      {error && <p className="message error" role="alert">{error}</p>}
    </form>
  );
}
