output "lambda_function_arn" {
  description = "URI of the lambda function"
  value       = module.support_responder_lambda.lambda_function_invoke_arn
}

output "function_name" {
  description = "Name of the lambda function"
  value       = module.support_responder_lambda.lambda_function_name
}
