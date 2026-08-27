import { notFound } from "next/navigation";
import { CircleUserRound, Gift, History, Sparkles, WalletCards } from "lucide-react";
import { requireSession } from "@/modules/auth/infrastructure/session";
import { getMerchantCustomer } from "@/modules/merchants/application/dashboard-queries";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const customer = await getMerchantCustomer(session.merchantId, id);
  if (!customer) notFound();

  return (
    <div className="dashboard-stack">
      <header className="page-title">
        <div className="page-title-copy">
          <p className="eyebrow">Cliente</p>
          <h1>{customer.displayName}</h1>
          <p className="dashboard-subtitle">{customer.phoneMasked} - {customer.cpfMasked ?? "CPF nao informado"}</p>
        </div>
        <span className="page-title-icon"><CircleUserRound size={23} /></span>
      </header>
      <section className="metric-grid">
        <article className="metric"><div className="metric-top"><span>Saldo</span><span className="metric-icon"><WalletCards size={19} /></span></div><strong>{customer.balance}</strong></article>
        <article className="metric"><div className="metric-top"><span>Acumulados</span><span className="metric-icon"><Sparkles size={19} /></span></div><strong>{customer.lifetimeEarned}</strong></article>
        <article className="metric"><div className="metric-top"><span>Resgatados</span><span className="metric-icon"><Gift size={19} /></span></div><strong>{customer.lifetimeRedeemed}</strong></article>
      </section>
      <section className="panel"><div className="panel-header"><h2 className="section-heading"><History size={19} /> Historico</h2></div>
        {customer.transactions.length === 0 ? <div className="empty-state"><span className="empty-state-icon"><History size={22} /></span><p>Nenhuma movimentacao para este cliente.</p></div> : <div className="table-wrap"><table className="responsive-table"><thead><tr><th>Data</th><th>Tipo</th><th>Origem</th><th>Pontos</th><th>Motivo</th></tr></thead><tbody>
          {customer.transactions.map((item) => <tr key={item.id}><td data-label="Data">{item.createdAt.toLocaleString("pt-BR", { timeZone: session.timezone })}</td><td data-label="Tipo"><span className="status-pill">{item.type}</span></td><td data-label="Origem">{item.source}</td><td data-label="Pontos" className={item.pointsDelta >= 0 ? "points-positive" : "points-negative"}>{item.pointsDelta > 0 ? "+" : ""}{item.pointsDelta}</td><td data-label="Motivo">{item.reasonCode ?? "-"}</td></tr>)}
        </tbody></table></div>}
      </section>
    </div>
  );
}
