import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

/*
 * Contact form handler behind API Gateway (HTTP API, payload format 2.0).
 *
 * No CORS headers here on purpose: CloudFront serves this under /api/* on the
 * same origin as the site, so the browser never issues a preflight. If you ever
 * expose the API Gateway URL directly to a browser, you will need to add them.
 *
 * The SES client comes from the Lambda Node runtime's bundled AWS SDK v3, so
 * the deployment package stays dependency-free.
 */

const ses = new SESv2Client({});

const TO_ADDRESS = process.env.CONTACT_TO_ADDRESS;
const FROM_ADDRESS = process.env.CONTACT_FROM_ADDRESS;

const LIMITS = {
  name: 100,
  email: 200,
  message: 5000,
  messageMin: 10,
};

// Deliberately permissive. SES is the real validator; this only catches typos.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/*
 * Best-effort per-container throttle. Lambda scales out, so this is NOT a real
 * rate limit — API Gateway's route-level throttle in Terraform is. This just
 * blunts a single client hammering one warm container.
 */
const RECENT = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 3;

function rateLimited(ip) {
  const now = Date.now();
  const hits = (RECENT.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  RECENT.set(ip, hits);

  // Bound memory on a long-lived container.
  if (RECENT.size > 1000) {
    for (const [key, times] of RECENT) {
      if (times.every((t) => now - t >= WINDOW_MS)) RECENT.delete(key);
    }
  }
  return hits.length > MAX_PER_WINDOW;
}

function reply(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

/** Strips CR/LF so a crafted name cannot inject extra email headers. */
function singleLine(value) {
  return String(value).replace(/[\r\n]+/g, ' ').trim();
}

function validate(payload) {
  const name = singleLine(payload.name ?? '');
  const email = singleLine(payload.email ?? '');
  const message = String(payload.message ?? '').trim();

  if (!name || name.length > LIMITS.name) return { error: 'Invalid name.' };
  if (!email || email.length > LIMITS.email || !EMAIL_PATTERN.test(email)) {
    return { error: 'Invalid email address.' };
  }
  if (message.length < LIMITS.messageMin || message.length > LIMITS.message) {
    return { error: 'Invalid message.' };
  }
  return { value: { name, email, message } };
}

export const handler = async (event) => {
  if (!TO_ADDRESS || !FROM_ADDRESS) {
    console.error('Missing CONTACT_TO_ADDRESS or CONTACT_FROM_ADDRESS');
    return reply(500, { ok: false, error: 'Server not configured.' });
  }

  let payload;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body ?? '', 'base64').toString('utf8')
      : (event.body ?? '');
    payload = JSON.parse(raw);
  } catch {
    return reply(400, { ok: false, error: 'Malformed request.' });
  }

  /*
   * Honeypot hit. Return 200 so the bot records a success and does not retry
   * or adapt — a 4xx here just teaches it which field to leave blank.
   */
  if (payload.website) {
    console.log('Honeypot triggered; dropping submission.');
    return reply(200, { ok: true });
  }

  const ip = event.requestContext?.http?.sourceIp ?? 'unknown';
  if (rateLimited(ip)) {
    return reply(429, { ok: false, error: 'Too many messages. Please try again shortly.' });
  }

  const { value, error } = validate(payload);
  if (error) return reply(400, { ok: false, error });

  try {
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: FROM_ADDRESS,
        Destination: { ToAddresses: [TO_ADDRESS] },
        // Lets you hit reply in your mail client and answer the sender directly.
        ReplyToAddresses: [value.email],
        Content: {
          Simple: {
            Subject: { Data: `Portfolio contact from ${value.name}`, Charset: 'UTF-8' },
            Body: {
              Text: {
                Data: `From: ${value.name} <${value.email}>\nIP: ${ip}\n\n${value.message}\n`,
                Charset: 'UTF-8',
              },
            },
          },
        },
      }),
    );
  } catch (err) {
    // Log the cause, but never leak SES internals to the browser.
    console.error('SES send failed', err);
    return reply(502, { ok: false, error: 'Could not send message.' });
  }

  return reply(200, { ok: true });
};
