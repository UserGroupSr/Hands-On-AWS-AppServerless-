import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    PutCommand,
    ScanCommand,
    DeleteCommand,
    UpdateCommand
} from "@aws-sdk/lib-dynamodb";

//instancia o cliente fora do handler para que ele seja reutilizado entre invocações
const client = new DynamoDBClient({ region: "us-east-1" });
const ddbDocClient = DynamoDBDocumentClient.from(client);

//variavel de ambiante configurada no YAML do serverless
const TABLE_NAME = process.env.TASKS_TABLE;

//CRUD serverless para dynamo Db
export const handleTasks = async (event) => {

    //loga o evento recebido para fins de depuração
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

            //passa o body da task para a função que insere no DynamoDB
            const task = {
                id: Date.now().toString(),
                title: body.title,
                done: false,
                createdAt: new Date().toISOString(),
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
            //comando para buscar todos os itens da tabela do DynamoDB
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

            //monta o update dinamicamente só com os campos enviados
            //('title' e 'done' são palavras reservadas no DynamoDB => usar ExpressionAttributeNames)
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

        //caso envie um método HTTP diferente de POST ou GET, retorna um erro 405
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
