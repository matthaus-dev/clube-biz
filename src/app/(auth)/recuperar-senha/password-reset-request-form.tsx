"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, MailCheck } from "lucide-react";

export function PasswordResetRequestForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (message) successHeadingRef.current?.focus();
  }, [message]);

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
      setError("Não foi possível solicitar a recuperação agora. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (message) {
    return (
      <section className="reset-success" aria-labelledby="reset-success-title">
        <span className="reset-success-icon" aria-hidden="true"><MailCheck size={24} /></span>
        <div>
          <p className="eyebrow">Solicitação enviada</p>
          <h2 id="reset-success-title" ref={successHeadingRef} tabIndex={-1}>Confira seu e-mail</h2>
          <p className="muted">{message}</p>
          <p className="reset-success-help">Confira também sua caixa de spam ou lixo eletrônico.</p>
        </div>
        <Link className="reset-primary-link" href="/login"><ArrowLeft size={17} aria-hidden="true" /> Voltar ao login</Link>
        <button type="button" className="reset-retry" onClick={() => { setMessage(""); setError(""); }}>Usar outro e-mail</button>
      </section>
    );
  }

  return (
    <form className="stack password-reset-form" onSubmit={submit}>
      <p className="muted password-reset-intro">Informe o e-mail que você usa para entrar no painel. Se encontrarmos uma conta, enviaremos as instruções.</p>
      <label htmlFor="reset-email">E-mail <span className="input-with-icon"><Mail size={17} /><input id="reset-email" name="email" type="email" autoComplete="username" placeholder="você@empresa.com" required /></span></label>
      <div className="form-message-slot" aria-live="polite">
        {error && <p className="message error">{error}</p>}
      </div>
      <button type="submit" disabled={loading} aria-busy={loading}>{loading ? "Enviando..." : "Enviar link de redefinição"}</button>
      <nav className="reset-back" aria-label="Voltar ao login">
        <Link href="/login"><ArrowLeft size={16} aria-hidden="true" /> Voltar ao login</Link>
      </nav>
    </form>
  );
}
