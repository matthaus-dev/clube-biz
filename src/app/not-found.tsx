import Link from "next/link";
import { CircleOff, TicketCheck } from "lucide-react";

export default function NotFoundPage() {
  return (
    <main className="page" id="conteudo">
      <section className="card public-card">
        <div className="brand-lockup"><span className="brand-mark"><TicketCheck size={18} /></span><span className="brand-name">clube-biz</span></div>
        <span className="empty-state-icon"><CircleOff size={23} /></span>
        <h1>Código indisponível</h1>
        <p className="muted">Confira o QR Code ou peça ajuda ao estabelecimento.</p>
        <Link href="/">Voltar ao início</Link>
      </section>
    </main>
  );
}
