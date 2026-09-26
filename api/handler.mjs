// =============================================================================
//  HANDLER DA LAMBDA — CRUD de tarefas (to-do) no DynamoDB
// =============================================================================
//  Este é o código que roda DENTRO da AWS Lambda. Ele recebe a requisição que
//  veio do API Gateway (o "event"), decide o que fazer com base no método HTTP
//  (GET/POST/PUT/DELETE) e conversa com a tabela do DynamoDB.
//
//  Importante: NÃO precisamos instalar o AWS SDK. A partir do Node 18+, o
//  runtime da Lambda já traz o "@aws-sdk/*" embutido — por isso o lab não pede
//  "npm install".
// =============================================================================

// SDK v3 da AWS: o "client" é a conexão bruta; o "lib-dynamodb" (DocumentClient)
// deixa a gente trabalhar com objetos JS normais em vez do formato cru do DynamoDB.
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    PutCommand,    // inserir item
    ScanCommand,   // ler a tabela inteira
    DeleteCommand, // apagar item
    UpdateCommand  // atualizar item
} from "@aws-sdk/lib-dynamodb";

// ⚡ WARM START (conceito importante de serverless):
// criamos o cliente do DynamoDB AQUI FORA do handler, de propósito. A Lambda
// reaproveita o mesmo "ambiente" entre chamadas seguidas (enquanto está "quente"),
// então este cliente é criado UMA vez e reutilizado — deixando as próximas
// invocações mais rápidas. Se criássemos dentro do handler, seria recriado a cada chamada.
const client = new DynamoDBClient({ region: "us-east-1" });
const ddbDocClient = DynamoDBDocumentClient.from(client);

// O nome da tabela NÃO fica "chumbado" no código: ele chega por uma VARIÁVEL DE
// AMBIENTE (TASKS_TABLE), que o Terraform define ao criar a Lambda (veja lambda.tf).
// Isso deixa o mesmo código funcionar com qualquer tabela, sem editar o código.
const TABLE_NAME = process.env.TASKS_TABLE;

