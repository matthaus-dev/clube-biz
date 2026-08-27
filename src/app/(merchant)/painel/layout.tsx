import { BadgeCheck, TicketCheck } from "lucide-react";
import { requireSession } from "@/modules/auth/infrastructure/session";
import { can } from "@/modules/auth/domain/permissions";
import { LogoutButton } from "./logout-button";
import { DashboardNav } from "./dashboard-nav";

export default async function MerchantLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><span className="brand-mark"><TicketCheck size={19} /></span><span className="sidebar-brand-copy"><strong>{session.merchantName}</strong><span>painel clube-biz</span></span></div>
        <DashboardNav showSettings={can(session.role, "campaign:update")} />
        <div className="sidebar-footer"><small><BadgeCheck size={13} /> {session.email}<br />{session.role}</small><LogoutButton /></div>
      </aside>
      <main className="dashboard-main" id="conteudo">{children}</main>
    </div>
  );
}
