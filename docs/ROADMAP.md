# Roadmap de desenvolvimento

As etapas preservam o princípio central: o combate acontece sozinho e o jogador administra a progressão. O escopo abaixo orienta entregas incrementais; não atribui datas nem declara implementados os sistemas futuros. Os requisitos de referência estão em [REQUIREMENTS.md](REQUIREMENTS.md).

## Etapa 1 — MVP jogável

Entrega inicial: tela inicial, entrada como visitante ou conta por e-mail/senha, um Devorador comum, primeira região, batalha automática, XP, Gold, fases, boss, equipamentos e evolução básica.

O servidor deve calcular e persistir a progressão, incluindo até oito horas por ausência offline. Intervalos maiores que 45 segundos geram um resumo para coleta: XP e fases avançam imediatamente, enquanto Gold, Gemas e itens aguardam confirmação. A interface de desktop e mobile apresenta as batalhas e permite decisões de melhoria, sem exigir cliques para atacar. SQLite atende o desenvolvimento em instância única; o jogo deve funcionar sem carteira, Redis ou infraestrutura blockchain.

Critérios de validação:

- Entrar, avançar, equipar, melhorar e evoluir produz resultados persistidos pelo servidor.
- Fechar e reabrir o jogo recupera a conta e calcula o período offline elegível.
- Repetir sincronizações não duplica o mesmo período de recompensa.
- Bosses participam da progressão automática, inclusive após ausência do jogador.
- Build de produção, checagem de tipos e testes das regras do jogo passam.
- A interface se adapta a telas pequenas e permite operar as ações principais.

A página inicial e as mensagens do produto devem distinguir os recursos disponíveis das próximas etapas.

## Etapa 2 — Profundidade de progressão

Adicionar missões, usos para Gemas, Fendas, raridades, mais criaturas e inventário completo. A recompensa básica de Gemas por boss já está prevista no MVP; a economia completa vem nesta etapa. Ampliar a evolução para caminhos com decisões permanentes e mudanças visuais. Introduzir formação, funções de equipe e sinergias entre naturezas, mantendo o jogador como estrategista.

Antes de habilitar Fendas, definir probabilidades, custos, apresentação dos resultados e proteção contra gastos repetidos. Validar aquisição de personagens por fontes alternativas. Revisar o balanceamento com dados de sessões e progressão offline.

## Etapa 3 — Contas e operação pública

Preparar a operação antes de transações reais: login Google, confirmação de e-mail, recuperação de conta, proteção de sessões, limites de abuso, backups com restauração testada e observabilidade. Migrar para PostgreSQL com transações, esquema versionado e caminho de importação dos dados locais quando aplicável. Adotar Redis somente onde filas, cache ou limites distribuídos justificarem a dependência.

Validar concorrência entre dispositivos e instâncias, integridade da economia e recuperação de falhas. Estabelecer políticas de privacidade, suporte, retenção e exclusão de dados. Avaliar PWA ou empacotamento mobile depois de estabilizar a experiência responsiva.

## Etapa 4 — VIP e marketplace

Projetar o Passe VIP com benefícios e preço revisáveis, preservando o acesso à progressão sem vantagens excessivas. Introduzir histórico individual de criaturas e regras de propriedade. Construir listagem, compra e venda entre jogadores com taxas transparentes e liquidação segura.

Pagamentos, reembolsos, disputas, fraude e obrigações operacionais precisam estar definidos antes de aceitar dinheiro real. Nenhuma venda pode duplicar personagens ou deixar comprador e vendedor com estados divergentes. Testar falhas, concorrência e recuperação antes da abertura pública.

## Etapa 5 — Blockchain opcional

Escolher rede EVM, modelo de propriedade, padrão de ativos e integração de carteiras. Manter a conta do jogo independente da carteira e preservar o acesso ao jogo sem conexão blockchain. Avaliar a criação de ativos apenas no momento de disponibilização ao marketplace.

Desenvolver contratos com testes e auditoria independente proporcional ao risco. Validar eventos, reorganizações, operações pendentes e conciliação com o banco. Gold, Gemas, XP e combate continuam no backend. Não criar token próprio.

## Etapa 6 — Expansão de conteúdo

Adicionar guildas, PvP, boss mundial, torre infinita, eventos, temporadas, rankings, regiões e novas criaturas conforme a capacidade operacional e os resultados das etapas anteriores. Cada modo deve definir como interage com progressão offline, equipes, economia e integridade competitiva.

As criaturas devem continuar memoráveis: misturas de matéria, máquinas, objetos e entidades, com evoluções reconhecíveis. A expansão não deve transformar o jogo em combate manual ou substituir a identidade de A Ruptura por classes genéricas.
