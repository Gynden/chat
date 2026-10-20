# Requisitos base — RUPTURA

Este documento registra a visão fornecida pelo criador. É a referência para decisões futuras; itens descritos aqui não representam funcionalidades já implementadas. O recorte da primeira entrega e as dependências estão em [ROADMAP.md](ROADMAP.md).

## Princípio de jogo

RUPTURA é um **Idle RPG de verdade**. Os personagens caminham, atacam, usam habilidades, recebem dano, derrotam inimigos, enfrentam bosses e continuam farmando automaticamente. O jogador não clica para atacar e não controla deslocamento ou combate manualmente.

O jogador administra estratégia, composição, formação, equipamentos, evolução, recursos, abertura de áreas e economia. O ciclo principal é:

1. Entrar e coletar recompensas offline.
2. Melhorar e equipar personagens; organizar a equipe quando esse sistema existir.
3. Avançar automaticamente por inimigos e fases.
4. Enfrentar um boss e desbloquear uma área.
5. Obter recursos, escolher evoluções e repetir.

O servidor calcula progressão e recompensas mesmo após o navegador ser fechado, até o limite definido para a conta. A versão inicial adota oito horas; benefícios futuros precisam de balanceamento próprio.

## Plataformas e apresentação

- Navegador de PC e navegador mobile, com interface responsiva.
- Desktop e mobile compartilham a experiência web inicial; PWA ou aplicativo empacotado são possibilidades futuras.
- Pixel art moderna, leve e reconhecível: sprites, animações, iluminação, partículas e efeitos de habilidades com identidade própria.
- Criaturas estranhas, evoluções visuais e decisões permanentes têm prioridade sobre arquétipos genéricos de fantasia.

## Universo e criaturas

O evento provisoriamente chamado **A Ruptura** fundiu realidades. As criaturas combinam animais, objetos, máquinas, conceitos, entidades, elementos, matéria orgânica, estruturas e energia. Guerreiro, mago, arqueiro, elfo e orc não são os modelos de referência.

| Criatura | Conceito | Direção mecânica |
| --- | --- | --- |
| O Rei Sem Rosto | Criatura enorme com coroa flutuando no lugar da cabeça. | Fortalece-se com mortes durante a batalha. |
| A Marionete | Boneco de madeira quebrado, suspenso por fios vindos do céu. | Manipulação temporária de inimigos. |
| O Devorador | Consome equipamentos e materiais e transforma o próprio corpo. | Evoluções físicas e mecânicas influenciadas pelo consumo. |
| A Catedral Viva | Criatura enorme com uma construção nas costas. | Resistência e suporte. |
| O Colecionador | Carrega máscaras de inimigos derrotados. | Máscaras modificam habilidades. |
| A Morte Inacabada | Parte de um esqueleto e reconstrói o próprio corpo. | Transforma-se gradualmente em uma entidade maior. |

O jogador começa com **um personagem comum**. O Devorador é o personagem do primeiro recorte jogável.

## Evolução e identidade individual

Um personagem pode seguir caminhos diferentes conforme as decisões do jogador. A identidade individual deve resultar de evolução, mutações, histórico e escolhas, além dos atributos numéricos.

Exemplo conceitual de O Devorador no nível 20:

- Devorar carne inicia uma evolução orgânica, posteriormente Abominação ou Predador Primordial.
- Devorar metal inicia uma evolução mecânica, posteriormente Máquina Profana ou Titã de Ferro.

Esse nível e os custos são parâmetros de balanceamento, não um compromisso com os números da implementação inicial. A primeira versão contém apenas a decisão básica; a árvore completa depende das etapas seguintes.

O histórico futuro deve permitir distinguir, por exemplo, um Titã de Ferro de nível 92, com três mutações lendárias, 187 horas de existência e um proprietário. Não basta trocar o nome de um personagem idêntico a todos os outros.

## Naturezas e sinergias

As categorias substituem classes tradicionais:

| Natureza | Papel conceitual |
| --- | --- |
| Predadores | Dano e fortalecimento por eliminações. |
| Parasitas | Interagem com outras criaturas e alteram habilidades. |
| Construtos | Seres artificiais ou mecânicos resistentes. |
| Anomalias | Alteram tempo, ataques, duplicações, ressurreições ou outras regras. |
| Colossos | Criaturas gigantes que podem ocupar dois espaços da equipe. |
| Enxames | Uma unidade representada por várias criaturas menores. |

Exemplos de sinergias a desenvolver e balancear:

- Três Anomalias concedem distorção temporal.
- Dois Parasitas e um Colosso permitem habitação e fortalecimento de habilidades.
- Três Construtos compartilham parte da armadura.

## Contas e carteiras

O desenho completo prevê Google e e-mail/senha. O MVP começa com e-mail/senha e acesso de visitante; Google será integrado em outra etapa.

