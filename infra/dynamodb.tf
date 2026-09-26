# =============================================================================
#  DYNAMODB — tabela onde as tasks ficam guardadas
# =============================================================================
#  Equivalente ao "AWS::Serverless::SimpleTable" que existia no template.yaml.
#  A chave primária é o campo "id" (String), igual o código do handler usa.
#
#  billing_mode = PAY_PER_REQUEST  → cobra por uso (sob demanda). Pro lab é
#  melhor que provisionar capacidade fixa, porque quando ninguém usa, não custa.
# =============================================================================

resource "aws_dynamodb_table" "tasks" {
  name         = "${var.project_name}-tasks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S" # S = String
  }

  tags = {
    Projeto = var.project_name
    Lab     = "serverless-terraform"
  }
}
