locals {
  lambda_function_name = "Support_Responder_Lambda"
  sns_topic_name       = "SupportAutomaticResponder"
}

data "aws_caller_identity" "current" {}

module "support_responder_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "7.16.0"

  function_name   = local.lambda_function_name
  description     = "Lambda function invoked by AWS SES for handling automatic responses for no-reply addresses"
  handler         = "index.handler"
  runtime         = "nodejs22.x"
  create_function = true
  source_path = [
    {
      path = "${path.module}/src/"
      commands = [
        "npm ci",               # install dependencies
        "npm prune --omit=dev", # remove dev dependencies
        ":zip"                  # zip all
      ],
      patterns = [
        "!.*", # Ignore all files
        "index.js",
        "node_modules/.*",
      ]
    }
  ]
  cloudwatch_logs_retention_in_days = var.lambda_log_retention_days
  trigger_on_package_timestamp      = false # necessary to avoid re-deploying the lambda function on every plan/apply in CI
  timeout                           = var.lambda_timeout
  role_name                         = "${local.lambda_function_name}-role"
  tags                              = var.tags
}

resource "aws_lambda_permission" "ses" {
  action          = "lambda:InvokeFunction"
  function_name   = module.support_responder_lambda.lambda_function_name
  principal       = "ses.amazonaws.com"
  source_account  = data.aws_caller_identity.current.account_id
}

resource "aws_sns_topic" "this" {
  name = local.sns_topic_name

  policy = jsonencode({
    "Version": "2008-10-17",
    "Id": "__default_policy_ID",
    "Statement": [
      {
        "Sid": "__default_statement_ID",
        "Effect": "Allow",
        "Principal": {
        "AWS": "*"
      },
      "Action": [
        "SNS:Publish",
        "SNS:RemovePermission",
        "SNS:SetTopicAttributes",
        "SNS:DeleteTopic",
        "SNS:ListSubscriptionsByTopic",
        "SNS:GetTopicAttributes",
        "SNS:AddPermission",
        "SNS:Subscribe"
      ],
      "Resource": "arn:aws:sns:us-west-2:195275644624:SupportAutomaticResponder",
      "Condition": {
        "StringEquals": {
          "AWS:SourceOwner": "195275644624"
        }
      }
    }
  ]
  })

  delivery_policy = jsonencode({
      "http": {
        "defaultHealthyRetryPolicy": {
          "minDelayTarget": 20,
          "maxDelayTarget": 20,
          "numRetries": 3,
          "numMaxDelayRetries": 0,
          "numNoDelayRetries": 0,
          "numMinDelayRetries": 0,
          "backoffFunction": "linear"
        },
        "disableSubscriptionOverrides": false,
        "defaultThrottlePolicy": {
          "maxReceivesPerSecond": 1
        }
      }
    })
}

resource "aws_lambda_permission" "sns" {
  action          = "lambda:InvokeFunction"
  function_name   = module.support_responder_lambda.lambda_function_name
  principal       = "sns.amazonaws.com"
  source_arn  = "arn:aws:sns:us-west-2:${data.aws_caller_identity.current.account_id}:${aws_sns_topic.this.name}"
}
