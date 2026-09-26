# =============================================================================
#  IAM — permissões da função Lambda
# =============================================================================
#  No SAM, o "DynamoDBCrudPolicy" fazia isso magicamente. No Terraform a gente
#  escreve na mão (o que é ótimo pro aluno ENXERGAR o que está acontecendo):
#
#    1. Uma "Role" que a Lambda assume ao rodar (trust policy).
#    2. Permissão pra escrever logs no CloudWatch.
#    3. Permissão de CRUD SÓ na tabela deste projeto (menor privilégio).
# =============================================================================

# --- 1. Role que a Lambda vai assumir ---
resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-lambda-role"

  # Quem pode "vestir" essa role? O serviço Lambda.
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "lambda.amazonaws.com" }
        Action    = "sts:AssumeRole"
      }
    ]
  })
}

# --- 2. Permissão de escrever logs no CloudWatch ---
#     (política gerenciada pronta da AWS para execução básica de Lambda)
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# --- 3. Permissão de CRUD só na tabela do projeto (menor privilégio) ---
resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "${var.project_name}-dynamodb-crud"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan",
          "dynamodb:Query",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        # ARN da tabela específica → nada de acesso a outras tabelas.
        Resource = [
          aws_dynamodb_table.tasks.arn,
          "${aws_dynamodb_table.tasks.arn}/index/*"
        ]
      }
    ]
  })
}
