# Libraries

> **Navigation aid.** Library inventory extracted via AST. Read the source files listed here before modifying exported functions.

**82 library files** across 5 modules

## Web (42 files)

- `apps\web\src\lib\api.js` — getDashboard, getClients, getClientDetail, updateClientState, updateClientNotes, getTasks, …
- `apps\web\src\lib\api.ts` — getDashboard, getClients, getClientDetail, updateClientState, updateClientNotes, getTasks, …
- `apps\web\src\lib\validations.js` — isSafeExternalUrl, safeUrlSchema, safeUrlOptionalSchema, createClientSchema, updateClientSettingsSchema, createKeywordSchema, …
- `apps\web\src\lib\validations.ts` — isSafeExternalUrl, safeUrlSchema, safeUrlOptionalSchema, createClientSchema, updateClientSettingsSchema, createKeywordSchema, …
- `apps\web\src\lib\rate-limit.ts` — rateLimit, getLockout, recordFailure, clearFailures, rateLimitLogin, rateLimit2fa, …
- `apps\web\src\lib\rate-limit.js` — rateLimit, getLockout, recordFailure, clearFailures, rateLimitLogin, rateLimit2fa, …
- `apps\web\src\lib\auth-guard.ts` — requireSession, requireRole, requireOwner, hasMinimumRole, SessionUser, AuthResult, …
- `apps\web\src\lib\auth-guard.js` — requireSession, requireRole, requireOwner, hasMinimumRole, ROLE_HIERARCHY
- `apps\web\src\lib\realtime.js` — getSocket, joinRoom, leaveRoom, emitTaskUpdate, emitApprovalUpdate
- `apps\web\src\lib\realtime.ts` — getSocket, joinRoom, leaveRoom, emitTaskUpdate, emitApprovalUpdate
- `apps\web\src\lib\crypto.js` — encryptSecret, decryptSecret, verifyGoogleWebhookSignature, getSignInIp
- `apps\web\src\lib\crypto.ts` — encryptSecret, decryptSecret, verifyGoogleWebhookSignature, getSignInIp
- `apps\web\src\lib\hooks.js` — useCurrentUser, hasRole, hasMinimumRole
- `apps\web\src\lib\hooks.ts` — useCurrentUser, hasRole, hasMinimumRole
- `apps\web\src\lib\kms.js` — getKmsKeyName, encryptWithKms, decryptWithKms
- `apps\web\src\lib\kms.ts` — getKmsKeyName, encryptWithKms, decryptWithKms
- `apps\web\src\lib\utils.js` — cn, appendUtmTags
- `apps\web\src\lib\utils.ts` — cn, appendUtmTags
- `apps\web\src\hooks\use-mobile.js` — useIsMobile
- `apps\web\src\hooks\use-mobile.ts` — useIsMobile
- `apps\web\src\hooks\use-toast.js` — reducer
- `apps\web\src\hooks\use-toast.ts` — reducer
- `apps\web\src\lib\integrations\brightlocal.js` — BrightLocalClient
- `apps\web\src\lib\integrations\brightlocal.ts` — BrightLocalClient
- `apps\web\src\lib\integrations\dataforseo.js` — DataForSeoClient
- _…and 17 more files_

## Api (28 files)

- `apps\api\src\common\decorators\roles.decorator.js` — RequireRole, ROLES_KEY
- `apps\api\src\common\decorators\roles.decorator.ts` — RequireRole, ROLES_KEY
- `apps\api\src\app.controller.ts` — AppController
- `apps\api\src\app.module.ts` — AppModule
- `apps\api\src\app.service.ts` — AppService
- `apps\api\src\common\filters\sentry-exception.filter.ts` — SentryExceptionFilter
- `apps\api\src\common\guards\roles.guard.ts` — RolesGuard
- `apps\api\src\common\middleware\tenant.middleware.ts` — TenantMiddleware
- `apps\api\src\modules\brightlocal\brightlocal.controller.ts` — BrightlocalController
- `apps\api\src\modules\brightlocal\brightlocal.module.ts` — BrightlocalModule
- `apps\api\src\modules\brightlocal\brightlocal.service.ts` — BrightlocalService
- `apps\api\src\modules\dataforseo\dataforseo.controller.ts` — DataforseoController
- `apps\api\src\modules\dataforseo\dataforseo.module.ts` — DataforseoModule
- `apps\api\src\modules\dataforseo\dataforseo.service.ts` — DataforseoService
- `apps\api\src\modules\gbp\gbp.controller.ts` — GbpController
- `apps\api\src\modules\gbp\gbp.dto.js` — UpdateGbpProfileDto
- `apps\api\src\modules\gbp\gbp.dto.ts` — UpdateGbpProfileDto
- `apps\api\src\modules\gbp\gbp.module.ts` — GbpModule
- `apps\api\src\modules\gbp\gbp.service.ts` — GbpService
- `apps\api\src\modules\localfalcon\localfalcon.controller.ts` — LocalfalconController
- `apps\api\src\modules\localfalcon\localfalcon.module.ts` — LocalfalconModule
- `apps\api\src\modules\localfalcon\localfalcon.service.ts` — LocalfalconService
- `apps\api\src\modules\security\credentials.service.ts` — CredentialsService
- `apps\api\src\modules\security\encryption.service.ts` — EncryptionService
- `apps\api\src\modules\security\security.module.ts` — SecurityModule
- _…and 3 more files_

## Database (6 files)

- `packages\database\src\state-machine.js` — validateTransition, IllegalStateTransitionError, LEGAL_TRANSITIONS
- `packages\database\src\state-machine.ts` — validateTransition, IllegalStateTransitionError, LEGAL_TRANSITIONS
- `packages\database\src\playbook.js` — logPlaybookTactic, analyzeNichePlaybook
- `packages\database\src\playbook.ts` — logPlaybookTactic, analyzeNichePlaybook
- `packages\database\src\conflict-check.js` — ConflictOfInterestError
- `packages\database\src\conflict-check.ts` — ConflictOfInterestError

## Worker (4 files)

- `apps\worker\src\mailer.js` — sendStatusAlert
- `apps\worker\src\mailer.ts` — sendStatusAlert
- `apps\worker\src\schedulers.js` — initSchedulers
- `apps\worker\src\schedulers.ts` — initSchedulers

## Queue (2 files)

- `packages\queue\src\idempotency.js` — withRetry, IdempotentWriter
- `packages\queue\src\idempotency.ts` — withRetry, IdempotentWriter

---
_Back to [overview.md](./overview.md)_