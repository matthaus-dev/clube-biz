import Link from "next/link";
import { BalanceForm } from "./balance-form";
import { ShieldCheck, TicketCheck } from "lucide-react";

export default function BalancePage() {
  return (
    <main className="page" id="conteudo">
      <section className="card public-card">
        <div className="brand-lockup"><span className="brand-mark"><TicketCheck size={18} /></span><span className="brand-name">clube-biz</span></div>
        <p className="eyebrow">Seus pontos</p>
        <h1>Quanto falta para sua recompensa?</h1>
        <p className="muted"><ShieldCheck size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />Confirme seu celular para consultar o saldo com segurança.</p>
        <BalanceForm />
        <nav className="links"><Link href="/">Voltar ao início</Link></nav>
      </section>
    </main>
  );
}
