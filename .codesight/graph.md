# Dependency Graph

## Most Imported Files (change these carefully)

- `apps\api\src\modules\security\security.module.ts` — imported by **10** files
- `apps\api\src\modules\security\credentials.service.ts` — imported by **8** files
- `apps\api\src\app.service.ts` — imported by **5** files
- `apps\api\src\modules\gbp\gbp.service.ts` — imported by **5** files
- `apps\api\src\app.controller.ts` — imported by **4** files
- `apps\api\src\app.module.ts` — imported by **4** files
- `apps\web\src\lib\kms.ts` — imported by **4** files
- `apps\api\src\modules\brightlocal\brightlocal.service.ts` — imported by **3** files
- `apps\api\src\modules\dataforseo\dataforseo.service.ts` — imported by **3** files
- `apps\api\src\modules\localfalcon\localfalcon.service.ts` — imported by **3** files
- `apps\api\src\modules\security\encryption.service.ts` — imported by **3** files
- `apps\api\src\modules\tasks\tasks.service.ts` — imported by **3** files
- `apps\web\src\lib\env.ts` — imported by **3** files
- `apps\api\src\modules\gbp\gbp.module.ts` — imported by **2** files
- `apps\api\src\modules\dataforseo\dataforseo.module.ts` — imported by **2** files
- `apps\api\src\modules\localfalcon\localfalcon.module.ts` — imported by **2** files
- `apps\api\src\modules\brightlocal\brightlocal.module.ts` — imported by **2** files
- `apps\api\src\modules\tasks\tasks.module.ts` — imported by **2** files
- `apps\api\src\common\middleware\tenant.middleware.ts` — imported by **2** files
- `apps\api\src\common\decorators\roles.decorator.ts` — imported by **2** files

## Import Map (who imports what)

- `apps\api\src\modules\security\security.module.ts` ← `apps\api\src\app.module.js`, `apps\api\src\app.module.ts`, `apps\api\src\modules\brightlocal\brightlocal.module.js`, `apps\api\src\modules\brightlocal\brightlocal.module.ts`, `apps\api\src\modules\dataforseo\dataforseo.module.js` +5 more
- `apps\api\src\modules\security\credentials.service.ts` ← `apps\api\src\modules\brightlocal\brightlocal.service.ts`, `apps\api\src\modules\dataforseo\dataforseo.service.ts`, `apps\api\src\modules\gbp\gbp.service.REQ-M1-15.spec.js`, `apps\api\src\modules\gbp\gbp.service.REQ-M1-15.spec.ts`, `apps\api\src\modules\gbp\gbp.service.ts` +3 more
- `apps\api\src\app.service.ts` ← `apps\api\src\app.controller.spec.js`, `apps\api\src\app.controller.spec.ts`, `apps\api\src\app.controller.ts`, `apps\api\src\app.module.js`, `apps\api\src\app.module.ts`
- `apps\api\src\modules\gbp\gbp.service.ts` ← `apps\api\src\modules\gbp\gbp.controller.ts`, `apps\api\src\modules\gbp\gbp.module.js`, `apps\api\src\modules\gbp\gbp.module.ts`, `apps\api\src\modules\gbp\gbp.service.REQ-M1-15.spec.js`, `apps\api\src\modules\gbp\gbp.service.REQ-M1-15.spec.ts`
- `apps\api\src\app.controller.ts` ← `apps\api\src\app.controller.spec.js`, `apps\api\src\app.controller.spec.ts`, `apps\api\src\app.module.js`, `apps\api\src\app.module.ts`
- `apps\api\src\app.module.ts` ← `apps\api\src\main.js`, `apps\api\src\main.ts`, `apps\api\test\app.e2e-spec.js`, `apps\api\test\app.e2e-spec.ts`
- `apps\web\src\lib\kms.ts` ← `apps\web\src\lib\crypto.js`, `apps\web\src\lib\crypto.ts`, `apps\web\tests\kms.test.js`, `apps\web\tests\kms.test.ts`
- `apps\api\src\modules\brightlocal\brightlocal.service.ts` ← `apps\api\src\modules\brightlocal\brightlocal.controller.ts`, `apps\api\src\modules\brightlocal\brightlocal.module.js`, `apps\api\src\modules\brightlocal\brightlocal.module.ts`
- `apps\api\src\modules\dataforseo\dataforseo.service.ts` ← `apps\api\src\modules\dataforseo\dataforseo.controller.ts`, `apps\api\src\modules\dataforseo\dataforseo.module.js`, `apps\api\src\modules\dataforseo\dataforseo.module.ts`
- `apps\api\src\modules\localfalcon\localfalcon.service.ts` ← `apps\api\src\modules\localfalcon\localfalcon.controller.ts`, `apps\api\src\modules\localfalcon\localfalcon.module.js`, `apps\api\src\modules\localfalcon\localfalcon.module.ts`
