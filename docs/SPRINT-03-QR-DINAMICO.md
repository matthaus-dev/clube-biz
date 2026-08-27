# Sprint 3 — QR Code dinâmico

## Resultado esperado

O estabelecimento exibe um QR temporário que rotaciona automaticamente. O cliente mantém o mesmo fluxo de identificação e crédito, com menor risco de compartilhamento fora do local.

## Dependências

- Sprint 2 concluída.
- Relógio injetável e serviço central de claim.
- Armazenamento compartilhado para rate limit em produção.

## Decisões antes de implementar

- [ ] Duração do token; padrão provisório de 90 segundos.
- [ ] Sobreposição entre token atual e anterior; sugestão de poucos segundos para tolerar latência.
- [ ] Modelo de atualização da tela: polling simples primeiro; canal em tempo real somente se necessário.
- [ ] Comportamento offline e fallback operacional.

## Histórias

### S3.1 — Emissão temporária

- [ ] Criar caso de uso autenticado para emitir QR dinâmico.
- [ ] Gerar token opaco aleatório e persistir apenas o hash.
- [ ] Definir `validFrom`, `expiresAt`, status e campanha no servidor.
- [ ] Limitar emissão por estabelecimento/tela.
- [ ] Auditar emissão e revogação.

Critérios de aceite:

- token não contém IDs ou PII;
- usuário sem permissão não emite código;
- campanha pausada não emite código utilizável;
- expiração usa relógio do servidor.

### S3.2 — Tela de exibição e rotação

- [ ] Criar página autenticada em modo de exibição.
- [ ] Renderizar QR legível em telas comuns.
- [ ] Renovar antes da expiração sem acumular timers/requisições.
- [ ] Mostrar contagem regressiva e estado de conexão.
- [ ] Revogar ou encerrar emissão ao sair quando aplicável.

Critérios de aceite:

- rotação não exige recarregar a página;
- tela recupera de falha temporária;
- código atual é visualmente distinguível de estado expirado.

### S3.3 — Claim do QR dinâmico

- [ ] Estender resolução de QR por tipo, sem duplicar regras de cliente/ledger.
- [ ] Validar `validFrom`, `expiresAt`, status e campanha no servidor.
- [ ] Manter limites por cliente atravessando tokens sucessivos.
- [ ] Aplicar idempotência e transação existentes.
- [ ] Registrar origem `DYNAMIC_QR`.

Critérios de aceite:

- código expirado/revogado não credita;
- trocar de token não contorna janela ou limite diário;
- claim iniciado na fronteira de expiração tem comportamento determinístico documentado;
- retry não duplica pontos.

### S3.4 — Operação e testes

- [ ] Métricas de emissão, uso, expiração e rejeição.
- [ ] Testes com relógio controlado.
- [ ] Teste de rotação e recuperação de rede.
- [ ] Teste de autorização e tenant.
- [ ] Teste de concorrência na fronteira de expiração.
- [ ] Documentar fallback para indisponibilidade.

## Ordem recomendada para o Codex CLI

1. S3.1.
2. S3.2.
3. S3.3.
4. S3.4 e revisão de segurança.

## Definição de pronto

- QR rotaciona e expira no servidor;
- fluxo do cliente continua simples;
- regras de pontos continuam centralizadas;
- limites não podem ser burlados por rotação;
- emissão, revogação e tentativas ficam auditáveis;
- testes temporais são determinísticos.

