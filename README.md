# RUPTURA

Idle RPG sobre criaturas nascidas da fusão de realidades. O combate é automático; o jogador decide como equipar, melhorar e evoluir seu Devorador. O projeto começa com uma versão jogável pequena e preserva o desenho completo em [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md).

## Versão inicial

- Interface responsiva para navegadores de computador e celular.
- Conta com e-mail e senha ou entrada como visitante.
- Um Devorador comum, primeira região, fases e boss.
- Combate automático com XP, Gold e progressão calculados pelo servidor.
- Recompensas offline limitadas a oito horas.
- Equipamentos e escolha de evolução básica entre caminhos orgânico e mecânico.

Bosses concedem Gemas, mas o uso dessa moeda em Fendas e outros sistemas ficará para as próximas etapas, assim como Google, equipes, VIP, marketplace, carteiras e blockchain. A implementação atual não realiza compras, vendas ou transações on-chain.

## Executar localmente

Requisitos: Node.js 24 e npm. O banco local usa o módulo `node:sqlite` do Node.js e precisa de armazenamento gravável e persistente.

```sh
npm ci
npm run dev
```

Neste ambiente de nuvem, o cache padrão do npm pode não ser gravável. Nesse caso, instale com `NPM_CONFIG_CACHE=/workspace/.cache/npm npm ci`. Essa configuração não é necessária quando o cache local já funciona.

Abra o endereço local exibido pelo Next.js, normalmente na porta 3000. Em ambiente de nuvem, esse endereço pertence à máquina que está executando o servidor.

```sh
npm run typecheck
npm test
npm run build
npm start
```

Após gerar o build, `npm run test:e2e` valida a jornada completa no Chromium e a navegação mobile. Os testes iniciam um servidor na porta 3100 com banco temporário separado dos dados de desenvolvimento. Neste ambiente usam o Chromium instalado; fora dele, execute `npx playwright install chromium` ou informe `CHROMIUM_PATH`.

`dev` inicia o desenvolvimento; `build` gera a versão de produção e `start` a serve. Os testes verificam as regras do jogo. A sessão do visitante depende do cookie do navegador: use uma conta para continuar a progressão em outros dispositivos.

## Arquitetura e persistência

Next.js, React e TypeScript compõem a interface e o servidor; Phaser apresenta a batalha. O servidor é a autoridade sobre tempo, combate, recompensas e recursos. A interface solicita ações permitidas e recebe o estado calculado: não informa livremente valores de Gold, XP, níveis ou equipamentos.

O combate apresentado pelo navegador é uma visualização da progressão. Ao retornar ao jogo, o servidor calcula o período elegível desde a última atualização, com limite de oito horas por ausência. Intervalos maiores que 45 segundos são tratados como offline: XP, níveis e avanço das fases são aplicados imediatamente; Gold, Gemas e itens ficam pendentes até a coleta. O XP mostrado no resumo já foi incorporado e não é aplicado novamente ao coletar. Não é necessário manter uma aba aberta para acumular as recompensas desse período.

Por padrão, o banco fica em `.data/ruptura.sqlite`, relativo à raiz do projeto. A variável opcional `GAME_DATA_DIR` substitui o diretório de dados; por exemplo, `GAME_DATA_DIR=/workspace/ruptura-data npm run dev`. O arquivo continua se chamando `ruptura.sqlite`. Preserve esse diretório entre reinícios e inclua-o na política de backups.

SQLite é o adaptador inicial para desenvolvimento e uma única instância do servidor. Não é a escolha final para várias réplicas ou funções efêmeras. A evolução prevista é PostgreSQL com transações e migrações; Redis poderá apoiar filas, cache e limites distribuídos quando houver necessidade demonstrada. A conta do jogo é independente de qualquer futura carteira.

Senhas usam scrypt e as sessões são mantidas pelo servidor com cookie de acesso. Nunca inclua credenciais em commits, documentação ou instruções de instalação.

## Antes de publicar

Este é um MVP de desenvolvimento. Uma publicação precisa de HTTPS, armazenamento persistente, backups testados, observabilidade e política de recuperação dos dados. O login ainda exige trabalho de verificação de e-mail, recuperação de senha e controles de abuso com limites adequados à infraestrutura. Antes de escalar, migre a persistência e valide concorrência, sessões e limites entre instâncias.

Marketplace, pagamentos e contratos terão projetos próprios de segurança, auditoria, operação e conformidade antes de movimentar ativos reais. Nada disso é pré-requisito para jogar o MVP.

Veja os critérios e as etapas de expansão em [docs/ROADMAP.md](docs/ROADMAP.md).

Para hospedar uma prévia por link público, consulte [docs/WEB_PREVIEW.md](docs/WEB_PREVIEW.md). O `Dockerfile` prepara o frontend e o servidor Node.js no mesmo serviço; isso ainda exige um destino de hospedagem autorizado.
