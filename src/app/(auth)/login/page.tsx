import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/infrastructure/session";
import { LoginForm } from "./login-form";
import { ShieldCheck, TicketCheck } from "lucide-react";

export default async function LoginPage() {
  if (await getCurrentSession()) redirect("/painel");
  return (
    <main className="page" id="conteudo">
      <section className="card public-card">
        <div className="brand-lockup"><span className="brand-mark"><TicketCheck size={18} /></span><span className="brand-name">clube-biz</span></div>
        <p className="eyebrow">Área do parceiro</p>
        <h1>Seu clube, em movimento.</h1>
        <p className="muted">Acompanhe clientes, pontos e recompensas em um só lugar.</p>
        <LoginForm />
        <p className="muted security-note"><ShieldCheck size={15} /> Acesso protegido e isolado por estabelecimento.</p>
      </section>
    </main>
  );
}
