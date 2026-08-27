import { redirect } from "next/navigation";
import { ShieldCheck, TicketCheck } from "lucide-react";
import { getCurrentSession } from "@/modules/auth/infrastructure/session";
import { PasswordResetConfirmForm } from "./password-reset-confirm-form";

export default async function PasswordResetConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  if (await getCurrentSession()) redirect("/painel");
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <main className="page" id="conteudo">
      <section className="card public-card">
        <div className="brand-lockup"><span className="brand-mark"><TicketCheck size={18} /></span><span className="brand-name">clube-biz</span></div>
        <p className="eyebrow">Nova senha</p>
        <h1>Defina uma nova senha.</h1>
        <p className="muted">Depois da troca, as sessoes abertas deste usuario sao revogadas.</p>
        <PasswordResetConfirmForm token={token} />
        <p className="muted security-note"><ShieldCheck size={15} /> Use uma senha forte e exclusiva.</p>
      </section>
    </main>
  );
}
