import { requireSession } from "@/modules/auth/infrastructure/session";
import { ManualCreditForm } from "./manual-credit-form";
import { BadgePlus } from "lucide-react";

export default async function ManualPointsPage() {
  await requireSession();
  return <div className="dashboard-stack"><header className="page-title"><div className="page-title-copy"><p className="eyebrow">Atendimento</p><h1>Registrar pontos</h1><p className="dashboard-subtitle">Localize ou crie o cliente pelo celular. O lançamento ficará associado ao seu usuário.</p></div><span className="page-title-icon"><BadgePlus size={23} /></span></header><ManualCreditForm /></div>;
}
