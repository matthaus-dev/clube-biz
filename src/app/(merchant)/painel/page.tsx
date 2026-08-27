import Link from "next/link";
import { requireSession } from "@/modules/auth/infrastructure/session";
import { getDashboardMetrics } from "@/modules/merchants/application/dashboard-queries";
import { getEnv } from "@/lib/env";
import { QrAccess } from "./qr-access";
import { ArrowRight, CircleUserRound, Gift, Sparkles, TrendingUp } from "lucide-react";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const session = await requireSession();
  const params = await searchParams;
  const data = await getDashboardMetrics(session.merchantId, Number(params.days ?? 30));
  return (
    <div className="dashboard-stack">
      <header className="dashboard-header"><div className="dashboard-header-copy"><p className="eyebrow">Visão geral</p><h1>Olá, {session.merchantName}</h1><p className="dashboard-subtitle">Acompanhe o ritmo do seu clube e as últimas movimentações.</p></div>
        <nav className="periods" aria-label="Período"><Link className={data.days === 7 ? "active" : ""} href="/painel?days=7">7 dias</Link><Link className={data.days === 30 ? "active" : ""} href="/painel?days=30">30 dias</Link><Link className={data.days === 90 ? "active" : ""} href="/painel?days=90">90 dias</Link></nav>
      </header>
      {!data.campaign && <p className="message error">Nenhuma campanha configurada.</p>}
      {data.campaign?.status === "PAUSED" && <p className="message error">A campanha está pausada. Novos créditos estão bloqueados.</p>}
      {data.qrCode?.publicToken && <QrAccess url={`${getEnv().APP_URL}/r/${data.qrCode.publicToken}`} campaignName={data.qrCode.campaign.name} />}
      <nav className="quick-actions" aria-label="Atalhos do atendimento">
        <Link href="/painel/pontos" aria-label="Abrir novo registro de pontos"><span><Sparkles size={19} /></span><span><strong>Registrar pontos</strong><small>Nova compra no balcão</small></span><ArrowRight size={17} /></Link>
        <Link href="/painel/resgates" aria-label="Abrir confirmação de resgate"><span><Gift size={19} /></span><span><strong>Confirmar resgate</strong><small>Entregar uma recompensa</small></span><ArrowRight size={17} /></Link>
      </nav>
      <section className="metric-grid" aria-label={`Métricas de ${data.days} dias`}>
        <article className="metric"><div className="metric-top"><span>Clientes ativos</span><span className="metric-icon"><CircleUserRound size={19} /></span></div><strong>{data.metrics.activeCustomers}</strong></article>
        <article className="metric"><div className="metric-top"><span>Créditos</span><span className="metric-icon"><TrendingUp size={19} /></span></div><strong>{data.metrics.credits}</strong></article>
        <article className="metric"><div className="metric-top"><span>Resgates</span><span className="metric-icon"><Gift size={19} /></span></div><strong>{data.metrics.redemptions}</strong></article>
        <article className="metric"><div className="metric-top"><span>Pontos emitidos</span><span className="metric-icon"><Sparkles size={19} /></span></div><strong>{data.metrics.pointsIssued}</strong></article>
      </section>
      <section className="panel"><div className="panel-header"><div><p className="eyebrow">Agora</p><h2>Atividade recente</h2></div></div>
        {data.recent.length === 0 ? <p className="muted">Nenhuma movimentação neste período.</p> : (
          <div className="table-wrap"><table className="responsive-table"><thead><tr><th>Data</th><th>Tipo</th><th>Origem</th><th>Pontos</th><th>Ator</th></tr></thead>
            <tbody>{data.recent.map((item) => <tr key={item.id}><td data-label="Data">{item.createdAt.toLocaleString("pt-BR", { timeZone: session.timezone })}</td><td data-label="Tipo"><span className="status-pill">{item.type}</span></td><td data-label="Origem">{item.source}</td><td data-label="Pontos" className={item.pointsDelta >= 0 ? "points-positive" : "points-negative"}>{item.pointsDelta > 0 ? "+" : ""}{item.pointsDelta}</td><td data-label="Ator">{item.actorMerchantUser?.emailNormalized ?? "Cliente"}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
