# =============================================================================
#  LAMBDA — a função que roda o CRUD (handler.mjs)
# =============================================================================
#  Aqui o Terraform faz o papel do "sam build": ele mesmo empacota a pasta
#  ../api em um .zip e envia pra AWS. Assim o aluno NÃO precisa do SAM CLI.
# =============================================================================

# --- Empacota a pasta api/ em um .zip automaticamente ---
#     (usa o provider "archive", que o terraform init baixa junto)
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../api"
  output_path = "${path.module}/lambda_build.zip"
}

# --- A função Lambda em si ---
resource "aws_lambda_function" "tasks" {
  function_name = "${var.project_name}-function"
  role          = aws_iam_role.lambda_role.arn

  # handler.handleTasks  →  arquivo handler.mjs, função exportada handleTasks
  handler = "handler.handleTasks"
  # Node 22 = versão LTS ativa. (O nodejs18.x foi DEPRECIADO pela AWS: desde
  # set/2025 não dá mais pra criar função nova nele — por isso usamos o 22.x.)
  runtime = "nodejs22.x"

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  timeout = 10

  environment {
    variables = {
      # o código lê process.env.TASKS_TABLE — passamos o nome real da tabela
      TASKS_TABLE = aws_dynamodb_table.tasks.name
    }
  }

  # garante que a role/políticas existam antes de criar a função
  depends_on = [
    aws_iam_role_policy.lambda_dynamodb,
    aws_iam_role_policy_attachment.lambda_logs,
  ]
}

# --- Permissão para o API Gateway invocar esta Lambda ---
resource "aws_lambda_permission" "apigw_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.tasks.function_name
  principal     = "apigateway.amazonaws.com"

  # restringe a invocação a esta API específica
  source_arn = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}