// Ponto de entrada da Lambda. O "event" é tudo que o API Gateway mandou:
// método HTTP, corpo (body), headers, etc.
export const handleTasks = async (event) => {

    // Loga o evento inteiro no CloudWatch — ótimo pra depurar (ver o que chegou).
    console.log("Evento recebido: ", JSON.stringify(event, null, 2));

    try {

        //identifica o método HTTP da requisição
        //HttpApi payload 2.0 => event.requestContext.http.method
        //REST API / payload 1.0 => event.httpMethod
        const httpMethod =
            event?.requestContext?.http?.method ||
            event?.httpMethod;

        //retorna erro caso o método HTTP não seja identificado
        if (!httpMethod) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Não foi possível identificar o método HTTP na requisição." }),
            };
        }

        //verifica o método HTTP e chama a função correspondente
        if (httpMethod === "POST") return await criarTask(event);
        if (httpMethod === "GET") return await listarTasks(event);
        if (httpMethod === "DELETE") return await deletarTask(event);
        if (httpMethod === "PUT") return await atualizarTask(event);

        //#region => Função para criar uma task no DynamoDB
        async function criarTask(event) {
            const body = JSON.parse(event.body || "{}");

            //verifica se o campo 'title' está presente no corpo da requisição
            if (!body.title) {

                //retorna um erro 400 caso o campo 'title' não esteja presente
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "O campo 'title' é obrigatório." }),
                };
            }

            // Monta o objeto da nova tarefa.
            const task = {
                // 🆔 id = Date.now() vira o identificador da task.
                //    Date.now() = quantos MILISSEGUNDOS se passaram desde 01/01/1970
                //    (o "epoch"). Ex.: 1758895200000. Como a chave da tabela é String
                //    (veja dynamodb.tf), convertemos com .toString().
                //    ✅ Simples e serve pro lab (o relógio sempre avança → ids diferentes).
                //    ⚠️ Em produção, o certo seria um UUID de verdade
                //       (ex.: crypto.randomUUID()), porque dois POSTs no MESMO
                //       milissegundo gerariam o mesmo id e um sobrescreveria o outro.
                id: Date.now().toString(),
                title: body.title,        // o texto que o usuário mandou
                done: false,              // toda task nasce "não concluída"
                createdAt: new Date().toISOString(), // data/hora de criação (ISO 8601)
            };

            //comando para inserir o item na tabela do DynamoDB
            const putCommand = new PutCommand({
                TableName: TABLE_NAME,
                Item: task,
            });

            await ddbDocClient.send(putCommand);

            return {
                statusCode: 200,
                body: JSON.stringify({ message: "Task inserida com sucesso!", task }),
            };
        }
        //#endregion

        //#region => Função para listar todas as tasks no DynamoDB
        async function listarTasks(event) {
            // Scan = lê a tabela INTEIRA. Perfeito pra um lab pequeno.
            // ⚠️ Dica de prova/produção: Scan é "caro" em tabelas grandes (varre tudo).
            //    Pra buscas por chave, o ideal é Query. Mas aqui, com poucas tasks, Scan é ok.
            const result = await ddbDocClient.send(new ScanCommand({
                TableName: TABLE_NAME,
            }));

            //retona todos os itens da tabela do DynamoDB
            return {
                statusCode: 200,
                body: JSON.stringify({ message: "Tasks recuperadas com sucesso!", tasks: result.Items }),
            };
        }
        //#endregion

        //#region => Função para deletar uma task no DynamoDB
        async function deletarTask(event) {
            const body = JSON.parse(event.body || "{}");

            //verifica se o campo 'id' está presente no corpo da requisição
            if (!body.id) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "O campo 'id' é obrigatório." }),
                };
            }

            //comando para deletar o item da tabela do DynamoDB
            const deleteCommand = new DeleteCommand({
                TableName: TABLE_NAME,
                Key: { id: body.id },
            });

            await ddbDocClient.send(deleteCommand);

            return {
                statusCode: 200,
                body: JSON.stringify({ message: "Task deletada com sucesso!" }),
            };
        }
        //#endregion

        //#region => Função para atualizar uma task no DynamoDB
        async function atualizarTask(event) {
            const body = JSON.parse(event.body || "{}");

            //verifica se o campo 'id' está presente no corpo da requisição
            if (!body.id) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "O campo 'id' é obrigatório." }),
                };
            }

            // Monta o UPDATE dinamicamente: só atualiza os campos que vieram no body.
            // Detalhe do DynamoDB: 'title' e 'done' são PALAVRAS RESERVADAS, então não
            // dá pra usá-las direto na expressão. A saída é usar "apelidos" com #:
            //   - names  (ExpressionAttributeNames)  → #title = "title", #done = "done"
            //   - values (ExpressionAttributeValues) → :title = valor,  :done = valor
            //   - sets   → pedaços da expressão, ex.: "#title = :title"
            const sets = [];
            const names = {};
            const values = {};

            if (body.title !== undefined) {
                sets.push("#title = :title");
                names["#title"] = "title";
                values[":title"] = body.title;
            }
            if (body.done !== undefined) {
                sets.push("#done = :done");
                names["#done"] = "done";
                values[":done"] = body.done;
            }

            if (sets.length === 0) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "Envie ao menos um campo para atualizar ('title' ou 'done')." }),
                };
            }

            //comando para atualizar o item da tabela do DynamoDB
            const updateCommand = new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { id: body.id },
                UpdateExpression: "set " + sets.join(", "),
                ExpressionAttributeNames: names,
                ExpressionAttributeValues: values,
                ReturnValues: "ALL_NEW",
            });

            //executa o comando de atualização no DynamoDB
            const result = await ddbDocClient.send(updateCommand);

            //retorna o resultado da atualização
            return {
                statusCode: 200,
                body: JSON.stringify({ message: "Task atualizada com sucesso!", task: result.Attributes }),
            };
        }
        //#endregion

        // Se chegou um método que não é GET/POST/PUT/DELETE, respondemos 405.
        return {
            statusCode: 405,
            body: JSON.stringify({ message: "Método não permitido." }),
        };

        //trata erros que possam ocorrer durante a execução da função
    } catch (error) {

        //retorna um erro interno do servidor em caso de exceção
        console.error("Erro ao processar a requisição: ", error);

        //retorna a resposta 
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Erro interno do servidor." }),
        };
    }
};
