# =============================================================================
#  API GATEWAY (HTTP API v2) — a porta de entrada da API
# =============================================================================
#  Cria o mesmo que o SAM criava: uma HTTP API com as rotas
#  GET / POST / PUT / DELETE em /tasks, todas apontando pra mesma Lambda.
# =============================================================================

# --- A API HTTP em si ---
resource "aws_apigatewayv2_api" "http_api" {
  name          = "${var.project_name}-http-api"
  protocol_type = "HTTP"
}

# --- Integração: liga a API à Lambda (proxy) ---
resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.tasks.invoke_arn
  payload_format_version = "2.0" # o handler já trata o payload 2.0
}

# --- Rotas: todas em /tasks, mudando só o método HTTP ---
#     Usamos for_each pra não repetir o mesmo bloco 4 vezes.
resource "aws_apigatewayv2_route" "tasks" {
  for_each = toset(["GET", "POST", "PUT", "DELETE"])

  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "${each.value} /tasks"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# --- Stage com auto-deploy (o "$default" já responde na raiz da URL) ---
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}
