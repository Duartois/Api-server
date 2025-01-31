# API Server

Este repositório contém um servidor API completo desenvolvido com Node.js e Express, integrando diversas tecnologias para autenticação, armazenamento e processamento de pagamentos.

## Tecnologias Utilizadas

- **Node.js**: Ambiente de execução JavaScript.
- **Express.js**: Framework para Node.js.
- **Bcrypt**: Hashing de senhas para maior segurança.
- **Axios**: Comunicação HTTP com outras APIs.
- **Stripe**: Processamento de pagamentos online.
- **Amazon S3**: Armazenamento de arquivos.
- **Firebase**: Serviços de autenticação e notificações push.

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
STRIPE_SECRET_KEY=sua_chave_secreta_stripe
AWS_ACCESS_KEY_ID=sua_chave_aws
AWS_SECRET_ACCESS_KEY=sua_chave_secreta_aws
FIREBASE_API_KEY=sua_chave_firebase
```

## Executando o Projeto

Para iniciar o servidor:

```bash
npm start
```

O servidor estará disponível em `http://localhost:3000`.

## Contribuição

1. Faça um fork deste repositório.
2. Crie uma branch para sua feature (`git checkout -b minha-feature`).
3. Commit suas alterações (`git commit -m 'Adicionando nova feature'`).
4. Envie para o repositório (`git push origin minha-feature`).
5. Abra um Pull Request.

## Licença

Este projeto está licenciado sob a MIT License.
