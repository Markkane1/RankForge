# Project Context

This is a typescript project using nestjs, next-app with prisma.
It is a monorepo with workspaces: api (apps\api), web (apps\web), worker (apps\worker), @rankforge/database (packages\database), @rankforge/queue (packages\queue).

The API has 81 routes. See .codesight/routes.md for the full route map with methods, paths, and tags.
The database has 45 models. See .codesight/schema.md for the full schema with fields, types, and relations.
The UI has 23 components. See .codesight/components.md for the full list with props.
Middleware includes: custom, auth, rate-limit.

High-impact files (most imported, changes here affect many other files):
- apps\api\src\modules\security\security.module.ts (imported by 10 files)
- apps\api\src\modules\security\credentials.service.ts (imported by 8 files)
- apps\api\src\app.service.ts (imported by 5 files)
- apps\api\src\modules\gbp\gbp.service.ts (imported by 5 files)
- apps\api\src\app.controller.ts (imported by 4 files)
- apps\api\src\app.module.ts (imported by 4 files)
- apps\web\src\lib\kms.ts (imported by 4 files)
- apps\api\src\modules\brightlocal\brightlocal.service.ts (imported by 3 files)

Required environment variables (no defaults):
- ANALYZE (apps\web\next.config.js)
- CI (apps\web\playwright.config.js)
- EMAIL_FROM (apps\web\src\auth.js)
- EMAIL_SERVER (apps\web\src\auth.js)
- ENCRYPTION_KEY (apps\api\src\modules\security\encryption.service.js)
- FRONTEND_URL (apps\api\src\modules\gbp\gbp.controller.js)
- GCP_KMS_CRYPTOKEY (apps\web\src\lib\kms.js)
- GCP_KMS_KEYRING (apps\web\src\lib\kms.js)
- GCP_KMS_LOCATION (apps\web\src\lib\kms.js)
- GOOGLE_APPLICATION_CREDENTIALS (apps\web\src\lib\crypto.js)
- GOOGLE_CLIENT_ID (apps\api\src\modules\gbp\gbp.service.js)
- GOOGLE_CLIENT_SECRET (apps\api\src\modules\gbp\gbp.service.js)
- GOOGLE_CLOUD_PROJECT (apps\web\src\lib\kms.js)
- GOOGLE_REDIRECT_URI (apps\api\src\modules\gbp\gbp.service.js)
- META_WEBHOOK_SECRET (apps\web\src\app\api\webhooks\meta\route.js)

See .codesight/cicd.md for additional cicd context.
See .codesight/githooks.md for additional githooks context.

Read .codesight/wiki/index.md for orientation (WHERE things live). Then read actual source files before implementing. Wiki articles are navigation aids, not implementation guides.
Read .codesight/CODESIGHT.md for the complete AI context map including all routes, schema, components, libraries, config, middleware, and dependency graph.
