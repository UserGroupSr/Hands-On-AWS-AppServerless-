# =============================================================================
#  PROVIDER AWS
# =============================================================================
#
#  ⚠️⚠️⚠️  ATENÇÃO — LEIA ANTES DE USAR  ⚠️⚠️⚠️
#
#  As credenciais da AWS (access_key / secret_key) estão ESCRITAS DIRETO
#  NO CÓDIGO abaixo DE PROPÓSITO.
#
#  POR QUÊ fizemos isso (contexto do lab):
#    - Este lab roda em máquinas da faculdade que estão numa rede travada.
#    - Nessas máquinas NÃO dá pra instalar o AWS CLI (sem permissão de admin),
#      logo NÃO existe o comando `aws configure` nem o arquivo ~/.aws/credentials.
#    - O Terraform é usado como binário PORTÁTIL (terraform.exe na pasta),
#      sem instalação.
#    - Sem CLI e sem variáveis de ambiente configuráveis, a ÚNICA forma de dar
#      credencial pro Terraform é colocá-la aqui no bloco `provider`.
#
#  POR QUE ISSO É RUIM (e é a lição de segurança do workshop):
#    - Chave hardcoded VAZA fácil: vai pro Git, fica no histórico pra sempre,
#      aparece em screenshot, em backup, etc.
#    - Qualquer pessoa com acesso ao arquivo tem acesso TOTAL à conta AWS.
#    - Em ambiente REAL isso NUNCA deve ser feito. O certo seria:
#        * `aws configure` (perfil local ~/.aws/credentials), ou
#        * variáveis de ambiente AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY, ou
#        * IAM Roles (EC2/ECS/Lambda) — sem chave nenhuma no código, ou
#        * AWS SSO / IAM Identity Center.
#
#  Ou seja: fazemos o "errado" aqui SÓ porque a máquina não deixa fazer o certo,
#  e deixamos isso explícito pra ninguém copiar esse padrão pra produção.
# =============================================================================

terraform {
  required_version = ">= 1.3.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  # 🔴 CREDENCIAIS HARDCODED — os valores vêm do arquivo secrets.auto.tfvars
  #    (que o Terraform carrega sozinho). Cole suas chaves LÁ, não aqui.
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key

  # Se você estiver usando credenciais TEMPORÁRIAS (AWS Academy / Learner Lab,
  # que geram um "aws_session_token"), descomente a linha abaixo e preencha
  # a variável aws_session_token em secrets.auto.tfvars. Se for chave normal
  # de usuário IAM, DEIXE COMENTADO.
  # token = var.aws_session_token
}
