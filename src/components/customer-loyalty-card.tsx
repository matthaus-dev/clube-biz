import { Check } from "lucide-react";
import styles from "./customer-loyalty-card.module.css";

export type CustomerCard = {
  merchantName: string;
  campaignName: string;
  rewardTitle: string;
  balance: number;
  rewardThreshold: number;
};

export function CustomerLoyaltyCard({ card }: { card: CustomerCard }) {
  const goal = Math.max(1, card.rewardThreshold);
  const filled = Math.max(0, Math.min(card.balance, goal));
  const remaining = Math.max(0, goal - card.balance);
  return (
    <article className={styles.card} aria-label={`Cartão de ${card.merchantName}`}>
      <header>
        <h2>{card.merchantName}</h2>
        {card.campaignName.trim().toLocaleLowerCase() !== card.merchantName.trim().toLocaleLowerCase() && <p>{card.campaignName}</p>}
      </header>
      <p className={styles.count}><strong>{card.balance}</strong> de {goal} pontos</p>
      <p>{remaining > 0 ? `Falta${remaining === 1 ? "" : "m"} ${remaining} ponto${remaining === 1 ? "" : "s"} para sua recompensa.` : "Você já pode resgatar sua recompensa."}</p>
      {goal <= 12 ? (
        <div className={styles.stamps} role="img" aria-label={`${filled} de ${goal} selos preenchidos`}>
          {Array.from({ length: goal }, (_, index) => <span key={index} className={index < filled ? styles.filled : undefined} aria-hidden="true">{index < filled ? <Check size={22} strokeWidth={3} /> : index + 1}</span>)}
        </div>
      ) : <progress className={styles.progress} value={filled} max={goal} aria-label="Progresso para a recompensa" />}
      <footer><span>Sua recompensa</span><strong>{card.rewardTitle}</strong>{remaining === 0 && <p>Peça o resgate à equipe da loja.</p>}</footer>
    </article>
  );
}
