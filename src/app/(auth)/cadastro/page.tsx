import { redirect } from "next/navigation";
import { ShieldCheck, TicketCheck } from "lucide-react";
import { getCurrentSession } from "@/modules/auth/infrastructure/session";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  if (await getCurrentSession()) redirect("/painel");
  return (
    <main className="page" id="conteudo">
      <section className="card public-card">
        <div className="brand-lockup"><span className="brand-mark"><TicketCheck size={18} /></span><span className="brand-name">clube-biz</span></div>
        <p className="eyebrow">Cadastro do lojista</p>
        <h1>Crie seu cartao fidelidade.</h1>
        <p className="muted">Informe os dados do cartao e o acesso do responsavel pela loja.</p>
        <RegisterForm />
        <p className="muted security-note"><ShieldCheck size={15} /> Lojistas novos entram ativos com papel de proprietario.</p>
      </section>
    </main>
  );
}
