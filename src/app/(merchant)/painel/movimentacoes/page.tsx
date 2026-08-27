import { requireSession } from "@/modules/auth/infrastructure/session";
import { can } from "@/modules/auth/domain/permissions";
import { listMerchantTransactions } from "@/modules/merchants/application/dashboard-queries";
import { ReverseButton } from "./reverse-button";
import { Filter, History, ReceiptText } from "lucide-react";

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ type?: string; source?: string; from?: string; to?: string }> }) {
  const session = await requireSession();
  const params = await searchParams;
  const rows = await listMerchantTransactions(session.merchantId, {
    type: params.type, source: params.source,
    from: params.from ? new Date(`${params.from}T00:00:00`) : undefined,
    to: params.to ? new Date(`${params.to}T23:59:59.999`) : undefined,
  });
  return <div className="dashboard-stack"><header className="page-title"><div className="page-title-copy"><p className="eyebrow">Auditoria</p><h1>Movimentações</h1><p className="dashboard-subtitle">Um registro completo e rastreável de pontos e resgates.</p></div><span className="page-title-icon"><ReceiptText size={23} /></span></header>
    <form className="filter-bar"><select name="type" defaultValue={params.type ?? ""} aria-label="Tipo"><option value="">Todos os tipos</option><option>EARN</option><option>REDEEM</option><option>REVERSAL</option><option>ADJUSTMENT</option></select><select name="source" defaultValue={params.source ?? ""} aria-label="Origem"><option value="">Todas as origens</option><option>STATIC_QR</option><option>MANUAL</option></select><input type="date" name="from" defaultValue={params.from} aria-label="Data inicial" /><input type="date" name="to" defaultValue={params.to} aria-label="Data final" /><button><Filter size={17} /> Filtrar</button></form>
    <section className="panel"><div className="panel-header"><div><p className="eyebrow">Histórico</p><h2>Lançamentos encontrados</h2></div></div>{rows.length === 0 ? <div className="empty-state"><span className="empty-state-icon"><History size={22} /></span><p>Nenhuma movimentação encontrada.</p></div> : <div className="table-wrap"><table className="responsive-table"><thead><tr><th>Data</th><th>Cliente</th><th>Tipo</th><th>Origem</th><th>Pontos</th><th>Ator</th><th></th></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td data-label="Data">{item.createdAt.toLocaleString("pt-BR", { timeZone: session.timezone })}</td><td data-label="Cliente">{item.phoneMasked}</td><td data-label="Tipo"><span className="status-pill">{item.type}</span></td><td data-label="Origem">{item.source}</td><td data-label="Pontos" className={item.pointsDelta >= 0 ? "points-positive" : "points-negative"}>{item.pointsDelta > 0 ? "+" : ""}{item.pointsDelta}</td><td data-label="Ator">{item.actorMerchantUser?.emailNormalized ?? "Cliente"}</td><td className="table-action">{can(session.role, "points:reverse") && item.type !== "REVERSAL" && <ReverseButton transactionId={item.id} />}</td></tr>)}</tbody></table></div>}</section>
  </div>;
}
