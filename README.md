# 📚 Lab: Subindo um App Serverless na AWS com Terraform

Bem-vindo(a) ao lab! 👋

A ideia aqui é simples: **conhecer, na prática, como funciona o mundo Serverless
da AWS**, subindo um aplicativo de verdade usando **AWS Lambda + Terraform** e vendo
os serviços conversarem entre si (API Gateway, Lambda, DynamoDB).

> 📝 **Sobre a certificação:** vários conceitos que aparecem aqui **caem na prova
> AWS Certified Developer – Associate (DVA-C02)**. Mas o foco deste lab **não é a prova** —
> é você **pôr a mão na massa** e entender como um app serverless sobe e roda na AWS.
> Se ajudar na prova, ótimo; é bônus. 🙂

O app que vamos subir é uma **API de tarefas (to-do)**: dá pra criar, listar,
atualizar e apagar tarefas. Coisa simples, de propósito — o herói da história é a
**infraestrutura serverless**, não a regra de negócio.

---

## 📑 Índice

1. [O que você vai construir](#-o-que-você-vai-construir)
2. [Antes de começar (pré-requisitos)](#-antes-de-começar-pré-requisitos)
3. [⚠️ Aviso sobre as credenciais (importante)](#️-aviso-sobre-as-credenciais-importante)
4. [Passo a passo — do zero até a API no ar](#-passo-a-passo--do-zero-até-a-api-no-ar)
5. [Testando a API](#-testando-a-api)
6. [Vendo os recursos no console da AWS](#-vendo-os-recursos-no-console-da-aws)
7. [Como apagar tudo no final](#-como-apagar-tudo-no-final)
8. [Deu erro? (soluções dos problemas mais comuns)](#-deu-erro-soluções-dos-problemas-mais-comuns)
9. [Entendendo a arquitetura](#-entendendo-a-arquitetura)
10. [O que ficou de aprendizado](#-o-que-ficou-de-aprendizado)

---

## 🎯 O que você vai construir

Ao final, você terá uma **API na nuvem** com esta arquitetura:

```
Você (curl/navegador)
        │  HTTPS
        ▼
  API Gateway (HTTP API)     ← a "porta de entrada" da API
        │
        ▼
  AWS Lambda (Node.js 22)    ← o código que roda só quando é chamado
        │
        ▼
  Amazon DynamoDB            ← o banco onde as tarefas ficam guardadas
```

Tudo isso é criado **automaticamente pelo Terraform**. Você não vai clicar em nada
no console da AWS pra criar recurso — o Terraform faz por você.

---

## 🧰 Antes de começar (pré-requisitos)

Você vai precisar de **duas coisas**, e nenhuma exige instalar nada com admin:

### 1. O `terraform.exe` (binário portátil)

O Terraform é **um único arquivo executável**. Não precisa "instalar", é só baixar e usar.

1. Acesse: <https://developer.hashicorp.com/terraform/install>
2. Na seção **Windows**, baixe a versão **AMD64** (é um `.zip`).
3. Abra o `.zip` e **extraia o `terraform.exe`**.
4. **Copie o `terraform.exe` para dentro da pasta `infra/`** deste projeto.
   - Pode ser em outra pasta também, mas colocar dentro de `infra/` deixa os comandos
     abaixo funcionarem exatamente como estão escritos.

### 2. Suas credenciais da AWS (acesso programático)

O Terraform precisa de duas "senhas" pra falar com a sua conta AWS. Elas formam o
**acesso programático** (é o acesso "por código/ferramenta", diferente do login no console):

- **Access Key ID** → parece com `AKIAIOSFODNN7EXAMPLE`
- **Secret Access Key** → uma sequência longa de letras/números

> 🧠 **Conceito:** *acesso programático* = ferramentas (Terraform, CLI, SDK) usam esse par
> de chaves pra provar quem são, sem precisar de login/senha de tela. É o que a AWS chama
> de **long-term access key** de um usuário do IAM.

#### 🔑 Como criar suas chaves no console da AWS (passo a passo)

> Você usa uma conta AWS **normal** (não é AWS Academy)? Siga isto. Se for
> **AWS Academy / Learner Lab**, pule pro quadro logo abaixo.

1. Faça login no **console da AWS** → <https://console.aws.amazon.com>.
2. Na busca do topo, digite **IAM** e abra o serviço **IAM**.
3. No menu da esquerda, clique em **Users** (Usuários).
   - Se você **já tem** um usuário IAM, clique no nome dele.
   - Se **não tem**, clique em **Create user**, dê um nome (ex.: `lab-terraform`),
     e nas permissões anexe uma policy que permita criar os recursos do lab
     (pra estudo, `AdministratorAccess` resolve; em ambiente sério, o mínimo necessário).
     Termine o assistente e depois clique no usuário criado.
4. Na página do usuário, abra a aba **Security credentials**.
5. Role até **Access keys** e clique em **Create access key**.
6. Em *use case*, escolha **Command Line Interface (CLI)** (ou **Other**), marque o
   aviso de que entende os riscos e clique **Next** → **Create access key**.
7. **Agora é o pulo do gato:** a tela mostra a **Access key ID** e a **Secret access key**.
   - ⚠️ A **Secret** só aparece **AGORA, uma única vez**. Clique em **Download .csv file**
     ou copie as duas pra um lugar seguro. Se fechar sem salvar, tem que criar outra.
8. Pronto — essas duas chaves são o que você vai colar no `secrets.auto.tfvars` (Passo 3
   do "Como colocar no ar").

> ⚠️ **AWS Academy / Learner Lab (sala de aula):** você **não cria** chave no IAM.
> Entre no laboratório, clique em **AWS Details** e depois em **Show** (em "AWS CLI").
> Ali aparecem **três** valores: `aws_access_key_id`, `aws_secret_access_key` **e**
> `aws_session_token`. Copie os três — as credenciais são **temporárias** (expiram em
> algumas horas) e por isso têm o token extra.

> 🔒 **Segurança:** trate essas chaves como **senha**. Não mande por WhatsApp/print,
> não suba pro Git. Depois do lab, **desative ou apague** a chave no mesmo lugar
> (IAM → Security credentials).

### ❌ O que você NÃO precisa

- ❌ **NÃO** precisa instalar o **AWS CLI**.
- ❌ **NÃO** precisa rodar `aws configure`.
- ❌ **NÃO** precisa do **SAM**.
- ❌ **NÃO** precisa de permissão de **administrador** na máquina.
- ❌ **NÃO** precisa rodar `npm install` (o Terraform empacota o código como está).

Isso é de propósito: o lab foi feito pra rodar em **máquina travada de faculdade**,
onde não dá pra instalar quase nada.

---

## ⚠️ Aviso sobre as credenciais (importante)

Neste lab as chaves da AWS ficam num **arquivo local** chamado
`infra/secrets.auto.tfvars`. **Colocar a chave "do lado do código" é feito DE PROPÓSITO**
e **NÃO é o jeito certo** de se fazer em projetos reais.

**Por que fazemos assim aqui?**
Porque a máquina do lab é travada: sem AWS CLI, sem `aws configure`, sem poder instalar
nada. Aí a única forma que sobra de dar a credencial pro Terraform é colocá-la num arquivo.

**Por que isso é RUIM (a lição de segurança do lab):**
- Chave em arquivo **vaza fácil**: vai pro Git, aparece em print, fica em backup.
- Quem pega a chave tem **acesso total** à sua conta AWS.
- **Em projeto real, NUNCA faça isso.** O certo é usar `aws configure`, variáveis de
  ambiente, **IAM Roles** (sem chave nenhuma no código) ou **AWS SSO**.

> 💡 **Curiosidade (fora do escopo, mas vale citar):** pra "quem pode fazer o quê" numa API
> real, a AWS tem o **Amazon Cognito** (com *User Pools* e *grupos de usuários*). Aqui a
> gente **não vai usar** pra manter simples — mas fica a dica de por onde evoluir depois.

**Como a gente se protege de vazar sem querer:**
O arquivo com a chave real (`secrets.auto.tfvars`) está no **`.gitignore`**, então ele
**nunca** vai pro repositório. O que vai pro Git é só um **modelo vazio**
(`secrets.auto.tfvars.example`).

> 🔒 **Depois do lab:** o ideal é **desativar ou rotacionar** a chave que você usou.

---

## 🚀 Passo a passo — do zero até a API no ar

> Rode tudo **dentro da pasta `infra/`**, no **PowerShell**.
> (Dica: abra a pasta `infra` no Explorer, digite `powershell` na barra de endereço e Enter.)

**Passo 1 — Confira o Terraform.** Só pra garantir que o `.exe` está na pasta:
```powershell
.\terraform.exe version
```

**Passo 2 — Crie o arquivo de credenciais** a partir do modelo:
```powershell
Copy-Item secrets.auto.tfvars.example secrets.auto.tfvars
```

**Passo 3 — Cole suas chaves** no `secrets.auto.tfvars` (`notepad secrets.auto.tfvars`):
```hcl
aws_access_key    = "AKIA...SUA_KEY"
aws_secret_key    = "wJal...SUA_SECRET"
aws_session_token = ""   # só preencha se for AWS Academy / Learner Lab
```
> **AWS Academy / Learner Lab?** Além de colar o `aws_session_token` acima, abra o
> `provider.tf` e **descomente** a linha `token = var.aws_session_token`.

**Passo 4 — `init`** (baixa o provider da AWS; roda uma vez só):
```powershell
.\terraform.exe init
```

**Passo 5 — `plan`** (opcional; mostra o que será criado, sem criar nada):
```powershell
.\terraform.exe plan
```

**Passo 6 — `apply`** (cria tudo na AWS; confirme com **`yes`**):
```powershell
.\terraform.exe apply
```

Durante o `apply`, o Terraform vai mostrando cada recurso nascendo:
```text
aws_dynamodb_table.tasks: Creating...
aws_dynamodb_table.tasks: Creation complete after 9s
aws_iam_role.lambda_role: Creating...
aws_lambda_function.tasks: Creating...
aws_lambda_function.tasks: Creation complete after 12s
aws_apigatewayv2_api.http_api: Creating...
...
Apply complete! Resources: 9 added, 0 changed, 0 destroyed.
```

E no final aparece o **painel de resumo** com tudo que foi criado, a **URL da API** e
exemplos prontos de teste:
```text
z_resumo = <<EOT
    ╔══════════════════════════════════════════════════════════════════════╗
    ║        ✅  APP SERVERLESS NO AR!  Recursos criados com sucesso.        ║
    ╠══════════════════════════════════════════════════════════════════════╣
    ║   🌐  API Gateway   →  lab-app-serverless-http-api                     ║
    ║   λ   Lambda        →  lab-app-serverless-function                     ║
    ║   🗄️   DynamoDB      →  lab-app-serverless-tasks                        ║
    ║   🔗  URL da API:  https://abc123.execute-api.us-east-1.amazonaws.com/tasks
    ╚══════════════════════════════════════════════════════════════════════╝
EOT
```

🎉 **Sua API serverless está no ar.** Copie a URL e vá pra seção de testes.

---

## 🕹️ Testando a API

Você tem **3 formas** de testar. Escolha a que preferir:

### Forma A — `curl` no terminal (não instala nada no Win 10/11)
Rápido, no mesmo PowerShell. É a forma dos exemplos abaixo.

### Forma B — no navegador, sem instalar nada 🌐 (ótimo pra máquina travada)
Sites que funcionam 100% no navegador, tipo um "Postman online":
- **Hoppscotch** → <https://hoppscotch.io> (recomendado)
- **ReqBin** → <https://reqbin.com>

Como usar (ex. no Hoppscotch): escolha o **método** (GET/POST/PUT/DELETE), cole a **URL**
da sua API, na aba **Body** escolha **JSON** e cole o corpo (ex.: `{ "title": "Estudar AWS" }`),
e clique **Send**.

### Forma C — só o navegador puro
Cole a URL da API na barra de endereço e aperte Enter. **Isso só testa o GET** (listar).
Pra POST/PUT/DELETE use a Forma A ou B.

---

Nos exemplos abaixo, **substitua** `SUA_URL_AQUI` pela URL que apareceu no `apply`.
Cada chamada usa o **mesmo endereço** (`/tasks`); o que muda é o **método**.

> 📋 **Como usar cada exemplo:**
> - **No Hoppscotch/navegador:** escolha o **método**, cole a **URL**, vá na aba **Body**,
>   selecione **`application/json`** e cole o bloco **"JSON pro Body"**. Clique **Send**.
> - **No terminal (`curl`):** copie e cole o comando `curl` (já vem com as aspas escapadas
>   do PowerShell).

### ➕ Criar uma tarefa (POST)

Método: **POST** | URL: `SUA_URL_AQUI`

**JSON pro Body (Hoppscotch):**
```json
{ "title": "Estudar AWS" }
```

**curl (terminal):**
```powershell
curl -X POST "SUA_URL_AQUI" -H "Content-Type: application/json" -d '{ \"title\": \"Estudar AWS\" }'
```

Resposta esperada (guarde o `id` que voltar!):
```json
{
  "message": "Task inserida com sucesso!",
  "task": { "id": "1725973200000", "title": "Estudar AWS", "done": false, "createdAt": "..." }
}
```

### 📋 Listar todas as tarefas (GET)

Método: **GET** | URL: `SUA_URL_AQUI` | **Não precisa de Body.**

**curl (terminal):**
```powershell
curl "SUA_URL_AQUI"
```

### ✏️ Atualizar uma tarefa (PUT)

Método: **PUT** | URL: `SUA_URL_AQUI` | Use o `id` que você guardou (mude `title`, `done`, ou os dois).

**JSON pro Body (Hoppscotch):**
```json
{ "id": "1725973200000", "done": true }
```

**curl (terminal):**
```powershell
curl -X PUT "SUA_URL_AQUI" -H "Content-Type: application/json" -d '{ \"id\": \"1725973200000\", \"done\": true }'
```

### 🗑️ Apagar uma tarefa (DELETE)

Método: **DELETE** | URL: `SUA_URL_AQUI`

**JSON pro Body (Hoppscotch):**
```json
{ "id": "1725973200000" }
```

**curl (terminal):**
```powershell
curl -X DELETE "SUA_URL_AQUI" -H "Content-Type: application/json" -d '{ \"id\": \"1725973200000\" }'
```

> 💡 **Por que o `curl` tem barras `\"` e o JSON do Body não?** No `curl` do **PowerShell**,
> as barras invertidas `\"` são necessárias pra manter as aspas dentro do JSON (o PowerShell
> "come" as aspas normais). Já o **Hoppscotch** quer o JSON limpo, com aspas normais — por
> isso deixei os dois separados: é só copiar o certo pro lugar certo.
> No Git Bash/Linux/Mac, o `curl` usa aspas simples: `-d '{ "title": "..." }'`.

### Tabela de respostas possíveis

| Código | O que significa |
|---|---|
| **200** | Deu certo 🎉 |
| **400** | Faltou um dado obrigatório (ex.: `title` no POST, ou `id` no PUT/DELETE) |
| **405** | Método HTTP que a API não trata |
| **500** | Algo quebrou — veja os logs no CloudWatch (grupo `/aws/lambda/lab-app-serverless-function`) |

---

## 👀 Vendo os recursos no console da AWS

Você criou tudo por código, mas é **muito legal ver as peças de verdade** no console.
Abra <https://console.aws.amazon.com> e siga os roteirinhos abaixo.

> 🌎 **Antes de tudo:** confira o **canto superior direito** do console e selecione a região
> **N. Virginia (us-east-1)** — é onde o lab cria os recursos. Se estiver em outra região,
> você não vai enxergar nada e vai achar que deu errado (não deu, é só a região errada 😅).

### λ A função Lambda
1. Busque **Lambda** no topo e abra o serviço.
2. Clique na função **`lab-app-serverless-function`**.
3. Repare em:
   - a aba **Code** → é o `handler.mjs` que o Terraform empacotou e subiu;
   - **Configuration → Environment variables** → o `TASKS_TABLE` apontando pra sua tabela;
   - **Configuration → Permissions** → a **role** IAM que demos pra ela.
4. (Opcional) Aba **Test**: dá pra invocar a função ali mesmo, sem passar pela API.

### 🗄️ Os dados dentro do DynamoDB (o mais divertido 😄)
1. Busque **DynamoDB** no topo e abra o serviço.
2. No menu da esquerda → **Tables** → clique em **`lab-app-serverless-tasks`**.
3. Clique no botão **Explore table items** (Explorar itens da tabela).
4. Aqui aparecem as **tarefas que você criou** via API! Cada linha é um item com
   `id`, `title`, `done` e `createdAt`.
   > Dica de teste: crie uma task pela API (POST), depois clique em **Run**/atualizar aqui
   > e veja ela **aparecer na hora**. Apague pela API (DELETE) e veja **sumir**. 🔥

### 🌐 A API no API Gateway
1. Busque **API Gateway** no topo e abra o serviço.
2. Clique na API **`lab-app-serverless-http-api`**.
3. Em **Routes**, veja as rotas `GET /tasks`, `POST /tasks`, `PUT /tasks`, `DELETE /tasks`,
   todas ligadas (**Integration**) à mesma Lambda.

### 📜 Os logs da Lambda (CloudWatch)
1. Busque **CloudWatch** no topo e abra o serviço.
2. Menu esquerdo → **Logs → Log groups**.
3. Abra o grupo **`/aws/lambda/lab-app-serverless-function`**.
4. Clique no **log stream** mais recente. Aqui aparece tudo que o `console.log` do código
   imprimiu — inclusive o **evento** que a API mandou pra Lambda. Ótimo pra debugar erro 500.

### 🔐 A permissão da Lambda (IAM)
1. Busque **IAM** no topo e abra o serviço.
2. **Roles** → procure **`lab-app-serverless-lambda-role`**.
3. Veja as políticas anexadas: uma pra **escrever logs** e outra que dá **CRUD só na tabela
   do projeto** (menor privilégio — a Lambda não enxerga nenhuma outra tabela).

> 💡 **Sacada do lab:** você fez uma chamada HTTP (API Gateway) → que acionou um código
> (Lambda) → que gravou num banco (DynamoDB) → deixando rastro (CloudWatch), tudo com uma
> permissão controlada (IAM). Isso é o **coração do serverless na AWS**. 🎯

---

## 🧹 Como apagar tudo no final

**Importante pra não deixar recurso rodando/cobrando.** Um comando só apaga tudo que o
Terraform criou:

```powershell
.\terraform.exe destroy
```

Ele pergunta a confirmação — digite **`yes`**. Quando terminar, aparece
`Destroy complete!` e sua conta volta a ficar limpa. ✅

---

## 🆘 Deu erro? (soluções dos problemas mais comuns)

| O que apareceu | O que provavelmente é | Como resolver |
|---|---|---|
| `.\terraform.exe : não é reconhecido...` | o `terraform.exe` não está na pasta atual | coloque o `terraform.exe` dentro de `infra/` e rode de lá |
| `No valid credential sources found` | as chaves não foram carregadas | confira se o arquivo se chama **exatamente** `secrets.auto.tfvars` (não `secrets.tfvars`) e se as chaves estão coladas |
| `InvalidClientTokenId` / `SignatureDoesNotMatch` | chave errada ou copiada com espaço | copie a Access/Secret Key de novo, sem espaços, e salve o arquivo |
| `ExpiredToken` / `security token ... expired` | credencial temporária (AWS Academy) venceu | pegue as chaves novas no lab e atualize o `secrets.auto.tfvars` |
| Travou/erro no `init` baixando o provider | rede da faculdade bloqueou o download | veja a observação sobre **rede bloqueada** logo abaixo |
| `Error acquiring the state lock` | um `apply` anterior travou | rode de novo; se persistir, feche outros terminais rodando terraform |

> **Rede da faculdade bloqueando o `terraform init`?** O `init` baixa os plugins da
> internet. Se a rede bloquear, dá pra levar os plugins numa pasta junto do projeto
> (recurso chamado *provider mirror*). Se você cair nesse caso, avise o instrutor.

---

## 🏛️ Entendendo a arquitetura

Cada peça tem um papel bem definido:

| Peça | O que faz | Analogia |
|---|---|---|
| **API Gateway (HTTP API)** | recebe a requisição HTTP e encaminha pra Lambda | a recepção do prédio |
| **AWS Lambda** | roda o código (`handler.mjs`) só quando é chamado | funcionário que só trabalha quando tem tarefa |
| **Amazon DynamoDB** | guarda as tarefas | o arquivo/gaveta |
| **IAM Role/Policy** | dá à Lambda permissão **só** na tabela deste projeto | o crachá com acesso restrito |
| **CloudWatch Logs** | guarda os logs da Lambda pra você depurar | a câmera de segurança |

### Como os arquivos do Terraform se organizam

```
infra/
├── provider.tf                     → conexão com a AWS + onde as chaves entram
├── variables.tf                    → declaração das variáveis (SEM chave; vai pro git)
├── secrets.auto.tfvars.example     → modelo de credenciais (SEM chave; vai pro git)
├── secrets.auto.tfvars             → 🔴 SUAS chaves reais (IGNORADO pelo git)
├── dynamodb.tf                     → cria a tabela do DynamoDB
├── iam.tf                          → cria a role e as permissões da Lambda
├── lambda.tf                       → empacota a pasta ../src e cria a função Lambda
├── apigateway.tf                   → cria a HTTP API e as rotas GET/POST/PUT/DELETE /tasks
└── outputs.tf                      → mostra a URL da API no final do apply

src/
├── handler.mjs                     → o código do CRUD que roda na Lambda
└── package.json                    → dependências do projeto
```

> **Detalhe legal:** no `lambda.tf`, o Terraform **empacota sozinho** a pasta `src/` num
> `.zip` e envia pra AWS. É por isso que você **não** precisa do SAM nem de `npm install`.

---

## 🎓 O que ficou de aprendizado

- Como **subir um app serverless** na AWS do zero, com **Terraform**.
- Como **API Gateway + Lambda + DynamoDB** se conectam pra formar uma API.
- Como funciona uma **IAM Role/Policy** (permissão mínima: a Lambda só acessa a tabela dela).
- Como **ler o corpo** de uma requisição e **devolver uma resposta HTTP** numa Lambda.
- Como fazer **CRUD** no DynamoDB (criar, listar, atualizar, apagar).
- Onde ver **erros e logs** (CloudWatch Logs).
- Por que **chave no código é ruim** — e quais são as formas certas de autenticar.
- **Infra descartável:** subir com `apply`, derrubar com `destroy`, sem sobrar nada cobrando.

> Vários desses pontos **também caem na DVA-C02**, mas de novo: o foco aqui é
> **entender o serverless na prática**. A prova é consequência. 😉

---

> Projeto de estudo. Não use esse padrão de credenciais em produção. 🙂
