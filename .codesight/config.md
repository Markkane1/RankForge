# Config

## Environment Variables

- `ANALYZE` **required** — apps\web\next.config.js
- `CI` **required** — apps\web\playwright.config.js
- `DATABASE_URL` (has default) — packages\database\.env
- `DIRECT_URL` (has default) — packages\database\.env
- `EMAIL_FROM` **required** — apps\web\src\auth.js
- `EMAIL_SERVER` **required** — apps\web\src\auth.js
- `ENCRYPTION_KEY` **required** — apps\api\src\modules\security\encryption.service.js
- `FRONTEND_URL` **required** — apps\api\src\modules\gbp\gbp.controller.js
- `GCP_KMS_CRYPTOKEY` **required** — apps\web\src\lib\kms.js
- `GCP_KMS_KEYRING` **required** — apps\web\src\lib\kms.js
- `GCP_KMS_LOCATION` **required** — apps\web\src\lib\kms.js
- `GOOGLE_APPLICATION_CREDENTIALS` **required** — apps\web\src\lib\crypto.js
- `GOOGLE_CLIENT_ID` **required** — apps\api\src\modules\gbp\gbp.service.js
- `GOOGLE_CLIENT_SECRET` **required** — apps\api\src\modules\gbp\gbp.service.js
- `GOOGLE_CLOUD_PROJECT` **required** — apps\web\src\lib\kms.js
- `GOOGLE_REDIRECT_URI` **required** — apps\api\src\modules\gbp\gbp.service.js
- `GOOGLE_WEBHOOK_SECRET` (has default) — packages\database\.env
- `GOOGLE_WEBHOOK_VERIFY_TOKEN` (has default) — packages\database\.env
- `META_WEBHOOK_SECRET` **required** — apps\web\src\app\api\webhooks\meta\route.js
- `NEXT_PUBLIC_API_URL` (has default) — packages\database\.env
- `NEXT_PUBLIC_APP_URL` **required** — apps\web\src\app\api\auth\google-business\callback\route.js
- `NEXT_PUBLIC_SENTRY_DSN` **required** — apps\web\sentry.client.config.js
- `NEXTAUTH_SECRET` (has default) — packages\database\.env
- `NEXTAUTH_URL` (has default) — packages\database\.env
- `NODE_ENV` **required** — apps\web\src\lib\env.js
- `OPENAI_API_KEY` **required** — apps\web\src\app\api\clients\[id]\posts\generate\route.js
- `PORT` **required** — apps\api\src\main.js
- `REDIS_URL` (has default) — packages\database\.env
- `RESEND_API_KEY` **required** — apps\worker\src\mailer.js
- `SENTRY_DSN` **required** — apps\api\src\main.js
- `TWO_FACTOR_ENCRYPTION_KEY` (has default) — packages\database\.env

## Config Files

- `.env.example`
- `apps\web\next.config.js`
- `apps\web\next.config.ts`
- `apps\web\tailwind.config.js`
- `apps\web\tailwind.config.ts`
- `docker-compose.yml`
- `tsconfig.json`
