# =============================================================================
#  VARIÁVEIS DO LAB  (apenas as DECLARAÇÕES — sem valores de credencial)
# =============================================================================
#  Este arquivo é seguro de commitar: ele só DECLARA as variáveis (o "molde").
#  Os VALORES das chaves ficam em "secrets.auto.tfvars" (que é ignorado no git).
#
#  👉 Como preencher suas chaves:
#     1. copie      secrets.auto.tfvars.example  ->  secrets.auto.tfvars
#     2. cole suas chaves dentro de secrets.auto.tfvars
#     O Terraform carrega arquivos *.auto.tfvars automaticamente, sem flag.
# =============================================================================

# --- Região onde tudo será criado ---
variable "aws_region" {
  description = "Região da AWS onde os recursos serão criados."
  type        = string
  default     = "us-east-1"
}

# --- 🔴 SUA ACCESS KEY (valor vem de secrets.auto.tfvars) ---
variable "aws_access_key" {
  description = "Access Key ID da AWS (HARDCODED só por causa da máquina travada do lab)."
  type        = string
}

# --- 🔴 SUA SECRET KEY (valor vem de secrets.auto.tfvars) ---
variable "aws_secret_key" {
  description = "Secret Access Key da AWS (HARDCODED só por causa da máquina travada do lab)."
  type        = string
  sensitive   = true
}

# --- Token de sessão (SÓ para credenciais temporárias tipo AWS Academy) ---
#     Se você usa chave normal de usuário IAM, deixe vazio no tfvars.
variable "aws_session_token" {
  description = "Session Token (apenas para credenciais temporárias, ex: AWS Academy/Learner Lab)."
  type        = string
  sensitive   = true
  default     = ""
}

# --- Nome base do projeto (usado para nomear os recursos) ---
variable "project_name" {
  description = "Prefixo usado nos nomes dos recursos na AWS."
  type        = string
  default     = "lab-app-serverless"
}
