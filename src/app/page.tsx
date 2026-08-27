import Link from "next/link";
import { ArrowRight, Check, QrCode, TicketCheck, WalletCards } from "lucide-react";

export default function HomePage() {
  return (
    <main className="page public-home" id="conteudo">
      <section className="home-shell">
        <div className="home-copy">
          <div className="brand-lockup">
            <span className="brand-mark"><TicketCheck size={19} /></span>
            <span className="brand-name">clube-biz</span>
          </div>
          <span className="public-badge"><span /> Sem aplicativo. Sem complicação.</span>
          <h1>Seu café de sempre.<br /><em>Uma surpresa a caminho.</em></h1>
          <p className="home-lead">Cada visita fica mais perto de uma recompensa. Pontue pelo QR do estabelecimento e acompanhe tudo pelo celular.</p>
          <nav className="hero-actions" aria-label="Ações principais">
            <div className="action-tile">
              <span className="action-tile-icon"><QrCode size={20} /></span>
              <span><strong>Escaneie o QR da loja</strong><small>O código fica no balcão ou no seu pedido.</small></span>
            </div>
            <Link className="action-tile action-link" href="/saldo">
              <span className="action-tile-icon accent"><WalletCards size={20} /></span>
              <span><strong>Consultar meus pontos</strong><small>Confirme seu celular e veja o saldo.</small></span>
              <ArrowRight size={18} />
            </Link>
          </nav>
        </div>
        <aside className="loyalty-pass" aria-label="Exemplo de cartão fidelidade">
          <div className="pass-top"><span>SEU CARTÃO</span><TicketCheck size={20} /></div>
          <div><p>Você já está perto.</p><strong>7 de 10</strong><small>pontos para o próximo mimo</small></div>
          <div className="stamp-grid" aria-hidden="true">
            {Array.from({ length: 10 }, (_, index) => (
              <span className={index < 7 ? "stamped" : ""} key={index}>
                {index < 7 && <Check size={15} strokeWidth={3} />}
              </span>
            ))}
          </div>
          <footer><span>RECOMPENSA</span><strong>Café + sobremesa</strong></footer>
        </aside>
      </section>
    </main>
  );
}
