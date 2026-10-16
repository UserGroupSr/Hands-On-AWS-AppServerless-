// Handler da Lambda responsável pelo CRUD de tarefas no DynamoDB.
// Recebe a requisição do API Gateway, identifica o método HTTP e acessa a tabela.
// O runtime da Lambda no Node.js 18 ou superior já inclui o AWS SDK usado aqui.

// O cliente base se conecta ao DynamoDB; o DocumentClient permite trabalhar
// com objetos JavaScript comuns, sem usar o formato interno do DynamoDB.
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    PutCommand,    // Insere uma tarefa.
    ScanCommand,   // Consulta todas as tarefas.
    DeleteCommand, // Remove uma tarefa.
    UpdateCommand  // Atualiza uma tarefa.
} from "@aws-sdk/lib-dynamodb";

// O cliente fica fora do handler para ser reaproveitado entre invocações.
// Assim, a Lambda não precisa criar uma nova conexão a cada requisição.
const client = new DynamoDBClient({ region: "us-east-1" });
const ddbDocClient = DynamoDBDocumentClient.from(client);

// O Terraform informa o nome da tabela por meio da variável de ambiente TASKS_TABLE.
// Dessa forma, o mesmo código pode ser usado com tabelas diferentes.
const TABLE_NAME = process.env.TASKS_TABLE;

// Este é o ponto de entrada da Lambda. O evento contém o método HTTP,
// o corpo da requisição, os headers e outras informações do API Gateway.
export const handleTasks = async (event) => {

    // Registra no CloudWatch o evento recebido para facilitar a investigação de erros.
    console.log("Evento recebido: ", JSON.stringify(event, null, 2));

    try {

        // Obtém o método HTTP dos formatos usados pelo API Gateway.
        // APIs HTTP usam requestContext.http.method; APIs REST usam httpMethod.
        const httpMethod =
            event?.requestContext?.http?.method ||
            event?.httpMethod;

        // Sem o método HTTP, não é possível decidir qual operação executar.
        if (!httpMethod) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Não foi possível identificar o método HTTP na requisição." }),
            };
        }

        // Encaminha a requisição para a função correspondente ao método HTTP.
        if (httpMethod === "POST") return await criarTask(event);
        if (httpMethod === "GET") return await listarTasks(event);
        if (httpMethod === "DELETE") return await deletarTask(event);
        if (httpMethod === "PUT") return await atualizarTask(event);

        //#region Função que cria uma tarefa no DynamoDB.
        async function criarTask(event) {
            const body = JSON.parse(event.body || "{}");

            // Exige um título para criar a tarefa.
            if (!body.title) {

                // Informa ao cliente que o título não foi enviado.
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "O campo 'title' é obrigatório." }),
                };
            }

            // Monta o objeto que será salvo como uma nova tarefa.
            const task = {
                // Usa a data atual, convertida para texto, como identificador da tarefa.
                // O valor representa milissegundos desde 1º de janeiro de 1970.
                // Para este laboratório, isso produz um identificador diferente em cada chamada.
                // Em produção, um UUID seria mais seguro para evitar colisões.
                id: Date.now().toString(),
                title: body.title,        // Guarda o título enviado pelo usuário.
                done: false,              // Toda tarefa começa como não concluída.
                createdAt: new Date().toISOString(), // Registra a data de criação no padrão ISO 8601.
            };

            // Prepara o comando que insere a tarefa na tabela.
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

        //#region Função que lista todas as tarefas do DynamoDB.
        async function listarTasks(event) {
            // Scan percorre todos os itens e é suficiente para a tabela pequena deste laboratório.
            // Em tabelas grandes, uma consulta por chave com Query costuma ser mais adequada.
            const result = await ddbDocClient.send(new ScanCommand({
                TableName: TABLE_NAME,
            }));

            // Retorna os itens encontrados na tabela.
            return {
                statusCode: 200,
                body: JSON.stringify({ message: "Tasks recuperadas com sucesso!", tasks: result.Items }),
            };
        }
        //#endregion

        //#region Função que remove uma tarefa do DynamoDB.
        async function deletarTask(event) {
            const body = JSON.parse(event.body || "{}");

            // Exige o identificador da tarefa que será removida.
            if (!body.id) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "O campo 'id' é obrigatório." }),
                };
            }

            // Prepara o comando que remove a tarefa da tabela.
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

        //#region Função que atualiza uma tarefa no DynamoDB.
        async function atualizarTask(event) {
            const body = JSON.parse(event.body || "{}");

            // Exige o identificador da tarefa que será atualizada.
            if (!body.id) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "O campo 'id' é obrigatório." }),
                };
            }

            // Monta a atualização apenas com os campos enviados no corpo da requisição.
            // Como title e done são nomes reservados do DynamoDB, usa apelidos
            // em names e values para montar a expressão de atualização.
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

            // Prepara o comando que atualiza a tarefa na tabela.
            const updateCommand = new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { id: body.id },
                UpdateExpression: "set " + sets.join(", "),
                ExpressionAttributeNames: names,
                ExpressionAttributeValues: values,
                ReturnValues: "ALL_NEW",
            });

            // Executa a atualização no DynamoDB.
            const result = await ddbDocClient.send(updateCommand);

            // Retorna a tarefa depois da atualização.
            return {
                statusCode: 200,
                body: JSON.stringify({ message: "Task atualizada com sucesso!", task: result.Attributes }),
            };
        }
        //#endregion

        // Responde com 405 quando o método HTTP não é suportado.
        return {
            statusCode: 405,
            body: JSON.stringify({ message: "Método não permitido." }),
        };

        // Captura erros que ocorram durante o processamento da requisição.
    } catch (error) {

        // Registra o erro e informa ao cliente que houve uma falha interna.
        console.error("Erro ao processar a requisição: ", error);

        // Retorna a resposta de erro ao cliente.
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Erro interno do servidor." }),
        };
    }
};
