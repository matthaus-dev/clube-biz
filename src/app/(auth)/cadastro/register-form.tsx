"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gift, LockKeyhole, Mail, Store, UserRound } from "lucide-react";

const rewardGoals = [2, 4, 6, 8, 10, 12];

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
      if (!response.ok) return setError(payload.error ?? "Não foi possível criar o cadastro.");
      router.replace(payload.redirectTo ?? "/painel");
      router.refresh();
    } catch {
      setError("Não foi possível conectar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="stack register-wizard" onSubmit={step === 2 ? submit : nextStep}>
      <ol className="wizard-progress" aria-label="Progresso do cadastro">
        <li className={step === 1 ? "current" : "complete"} aria-current={step === 1 ? "step" : undefined}>
          <span className="wizard-step-number">1</span>
          <span className="wizard-step-copy"><small>Etapa 1</small><strong>Sua loja</strong></span>
        </li>
        <li className="wizard-progress-line" aria-hidden="true" />
        <li className={step === 2 ? "current" : ""} aria-current={step === 2 ? "step" : undefined}>
          <span className="wizard-step-number">2</span>
          <span className="wizard-step-copy"><small>Etapa 2</small><strong>Seu acesso</strong></span>
        </li>
      </ol>
      <div className="auth-section" hidden={step !== 1}>
        <p className="eyebrow">Dados do cartão</p>
        <label>
          Nome exibido no cartão
          <span className="input-with-icon"><Store size={17} /><input name="publicName" autoComplete="organization" placeholder="Ex.: Cafeteria Central" aria-describedby="public-name-help" required={step === 1} /></span>
          <span className="field-help" id="public-name-help">É assim que sua loja aparecerá para os clientes.</span>
        </label>
        <label>
          Recompensa
          <span className="input-with-icon"><Gift size={17} /><input name="rewardText" placeholder="Ex.: Café grátis" required={step === 1} /></span>
        </label>
        <fieldset className="reward-goal-field">
          <legend>Pontos necessários</legend>
          <div className="reward-goal-options">
            {rewardGoals.map((goal) => (
              <label className="point-option" key={goal}>
                <input name="rewardGoal" type="radio" value={goal} defaultChecked={goal === 10} required={step === 1} />
                <span>{goal}</span>
              </label>
            ))}
          </div>
          <p className="field-help">Quantos pontos o cliente precisa juntar para ganhar a recompensa.</p>
        </fieldset>
      </div>
      <div className="auth-section" hidden={step !== 2}>
        <p className="eyebrow">Usuário lojista</p>
        <label>Nome <span className="input-with-icon"><UserRound size={17} /><input name="ownerName" autoComplete="name" placeholder="Seu nome" required={step === 2} /></span></label>
        <label>E-mail <span className="input-with-icon"><Mail size={17} /><input name="email" type="email" autoComplete="username" placeholder="você@empresa.com" required={step === 2} /></span></label>
        <label>Senha <span className="input-with-icon"><LockKeyhole size={17} /><input name="password" type="password" autoComplete="new-password" minLength={6} placeholder="Mínimo 6 caracteres" required={step === 2} /></span></label>
        <label>Repetir senha <span className="input-with-icon"><LockKeyhole size={17} /><input name="passwordConfirm" type="password" autoComplete="new-password" minLength={6} placeholder="Repita a senha" required={step === 2} /></span></label>
      </div>
      <div className="wizard-actions">{step === 2 && <button type="button" className="link-button" onClick={() => setStep(1)}>Voltar</button>}<button disabled={loading}>{step === 1 ? "Continuar para seu acesso" : loading ? "Criando..." : "Criar cadastro"}</button></div>
      <nav className="auth-links" aria-label="Voltar ao login">
        <Link href="/login">Já tenho uma conta</Link>
      </nav>
      {error && <p className="message error" role="alert">{error}</p>}
    </form>
  );
}
