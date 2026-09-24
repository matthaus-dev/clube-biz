import Link from "next/link";
import { BalanceForm } from "./balance-form";
import { TicketCheck } from "lucide-react";

export default function BalancePage() {
  return (
    <main className="page customer-page" id="conteudo">
      <section className="card public-card">
        <div className="brand-lockup"><span className="brand-mark"><TicketCheck size={18} /></span><span className="brand-name">clube-biz</span></div>
        <BalanceForm />
        <nav className="links"><Link href="/">Voltar ao início</Link></nav>
      </section>
    </main>
  );
}
