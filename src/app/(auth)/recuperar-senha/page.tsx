import { redirect } from "next/navigation";
import { ShieldCheck, TicketCheck } from "lucide-react";
import { getCurrentSession } from "@/modules/auth/infrastructure/session";
import { PasswordResetRequestForm } from "./password-reset-request-form";

export default async function PasswordResetRequestPage() {
  if (await getCurrentSession()) redirect("/painel");
  return (
    <main className="page" id="conteudo">
      <section className="card public-card password-reset-card">
        <div className="brand-lockup"><span className="brand-mark"><TicketCheck size={18} /></span><span className="brand-name">clube-biz</span></div>
        <p className="eyebrow">Recuperar senha</p>
        <h1>Redefina sua senha.</h1>
        <PasswordResetRequestForm />
        <p className="muted security-note"><ShieldCheck size={15} /> Por segurança, o link expira em 30 minutos.</p>
      </section>
    </main>
  );
}
