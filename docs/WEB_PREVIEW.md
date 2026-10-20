# Prévia web

O MVP pode rodar em um serviço que execute Docker, como Render ou Railway. Ainda não há uma URL pública criada. Publicar a configuração do ambiente Codex salva o ambiente de desenvolvimento; isso não hospeda o jogo na internet.

## Antes de implantar

- O MVP e os arquivos de implantação estão no branch `main` de `Gynden/chat`. Autorize o acesso desse repositório no provedor escolhido.
- Use uma conta de hospedagem autorizada e conecte o repositório pela interface do provedor. Não envie senhas, tokens ou chaves pelo chat.
- Confirme as condições do serviço antes de criar recursos pagos. A criação de recursos com cobrança exige autorização do usuário.

## Configuração do contêiner

O `Dockerfile` na raiz prepara o build Next.js standalone e executa o servidor com Node.js 24. A porta é lida de `PORT`, com padrão `3000`; o servidor escuta em `0.0.0.0`.

Configure `GAME_DATA_DIR=/data`. Para preservar contas e progresso entre reinícios e novas implantações, monte armazenamento persistente em `/data`, com permissão de escrita para o usuário do contêiner. O banco será `/data/ruptura.sqlite`.

Sem um volume persistente, a prévia pode usar armazenamento temporário, mas contas e progresso poderão ser perdidos em reinícios ou novas implantações. Avise quem for testar e não use credenciais pessoais nessa demonstração.

Mantenha uma única réplica do aplicativo: este adaptador SQLite ainda não oferece a arquitetura necessária para múltiplas instâncias.

## Render

O arquivo `render.yaml` configura `ruptura-preview` no plano gratuito, com armazenamento temporário. Use [Deploy to Render](https://render.com/deploy?repo=https://github.com/Gynden/chat), entre na sua conta, autorize acesso ao repositório e confirme a configuração. Esse botão abre a criação do serviço; ele não é uma URL jogável. Após a implantação, o Render fornece a URL pública.

Esse fluxo pelo painel dispensa `RENDER_API_KEY`. A declaração dessa chave nas configurações do ambiente é necessária apenas para automação pela API; não coloque o valor no chat, no repositório ou no serviço do jogo.

Para configurar manualmente:

1. Na conta autorizada, crie um Web Service a partir do repositório que contém o projeto.
2. Selecione execução por Docker e o `Dockerfile` da raiz. Se o projeto estiver em uma subpasta do repositório, defina essa pasta como diretório raiz do serviço.
3. Configure `GAME_DATA_DIR=/data` e, quando a prévia precisar preservar dados, um disco persistente montado em `/data`. Confira a cobrança antes de criar o disco ou o serviço.
4. Implante e acompanhe os logs até o servidor estar pronto. Use o endereço HTTPS fornecido pelo Render para testar.

## Railway

1. Na conta autorizada, crie um serviço a partir do repositório que contém o projeto.
2. Use o `Dockerfile` da raiz; ajuste o diretório raiz se o projeto estiver em uma subpasta.
3. Configure `GAME_DATA_DIR=/data` e, para preservar os dados, um volume montado em `/data`. Confira as condições de cobrança antes de criar recursos.
4. Implante e habilite um domínio público na configuração de rede do serviço. O processo deve usar a variável `PORT` atribuída pelo Railway.

## Verificar a prévia

- Abra a URL HTTPS fornecida pelo serviço e confira o cenário, o Devorador comum e o combate automático.
- Fortaleça a criatura, equipe um item e crie uma conta a partir da sessão visitante. A mesma jornada deve ser preservada.
- Saia e entre novamente. Depois, confira o funcionamento no navegador mobile.
- Quando houver armazenamento persistente, teste também o acesso à mesma conta após reiniciar o serviço.

Uma resposta `401` em `/api/game` sem sessão é esperada. A tela inicial cria a sessão visitante. Não divulgue uma URL antes de verificar o funcionamento real da implantação.
