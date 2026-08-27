"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesCombined, CircleUserRound, Gift, History, Settings2, Sparkles } from "lucide-react";

const items = [
  { href: "/painel", label: "Visão geral", icon: ChartNoAxesCombined, exact: true },
  { href: "/painel/clientes", label: "Clientes", icon: CircleUserRound },
  { href: "/painel/movimentacoes", label: "Movimentações", icon: History },
  { href: "/painel/pontos", label: "Registrar pontos", icon: Sparkles },
  { href: "/painel/resgates", label: "Resgates", icon: Gift },
];

export function DashboardNav({ showSettings }: { showSettings: boolean }) {
  const pathname = usePathname();
  const links = showSettings ? [...items, { href: "/painel/configuracoes", label: "Configurações", icon: Settings2 }] : items;
  return <nav aria-label="Navegação do painel">{links.map((item) => {
    const active = "exact" in item && item.exact ? pathname === item.href : pathname.startsWith(item.href);
    const Icon = item.icon;
    return <Link className={`nav-link ${active ? "active" : ""}`} href={item.href} key={item.href} aria-current={active ? "page" : undefined}><Icon size={18} strokeWidth={2} /><span>{item.label}</span></Link>;
  })}</nav>;
}
