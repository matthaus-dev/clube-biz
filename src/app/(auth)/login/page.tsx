import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/infrastructure/session";
import { LoginForm } from "./login-form";
import { ShieldCheck, TicketCheck } from "lucide-react";

export default async function LoginPage() {
  if (await getCurrentSession()) redirect("/painel");
  return (
    <main className="page" id="conteudo">
      <section className="card public-card login-card">
        <div className="brand-lockup"><span className="brand-mark"><TicketCheck size={18} /></span><span className="brand-name">clube-biz</span></div>
        <p className="eyebrow">Acesso do lojista</p>
        <h1>Seu clube, em movimento.</h1>
        <p className="muted login-intro">Acompanhe clientes, pontos e recompensas em um só lugar.</p>
        <LoginForm />
        <p className="muted security-note"><ShieldCheck size={15} /> Acesso seguro e exclusivo para sua loja.</p>
      </section>
    </main>
  );
}
