import { redirect } from "next/navigation";
import { ShieldCheck, TicketCheck } from "lucide-react";
import { getCurrentSession } from "@/modules/auth/infrastructure/session";
import { PasswordResetRequestForm } from "./password-reset-request-form";

export default async function PasswordResetRequestPage() {
  if (await getCurrentSession()) redirect("/painel");
  return (
    <main className="page" id="conteudo">
      <section className="card public-card">
        <div className="brand-lockup"><span className="brand-mark"><TicketCheck size={18} /></span><span className="brand-name">clube-biz</span></div>
        <p className="eyebrow">Recuperar senha</p>
        <h1>Receba um link seguro.</h1>
        <p className="muted">Use o e-mail do seu usuário lojista para redefinir a senha de acesso.</p>
        <PasswordResetRequestForm />
        <p className="muted security-note"><ShieldCheck size={15} /> O link expira em 30 minutos.</p>
      </section>
    </main>
  );
}
