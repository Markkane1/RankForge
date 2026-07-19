# Webhook Endpoints

## Google Webhook

**Endpoint:** `GET|POST /api/webhooks/google`

### Configuration

| Env Variable | Description | Required |
|---|---|---|
| `GOOGLE_WEBHOOK_SECRET` | HMAC-SHA256 shared secret for signature verification | Yes |
| `GOOGLE_WEBHOOK_VERIFY_TOKEN` | Token for the verification handshake | Yes |

### Setup

1. In Google Cloud Console / Google Developer Console, configure your webhook URL:
   ```
   https://your-domain.com/api/webhooks/google
   ```

2. Set the subscription mode verification token to match `GOOGLE_WEBHOOK_VERIFY_TOKEN`.

3. Set the webhook secret to match `GOOGLE_WEBHOOK_SECRET`.

### Signature Verification

Google sends a `x-goog-signature` header with each webhook delivery. This header contains a base64-encoded HMAC-SHA256 hash of the raw request body using the shared secret.

The endpoint verifies this signature using constant-time comparison (`crypto.timingSafeEqual`) to prevent timing attacks.

### Verification Handshake

When you subscribe, Google sends a `GET` request with:
- `hub.mode=subscribe`
- `hub.challenge=<random string>`
- `hub.verify_token=<your configured token>`

The endpoint responds with the `hub.challenge` value if the verify token matches.

### Rate Limiting

- **100 requests per minute** per source IP
- Returns `429 Too Many Requests` with a `Retry-After` header when exceeded

### Processing

Webhook payloads are **not processed synchronously**. They're enqueued to the BullMQ task queue (`GoogleWebhookEvent` job type) for async processing by the worker service. This ensures:
- Fast acknowledgment (204 response to Google)
- Automatic retry on failure (3 attempts, exponential backoff)
- No blocking of the web server

### Rotating Secrets

1. Generate a new secret: `openssl rand -base64 32`
2. Update `GOOGLE_WEBHOOK_SECRET` in your environment
3. Update the secret in Google's webhook configuration
4. Both old and new secrets may be valid briefly during propagation
