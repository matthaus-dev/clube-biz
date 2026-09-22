import Link from "next/link";
import { Search, UsersRound } from "lucide-react";
import { requireSession } from "@/modules/auth/infrastructure/session";
import { listMerchantCustomers } from "@/modules/merchants/application/dashboard-queries";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ cursor?: string; q?: string }> }) {
  const session = await requireSession();
  const params = await searchParams;
  const data = await listMerchantCustomers(session.merchantId, { cursor: params.cursor, search: params.q });

  return (
    <div className="dashboard-stack">
      <header className="page-title">
        <div className="page-title-copy"><p className="eyebrow">Clientes</p><h1>Cartões fidelidade</h1><p className="dashboard-subtitle">Consulte saldos e acompanhe cada relacionamento.</p></div>
        <span className="page-title-icon"><UsersRound size={23} /></span>
      </header>
      <form className="filter-bar"><input name="q" defaultValue={params.q} placeholder="Telefone ou CPF exato" aria-label="Telefone ou CPF" /><button><Search size={17} /> Buscar</button></form>
      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Base ativa</p><h2>Clientes encontrados</h2></div></div>
        {data.customers.length === 0 ? (
          <div className="empty-state"><span className="empty-state-icon"><UsersRound size={22} /></span><p>Nenhum cliente encontrado.</p></div>
        ) : (
          <div className="table-wrap"><table className="responsive-table"><thead><tr><th>Cliente</th><th>Contato</th><th>CPF</th><th>Campanha</th><th>Saldo</th><th></th></tr></thead><tbody>
            {data.customers.map((customer) => <tr key={customer.id}><td data-label="Cliente">{customer.displayName}</td><td data-label="Contato">{customer.phoneMasked}</td><td data-label="CPF">{customer.cpfMasked ?? "-"}</td><td data-label="Campanha">{customer.campaignName}</td><td data-label="Saldo"><strong>{customer.balance}</strong></td><td className="table-action"><Link href={`/painel/clientes/${customer.id}`}>Ver detalhes</Link></td></tr>)}
          </tbody></table></div>
        )}
        {data.nextCursor && <Link className="next-link" href={`/painel/clientes?cursor=${data.nextCursor}${params.q ? `&q=${encodeURIComponent(params.q)}` : ""}`}>Próxima página</Link>}
      </section>
    </div>
  );
}
