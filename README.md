# API Server

Este repositório contém um servidor API completo desenvolvido com Node.js e Express, integrando diversas tecnologias para autenticação, armazenamento e processamento de pagamentos.

## Tecnologias Utilizadas

- **Node.js**: Ambiente de execução JavaScript.
- **Express.js**: Framework para Node.js.
- **Bcrypt**: Hashing de senhas para maior segurança.
- **Stripe**: Processamento de pagamentos online.
- **Amazon S3**: Armazenamento de arquivos.
- **Firebase**: Serviços de autenticação e banco de dados.

## Instalação

1. Clone o repositório:

   ```bash
   git clone https://github.com/Duartois/Api-server.git
   ```

2. Acesse a pasta do projeto:

   ```bash
   cd Api-server
   ```

3. Instale as dependências:

   ```bash
   npm install
   ```

## Configuração do Ambiente

Crie um arquivo `.env` na raiz do projeto e configure as seguintes variáveis:

```env
PORT=3000
STRIPE_SECRET_KEY=sua_chave_stripe
MONGO_URI=sua_string_conexao_mongo
STRIPE_WEBHOOK_SECRET=seu_webhook_secret
DOMAIN=https://seu_dominio
AWS_ACCESS_KEY_ID=sua_chave_aws
AWS_SECRET_ACCESS_KEY=sua_chave_secreta_aws
FIREBASE_API_KEY=sua_chave_firebase
FIREBASE_AUTH_DOMAIN=seu_dominio_firebase
FIREBASE_PROJECT_ID=seu_id_projeto
FIREBASE_STORAGE_BUCKET=seu_bucket
FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
FIREBASE_APP_ID=seu_app_id
GOOGLE_MAPS_API_KEY=sua_chave_google
EMAIL_USER=seu_email
EMAIL_PASS=sua_senha_email
```

## Executando o Projeto

Para iniciar o servidor:

```bash
npm start
```

O servidor estará disponível em `http://localhost:3000`.

## Sincronização de Pedidos com Stripe

Use o script `scripts/syncStripeOrders.js` para sincronizar pedidos do Stripe com o banco de dados.

Execute manualmente:

```
node scripts/syncStripeOrders.js
```

Para agendar com cron (exemplo rodando diariamente à meia-noite):

```
0 0 * * * node /caminho/para/projeto/scripts/syncStripeOrders.js >> /var/log/stripe_sync.log 2>&1
```

## Contribuição

1. Faça um fork deste repositório.
2. Crie uma branch para sua feature (`git checkout -b minha-feature`).
3. Commit suas alterações (`git commit -m 'Adicionando nova feature'`).
4. Envie para o repositório (`git push origin minha-feature`).
5. Abra um Pull Request.

## Licença

Este projeto está licenciado sob a MIT License.
