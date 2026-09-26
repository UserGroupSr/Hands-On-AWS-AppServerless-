# =============================================================================
#  OUTPUTS — o que aparece no terminal depois do "terraform apply"
# =============================================================================
#  Durante o apply, o próprio Terraform vai mostrando cada recurso:
#     aws_dynamodb_table.tasks: Creating...
#     aws_dynamodb_table.tasks: Creation complete after 8s
#  E no FINAL, os outputs abaixo aparecem como um "painel" de resumo.
# =============================================================================

# --- Valores individuais (úteis pra scripts) ---
output "api_url" {
  description = "URL base da API. É aqui que você faz as chamadas (GET/POST/PUT/DELETE /tasks)."
  value       = "${aws_apigatewayv2_stage.default.invoke_url}/tasks"
}

output "dynamodb_table" {
  description = "Nome da tabela DynamoDB criada."
  value       = aws_dynamodb_table.tasks.name
}

output "lambda_function" {
  description = "Nome da função Lambda criada."
  value       = aws_lambda_function.tasks.function_name
}

output "region" {
  description = "Região onde tudo foi criado."
  value       = var.aws_region
}

# --- Painel de resumo bonito (aparece grande no final do apply) ---
output "z_resumo" {
  description = "Resumo visual do que foi criado + como testar."
  value       = <<-EOT

    ╔══════════════════════════════════════════════════════════════════════╗
    ║                                                                        ║
    ║        ✅  APP SERVERLESS NO AR!  Recursos criados com sucesso.        ║
    ║                                                                        ║
    ╠══════════════════════════════════════════════════════════════════════╣
    ║                                                                        ║
    ║   🌐  API Gateway (HTTP API)   →  ${var.project_name}-http-api
    ║   λ   Lambda (Node.js 22)      →  ${aws_lambda_function.tasks.function_name}
    ║   🗄️   DynamoDB (tabela)        →  ${aws_dynamodb_table.tasks.name}
    ║   🔐  IAM Role da Lambda       →  ${aws_iam_role.lambda_role.name}
    ║   📍  Região                   →  ${var.aws_region}
    ║                                                                        ║
    ╠══════════════════════════════════════════════════════════════════════╣
    ║                                                                        ║
    ║   🔗  URL da sua API:                                                  ║
    ║                                                                        ║
    ║   ${aws_apigatewayv2_stage.default.invoke_url}/tasks

    ║                                                                        ║
    ╠══════════════════════════════════════════════════════════════════════╣
    ║                                                                        ║
    ║   🕹️   TESTE RÁPIDO (copie e cole no terminal):                        ║
    ║                                                                        ║
    ║   # Criar uma tarefa:                                                  ║
    ║   curl -X POST "${aws_apigatewayv2_stage.default.invoke_url}/tasks" -H "Content-Type: application/json" -d '{ \"title\": \"Minha primeira task\" }'

    ║                                                                        ║
    ║   # Listar as tarefas:                                                 ║
    ║   curl "${aws_apigatewayv2_stage.default.invoke_url}/tasks"

    ║                                                                        ║
    ║   Sem terminal? Teste no navegador em: https://hoppscotch.io          ║
    ║                                                                        ║
    ╠══════════════════════════════════════════════════════════════════════╣
    ║                                                                        ║
    ║   🧹  Quando terminar, APAGUE TUDO com:   terraform destroy            ║
    ║       (não deixa nada rodando/cobrando na sua conta)                   ║
    ║                                                                        ║
    ╚══════════════════════════════════════════════════════════════════════╝

  EOT
}