A carteira não é necessária para jogar. Conta e carteira têm identidades separadas: nível, personagens e progressão pertencem à conta do jogo. Conectar, substituir ou desconectar uma carteira não deve apagar a progressão. Futuras opções incluem MetaMask, Trust Wallet e carteiras compatíveis com WalletConnect, com comprovação de controle e políticas explícitas para operações sensíveis.

## Recursos e aquisição de personagens

**Não haverá token próprio.** A economia prevê Gold, Gemas, itens, personagens, Passe VIP e marketplace entre jogadores.

Gold financia evolução, melhorias de equipamentos, habilidades e outras melhorias comuns. Gemas são mais valiosas e também podem ser obtidas jogando: missões, conquistas, eventos, progressão, bosses e recompensas especiais.

As Gemas poderão abrir **Fendas**, nome provisório de um sistema de aquisição com identidade própria. No exemplo inicial, 100 Gemas abrem uma ruptura visual com silhuetas; uma direção ou interação revela a criatura que atravessa. A forma da interação não deve criar combate manual.

Probabilidades de referência, sujeitas a revisão e apresentação transparente ao jogador:

| Raridade | Probabilidade provisória |
| --- | ---: |
| Comum | 55% |
| Raro | 27% |
| Épico | 12% |
| Lendário | 5% |
| Anômalo | 1% |

Outras fontes futuras de personagens: bosses raros, eventos, evoluções, fusões, conquistas especiais e temporadas.

## Monetização e marketplace

As fontes principais previstas são Passe VIP e taxas sobre vendas entre jogadores. Cosméticos e conveniências podem ser avaliados depois.

Jogadores poderão negociar personagens e, possivelmente, equipamentos raros. O exemplo de uma venda por R$ 100 com taxa de 5% resulta em R$ 95 para o vendedor e R$ 5 para a plataforma. **A taxa ainda não foi definida**, e o exemplo não representa um serviço financeiro implementado.

Características individuais e histórico devem sustentar o valor de personagens, sem prometer valorização financeira. A implementação futura precisará de transferência atômica de propriedade, prevenção de duplicações, reconciliação, registro de operações e regras de pagamento e disputa.

O Passe VIP não deve ser extremamente pay-to-win. Benefícios candidatos:

- Maior limite de recompensas offline.
- Mais presets de equipe.
- Maior velocidade de batalha.
- Tentativas extras de dungeon.
- Cosméticos e recompensas mensais.
- Pequena redução da taxa de marketplace e outras conveniências.

R$ 19,90 por mês é apenas um exemplo; preço e benefícios dependem de validação e balanceamento. Mudanças de velocidade precisam respeitar as mesmas regras autoritativas de progressão.

## Blockchain opcional

Gold, Gemas, XP, combate, drops e progressão ficam no servidor e no banco. Nenhuma dessas operações exige transação on-chain.

Possíveis usos de uma rede EVM: propriedade, transferência de personagens raros, itens especiais, vendas e histórico de proprietários. Solidity, ERC-721 e ERC-1155 são opções a avaliar. Um personagem pode tornar-se ativo on-chain apenas quando for destinado ao marketplace, evitando transações desnecessárias.

Escolher a rede, definir custódia e recuperação, conciliar estado on-chain e off-chain e auditar contratos são pré-requisitos de uma entrega futura. O MVP não depende de rede, carteira ou contrato.

## Autoridade e integridade

O navegador nunca altera diretamente Gold, Gemas, XP, drops, personagens, níveis ou itens. Ele envia intenções; o servidor valida pré-condições, custos, posse e tempo antes de persistir o resultado.

Combate e recompensa offline precisam ser reproduzíveis ou verificáveis no servidor. Repetição de requisições, concorrência, relógio do cliente e múltiplas abas não podem criar recompensas ou itens duplicados. Autenticação, validação e transações são parte da base; medidas específicas contra bots, fraude e abuso devem evoluir com a exposição do serviço.

## Direção técnica

| Camada | Direção do projeto |
| --- | --- |
| Interface | React e Next.js, em TypeScript. |
| Apresentação do jogo | Phaser. |
| Backend | Node.js e TypeScript, com regras autoritativas. |
| Banco | PostgreSQL como destino para implantação com múltiplas instâncias; SQLite local no MVP inicial. |
| Cache e filas | Redis quando necessário; não é obrigatório na primeira entrega. |
| Blockchain futura | EVM e Solidity, com padrões de ativos avaliados separadamente. |
| Carteiras futuras | WalletConnect, MetaMask e Trust Wallet. |
| Assets | Spritesheets em pixel art; armazenamento externo/CDN quando apropriado. |

As etapas de desenvolvimento devem preservar uma experiência jogável. Novas funcionalidades entram depois que o ciclo idle anterior estiver validado.
