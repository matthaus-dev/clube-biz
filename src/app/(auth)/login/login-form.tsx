"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
      if (!response.ok) {
        const message = response.status === 401
          ? "E-mail ou senha incorretos. Tente novamente."
          : payload.error ?? "Não foi possível entrar agora. Tente novamente.";
        return setError(message);
      }
      router.replace(payload.redirectTo ?? "/painel");
      router.refresh();
    } catch {
      setError("Não foi possível entrar agora. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="stack login-form" onSubmit={submit}>
      <label htmlFor="login-email">E-mail <span className="input-with-icon"><Mail size={17} /><input id="login-email" name="email" type="email" autoComplete="username" placeholder="você@empresa.com" required /></span></label>
      <div className="form-field">
        <div className="field-label-row">
          <label htmlFor="login-password">Senha</label>
          <Link href="/recuperar-senha">Esqueci minha senha</Link>
        </div>
        <span className="input-with-icon password-input">
          <LockKeyhole size={17} />
          <input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Sua senha" required />
          <button type="button" className="password-visibility" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
            {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </span>
      </div>
      <div className="form-message-slot" aria-live="polite">
        {error && <p className="message error">{error}</p>}
      </div>
      <button type="submit" disabled={loading} aria-busy={loading}>{loading ? "Entrando..." : "Entrar no painel"}</button>
      <p className="signup-prompt">Ainda não tem uma conta? <Link href="/cadastro">Criar cadastro</Link></p>
    </form>
  );
}
