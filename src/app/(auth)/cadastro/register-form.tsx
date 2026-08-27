"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gift, LockKeyhole, Mail, Store, UserRound } from "lucide-react";

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  function nextStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const valid = Array.from(event.currentTarget.querySelectorAll("input")).filter((field) => !field.closest("[hidden]")).every((field) => field.checkValidity());
    if (valid) { setError(""); setStep(2); }
    else event.currentTarget.reportValidity();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicName: form.get("publicName"),
          rewardText: form.get("rewardText"),
          rewardGoal: Number(form.get("rewardGoal")),
          ownerName: form.get("ownerName"),
          email: form.get("email"),
          password: form.get("password"),
          passwordConfirm: form.get("passwordConfirm"),
        }),
      });
      const payload = await response.json() as { error?: string; redirectTo?: string };
      if (!response.ok) return setError(payload.error ?? "Nao foi possivel criar o cadastro.");
      router.replace(payload.redirectTo ?? "/painel");
      router.refresh();
    } catch {
      setError("Nao foi possivel conectar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="stack register-wizard" onSubmit={step === 2 ? submit : nextStep}>
      <div className="wizard-progress" aria-label={`Etapa ${step} de 2`}><span className={step >= 1 ? "active" : ""}>1 <small>Sua loja</small></span><i /><span className={step >= 2 ? "active" : ""}>2 <small>Seu acesso</small></span></div>
      <div className="auth-section" hidden={step !== 1}>
        <p className="eyebrow">Cartao fidelidade</p>
        <label>Nome publico <span className="input-with-icon"><Store size={17} /><input name="publicName" autoComplete="organization" placeholder="Cafeteria Central" required={step === 1} /></span></label>
        <label>Texto da recompensa <span className="input-with-icon"><Gift size={17} /><input name="rewardText" placeholder="Cafe gratis" required={step === 1} /></span></label>
    <label>Meta <input name="rewardGoal" type="number" min="2" max="12" step="2" defaultValue="10" required={step === 1} /><span className="compact-note">Escolha 2, 4, 6, 8, 10 ou 12 pontos.</span></label>
      </div>
      <hr hidden={step !== 1} />
      <div className="auth-section" hidden={step !== 2}>
        <p className="eyebrow">Usuario lojista</p>
        <label>Nome <span className="input-with-icon"><UserRound size={17} /><input name="ownerName" autoComplete="name" placeholder="Seu nome" required={step === 2} /></span></label>
        <label>E-mail <span className="input-with-icon"><Mail size={17} /><input name="email" type="email" autoComplete="username" placeholder="voce@empresa.com" required={step === 2} /></span></label>
        <label>Senha <span className="input-with-icon"><LockKeyhole size={17} /><input name="password" type="password" autoComplete="new-password" minLength={12} placeholder="Minimo 12 caracteres" required={step === 2} /></span></label>
        <label>Repetir senha <span className="input-with-icon"><LockKeyhole size={17} /><input name="passwordConfirm" type="password" autoComplete="new-password" minLength={12} placeholder="Repita a senha" required={step === 2} /></span></label>
      </div>
      <div className="wizard-actions">{step === 2 && <button type="button" className="link-button" onClick={() => setStep(1)}>Voltar</button>}<button disabled={loading}>{step === 1 ? "Continuar" : loading ? "Criando..." : "Criar cadastro"}</button></div>
      <nav className="auth-links" aria-label="Voltar ao login">
        <Link href="/login">Ja tenho acesso</Link>
      </nav>
      {error && <p className="message error" role="alert">{error}</p>}
    </form>
  );
}
