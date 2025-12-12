variable "lambda_log_retention_days" {
  description = "The number of days to retain the Lambda logs."
  type        = number
  default     = 90
}

variable "lambda_timeout" {
  description = "The timeout for lambda function execution."
  type        = number
  default     = 10
}

variable "tags" {
  description = "A map of tags to assign to resources."
  type        = map(string)
  default     = {}
}
