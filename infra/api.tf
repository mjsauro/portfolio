/*
 * Contact API: HTTP API -> Lambda -> SES.
 *
 * The route path is /api/contact rather than /contact so CloudFront can forward
 * the path through unchanged under its /api/* behavior.
 */

data "archive_file" "contact" {
  type        = "zip"
  source_dir  = "${path.module}/../api/contact"
  output_path = "${path.module}/.build/contact.zip"
}

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "contact" {
  name               = "${var.project_name}-contact"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "contact_logs" {
  role       = aws_iam_role.contact.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "contact_ses" {
  statement {
    effect    = "Allow"
    actions   = ["ses:SendEmail"]
    resources = ["*"]

    # Restricts the function to sending *from* the verified identity, so a
    # compromised handler cannot send as arbitrary addresses.
    condition {
      test     = "StringEquals"
      variable = "ses:FromAddress"
      values   = [var.contact_from_address]
    }
  }
}

resource "aws_iam_role_policy" "contact_ses" {
  name   = "ses-send"
  role   = aws_iam_role.contact.id
  policy = data.aws_iam_policy_document.contact_ses.json
}

# Declared explicitly so retention is managed; Lambda would otherwise create
# this group with infinite retention on first invocation.
resource "aws_cloudwatch_log_group" "contact" {
  name              = "/aws/lambda/${var.project_name}-contact"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "contact" {
  function_name = "${var.project_name}-contact"
  role          = aws_iam_role.contact.arn
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  architectures = ["arm64"]
  timeout       = 10
  memory_size   = 256

  filename         = data.archive_file.contact.output_path
  source_code_hash = data.archive_file.contact.output_base64sha256

  environment {
    variables = {
      CONTACT_TO_ADDRESS   = var.contact_to_address
      CONTACT_FROM_ADDRESS = var.contact_from_address
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.contact_logs,
    aws_cloudwatch_log_group.contact,
  ]
}

resource "aws_apigatewayv2_api" "contact" {
  name          = "${var.project_name}-contact"
  protocol_type = "HTTP"
  description   = "Contact form API, fronted by CloudFront"

  # No cors_configuration block: requests arrive same-origin through CloudFront.
}

resource "aws_apigatewayv2_integration" "contact" {
  api_id                 = aws_apigatewayv2_api.contact.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.contact.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "contact" {
  api_id    = aws_apigatewayv2_api.contact.id
  route_key = "POST /api/contact"
  target    = "integrations/${aws_apigatewayv2_integration.contact.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.contact.id
  name        = "$default"
  auto_deploy = true

  # The real rate limit. The Lambda's in-memory check is only per-container.
  default_route_settings {
    throttling_rate_limit  = var.api_throttle_rate_limit
    throttling_burst_limit = var.api_throttle_burst_limit
  }
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.contact.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.contact.execution_arn}/*/*"
}
