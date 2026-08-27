"use client";
import { Check, Copy, ExternalLink, MessageCircle, QrCode } from "lucide-react";
import { useState } from "react";

export function QrAccess({ url, campaignName }: { url: string; campaignName: string }) {
  const [copied, setCopied] = useState(false);
  async function copyLink() { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Participe do ${campaignName}! Acesse pelo link: ${url}`)}`;
  const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=12&data=${encodeURIComponent(url)}`;
  return <section className="qr-access panel" aria-labelledby="qr-access-title"><div className="qr-access-copy"><p className="eyebrow">Atalho para o cliente</p><h2 id="qr-access-title">Seu QR Code esta pronto</h2><p className="muted">Deixe no balcao ou envie para quem compra pelo WhatsApp.</p><div className="qr-access-actions"><a className="button" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={17} /> WhatsApp</a><button type="button" className="link-button" onClick={copyLink}>{copied ? <Check size={17} /> : <Copy size={17} />} {copied ? "Copiado" : "Copiar link"}</button><a className="link-button" href={url} target="_blank" rel="noreferrer"><ExternalLink size={17} /> Abrir pagina</a></div><code className="qr-url">{url}</code></div><a className="qr-preview" href={url} target="_blank" rel="noreferrer" aria-label="Abrir QR Code"><img src={qrImage} alt="QR Code para o clube de fidelidade" width={200} height={200} /><span><QrCode size={15} /> Toque para testar</span></a></section>;
}
