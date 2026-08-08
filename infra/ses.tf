/*
 * SES identities.
 *
 * A new AWS account's SES is in SANDBOX mode: it can only send to addresses you
 * have verified, and is capped at 200 messages/day. For a contact form whose
 * only recipient is you, that is fine — leave it in the sandbox.
 *
 * Creating the identity does not verify it. AWS emails a confirmation link to
 * each address; click it, or `terraform apply` will succeed while sending still
 * fails with MessageRejected.
 */

resource "aws_sesv2_email_identity" "from" {
  email_identity = var.contact_from_address
}

# Only needed when the recipient differs from the sender. In sandbox mode BOTH
# ends must be verified.
resource "aws_sesv2_email_identity" "to" {
  count          = var.contact_to_address == var.contact_from_address ? 0 : 1
  email_identity = var.contact_to_address
}
