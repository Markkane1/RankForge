"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const queue_1 = require("@rankforge/queue");
const database_1 = require("@rankforge/database");
const Sentry = __importStar(require("@sentry/node"));
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("./env");
const mailer_1 = require("./mailer");
const post_generation_1 = require("./post-generation");
const faq_monitoring_1 = require("./faq-monitoring");
const geo_grid_1 = require("./geo-grid");
const gbp_performance_1 = require("./gbp-performance");
const google_measurement_1 = require("./google-measurement");
const anomaly_alerts_1 = require("./anomaly-alerts");
const self_correction_1 = require("./self-correction");
const backlink_gap_1 = require("./backlink-gap");
const approval_expiry_1 = require("./approval-expiry");
const credential_health_1 = require("./credential-health");
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
function deriveKey() {
    const raw = (0, env_1.requireEnv)('TWO_FACTOR_ENCRYPTION_KEY');
    const decoded = Buffer.from(raw, 'base64');
    if (decoded.length === 32)
        return decoded;
    return crypto_1.default.createHash('sha256').update(raw).digest();
}
async function decryptSecret(ciphertext) {
    if (ciphertext.startsWith('kms:')) {
        const { KeyManagementServiceClient } = await Promise.resolve().then(() => __importStar(require('@google-cloud/kms')));
        const kmsClient = new KeyManagementServiceClient();
        const keyName = getKmsKeyName();
        const [result] = await kmsClient.decrypt({
            name: keyName,
            ciphertext: Buffer.from(ciphertext.slice(4), 'base64'),
        });
        if (!result.plaintext) {
            throw new Error('KMS decryption failed to return plaintext');
        }
        return Buffer.from(result.plaintext).toString('utf8');
    }
    const key = deriveKey();
    const buf = Buffer.from(ciphertext, 'base64');
    const iv = buf.subarray(0, IV_LENGTH);
    const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
}
async function getGoogleAccessToken(credential) {
    const expired = credential.tokenExpiryAt ? credential.tokenExpiryAt.getTime() <= Date.now() : false;
    if (!expired)
        return decryptSecret(credential.encryptedToken);
    if (!credential.refreshToken || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return null;
    }
    const refreshToken = await decryptSecret(credential.refreshToken);
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
    });
    if (!response.ok)
        return null;
    const payload = await response.json();
    return payload.access_token ?? null;
}
function getKmsKeyName() {
    if (process.env.GCP_KMS_KEY_NAME) {
        return process.env.GCP_KMS_KEY_NAME;
    }
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.GCP_KMS_LOCATION;
    const keyRing = process.env.GCP_KMS_KEYRING;
    const cryptoKey = process.env.GCP_KMS_CRYPTOKEY;
    if (!projectId || !location || !keyRing || !cryptoKey) {
        throw new Error('GCP_KMS_KEY_NAME or GOOGLE_CLOUD_PROJECT/GCP_KMS_LOCATION/GCP_KMS_KEYRING/GCP_KMS_CRYPTOKEY is required to decrypt kms: secrets in worker');
    }
    return `projects/${projectId}/locations/${location}/keyRings/${keyRing}/cryptoKeys/${cryptoKey}`;
}
// File 05 Guardrail: Initialize Sentry to prevent silent background failure swallowing
Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
});
const idem = new queue_1.IdempotentWriter('worker');
async function withWorkerClientTenant(clientId, fn) {
    return database_1.prisma.$transaction(async (tx) => {
        await tx.$executeRaw `SELECT set_config('app.current_client_id', ${clientId}, true)`;
        return fn(tx);
    });
}
async function recordClientCommunication(client, idempotencyKey, title, message) {
    await withWorkerClientTenant(client.id, async (tenantDb) => {
        const task = await tenantDb.task.upsert({
            where: { idempotencyKey },
            update: { status: 'DONE', completedAt: new Date(), result: JSON.stringify({ message }) },
            create: {
                clientId: client.id,
                taskId: 'REQ-M6-07',
                title,
                description: message,
                module: 'M6',
                priority: 'LOW',
                status: 'DONE',
                completedAt: new Date(),
                idempotencyKey,
                result: JSON.stringify({ message }),
            },
        });
        if (!client.email || !process.env.RESEND_API_KEY) {
            await tenantDb.taskLog.create({
                data: {
                    taskId: task.id,
                    level: 'WARN',
                    message: `Communication recorded but not emailed: ${!client.email ? 'client email missing' : 'RESEND_API_KEY missing'}`,
                },
            });
            return;
        }
        try {
            await (0, mailer_1.sendStatusAlert)(client.email, client.name, message);
            await tenantDb.taskLog.create({
                data: { taskId: task.id, level: 'INFO', message: 'Communication email sent' },
            });
        }
        catch (error) {
            await tenantDb.taskLog.create({
                data: {
                    taskId: task.id,
                    level: 'ERROR',
                    message: `Communication email failed: ${error instanceof Error ? error.message : 'unknown error'}`,
                },
            });
        }
    });
}
async function runMetricAnomalyScanner(dateKey) {
    const anomaliesDetected = await (0, anomaly_alerts_1.runMetricAnomalyScanner)({
        prisma: database_1.prisma,
        withClientTenant: withWorkerClientTenant,
    }, dateKey);
    console.log(`REQ-M5-03 anomaly scan detected ${anomaliesDetected} alert candidate(s).`);
    return anomaliesDetected;
}
async function createSelfCorrectionDiagnosisTasks(currentYear, currentMonth) {
    return (0, self_correction_1.createSelfCorrectionDiagnosisTasks)({
        prisma: database_1.prisma,
        withClientTenant: withWorkerClientTenant,
    }, currentYear, currentMonth);
}
async function recordCadenceTask(idempotencyKey, title, message, options = {}) {
    const status = options.status ?? 'DONE';
    const writeProof = async (db) => {
        const task = await db.task.upsert({
            where: { idempotencyKey },
            update: {
                status,
                completedAt: status === 'DONE' ? new Date() : null,
                result: JSON.stringify(options.result ?? { message }),
            },
            create: {
                clientId: options.clientId,
                taskId: options.taskId ?? 'REQ-M6-TASK-01',
                title,
                description: message,
                module: options.module ?? 'M6',
                priority: options.priority ?? (status === 'BLOCKED' ? 'MEDIUM' : 'LOW'),
                status,
                completedAt: status === 'DONE' ? new Date() : undefined,
                idempotencyKey,
                result: JSON.stringify(options.result ?? { message }),
            },
        });
        await db.taskLog.create({
            data: {
                taskId: task.id,
                level: options.level ?? (status === 'BLOCKED' ? 'WARN' : 'INFO'),
                message,
            },
        });
    };
    if (options.clientId) {
        await withWorkerClientTenant(options.clientId, writeProof);
    }
    else {
        await writeProof(database_1.prisma);
    }
}
function parseAttributeList(value) {
    if (!value)
        return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    }
    catch {
        return [];
    }
}
function normalizeLiveGbpCategories(payload) {
    const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.categories)
            ? payload.categories
            : [];
    return rows
        .map((row) => {
        const category = row;
        const name = typeof category.name === 'string'
            ? category.name.trim()
            : typeof category.displayName === 'string'
                ? category.displayName.trim()
                : '';
        const attributes = Array.isArray(category.attributes)
            ? category.attributes
                .map((attribute) => {
                if (typeof attribute === 'string')
                    return attribute.trim();
                const namedAttribute = attribute;
                if (typeof namedAttribute.name === 'string')
                    return namedAttribute.name.trim();
                if (typeof namedAttribute.displayName === 'string')
                    return namedAttribute.displayName.trim();
                return '';
            })
                .filter(Boolean)
            : [];
        return {
            name,
            group: typeof category.group === 'string' ? category.group : null,
            attributes: Array.from(new Set(attributes)).sort(),
        };
    })
        .filter((category) => category.name);
}
async function runQuarterlyCategorySync(now = new Date()) {
    const quarterKey = `${now.getUTCFullYear()}-Q${Math.floor(now.getUTCMonth() / 3) + 1}`;
    const sourceUrl = process.env.GBP_CATEGORY_SCHEMA_URL;
    if (!sourceUrl) {
        console.log('QuarterlyCategorySync skipped: live GBP taxonomy sync is not implemented/configured.');
        await recordCadenceTask(`QuarterlyCategoryAttributeReview:${quarterKey}`, 'Review GBP category and attribute sync source', 'Quarterly category/attribute sync review task created because live GBP schema source is not configured.', {
            status: 'BLOCKED',
            level: 'WARN',
            taskId: 'REQ-M1-17',
            module: 'M1',
            priority: 'HIGH',
            result: {
                requirement: 'REQ-M1-17',
                blockedBy: 'Live GBP category/attribute schema source is not configured.',
            },
        });
        await recordCadenceTask(`QuarterlyCategorySync:${now.toISOString().slice(0, 10)}`, 'Quarterly category sync cadence proof', 'Quarterly category sync blocked: live GBP taxonomy sync is not implemented/configured.', { status: 'BLOCKED', level: 'WARN' });
        return;
    }
    const response = await fetch(sourceUrl, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
        throw new Error(`GBP category schema fetch failed: ${response.status}`);
    }
    const payload = await response.json();
    const categories = normalizeLiveGbpCategories(payload);
    if (!categories.length) {
        await recordCadenceTask(`QuarterlyCategorySync:${now.toISOString().slice(0, 10)}`, 'Quarterly category sync cadence proof', 'Quarterly category sync blocked: live GBP taxonomy source returned no categories.', { status: 'BLOCKED', level: 'WARN', taskId: 'REQ-M1-17', module: 'M1' });
        return;
    }
    const existing = await database_1.prisma.gbpCategory.findMany({
        select: { name: true, attributesJson: true },
    });
    const existingByName = new Map(existing.map((category) => [category.name, category]));
    const diffs = [];
    for (const category of categories) {
        const previousAttributes = parseAttributeList(existingByName.get(category.name)?.attributesJson);
        const newAttributes = category.attributes.filter((attribute) => !previousAttributes.includes(attribute));
        if (newAttributes.length) {
            diffs.push({ category: category.name, newAttributes });
        }
        await database_1.prisma.gbpCategory.upsert({
            where: { name: category.name },
            update: {
                group: category.group,
                attributesJson: JSON.stringify(category.attributes),
                sourceLineage: JSON.stringify({
                    provider: 'GBP_CATEGORY_SCHEMA',
                    endpoint: sourceUrl,
                    fetchedAt: now.toISOString(),
                }),
                lastSyncedAt: now,
            },
            create: {
                name: category.name,
                group: category.group,
                attributesJson: JSON.stringify(category.attributes),
                sourceLineage: JSON.stringify({
                    provider: 'GBP_CATEGORY_SCHEMA',
                    endpoint: sourceUrl,
                    fetchedAt: now.toISOString(),
                }),
                lastSyncedAt: now,
            },
        });
    }
    if (diffs.length) {
        await recordCadenceTask(`QuarterlyCategoryAttributeReview:${quarterKey}`, 'Review new GBP category attributes', `Quarterly category/attribute sync found ${diffs.length} category attribute diff(s) requiring review.`, {
            status: 'BLOCKED',
            level: 'WARN',
            taskId: 'REQ-M1-17',
            module: 'M1',
            priority: 'HIGH',
            result: { requirement: 'REQ-M1-17', diffs },
        });
    }
    await recordCadenceTask(`QuarterlyCategorySync:${now.toISOString().slice(0, 10)}`, 'Quarterly category sync cadence proof', `Quarterly category sync imported ${categories.length} live GBP categor${categories.length === 1 ? 'y' : 'ies'}.`, {
        status: 'DONE',
        level: 'INFO',
        taskId: 'REQ-M1-17',
        module: 'M1',
        result: {
            requirement: 'REQ-M1-17',
            categoriesSynced: categories.length,
            diffCount: diffs.length,
            sourceUrl,
        },
    });
}
async function recordFailedTaskJob(job, err) {
    if (job.name !== 'UpdateTaskStatus' || !job.data || typeof job.data !== 'object' || !('id' in job.data)) {
        return;
    }
    const taskId = job.data.id;
    if (typeof taskId !== 'string')
        return;
    const task = await database_1.prisma.task.findUnique({ where: { id: taskId } });
    if (!task)
        return;
    const attempts = Math.max(job.opts.attempts ?? task.maxRetries, 1);
    const exhausted = job.attemptsMade >= attempts;
    const data = {
        retryCount: job.attemptsMade,
        ...(exhausted
            ? {
                status: 'FAILED',
                errorMessage: err.message,
            }
            : {}),
    };
    const writeFailure = async (db) => {
        await db.task.update({ where: { id: taskId }, data });
        await db.taskLog.create({
            data: {
                taskId,
                level: 'ERROR',
                message: exhausted
                    ? `Task job failed after ${job.attemptsMade}/${attempts} attempts: ${err.message}`
                    : `Task job attempt ${job.attemptsMade}/${attempts} failed: ${err.message}`,
            },
        });
    };
    if (task.clientId) {
        await withWorkerClientTenant(task.clientId, writeFailure);
    }
    else {
        await writeFailure(database_1.prisma);
    }
}
async function sendWhatsAppReviewMessage(organizationId, to, message) {
    const cred = await database_1.prisma.orgCredential.findFirst({
        where: { organizationId, service: 'WHATSAPP', isValid: true },
    });
    if (!cred) {
        throw new Error('WhatsApp integration not configured for this organization');
    }
    const decrypted = await decryptSecret(cred.encryptedKey);
    let accessToken = decrypted;
    let phoneNumberId;
    try {
        const payload = JSON.parse(decrypted);
        accessToken = payload.accessToken ?? decrypted;
        phoneNumberId = payload.phoneNumberId;
    }
    catch {
        // Legacy credentials may store the access token directly.
    }
    if (!phoneNumberId) {
        throw new Error('Missing WhatsApp Phone Number ID');
    }
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'text',
            text: { preview_url: false, body: message },
        }),
    });
    if (!response.ok) {
        throw new Error(`WhatsApp API Error: ${response.status} ${await response.text()}`);
    }
}
async function processReviewAsk(reviewAskId, reminder) {
    const ask = await database_1.prisma.reviewAsk.findUnique({
        where: { id: reviewAskId },
        include: { client: true },
    });
    if (!ask)
        throw new Error(`ReviewAsk ${reviewAskId} not found`);
    if (ask.optedOut || ask.status === 'OPTED_OUT')
        return;
    if (!ask.phoneNumber)
        throw new Error(`ReviewAsk ${reviewAskId} has no phone number`);
    if (reminder && ask.status !== 'SENT') {
        return;
    }
    const message = reminder
        ? `Hi ${ask.customerName}, a quick reminder from ${ask.client.name}: if you have a moment, please leave feedback here: ${ask.reviewUrl}`
        : `Hi ${ask.customerName}, thanks for choosing ${ask.client.name}! Please consider leaving us a review here: ${ask.reviewUrl}`;
    await sendWhatsAppReviewMessage(ask.client.organizationId, ask.phoneNumber, message);
    await withWorkerClientTenant(ask.clientId, async (tenantDb) => {
        await tenantDb.reviewAsk.update({
            where: { id: ask.id },
            data: reminder
                ? { status: 'REMINDER_SENT', remindedAt: new Date() }
                : { status: 'SENT', sentAt: new Date() },
        });
        await tenantDb.leadLogEntry.create({
            data: {
                clientId: ask.clientId,
                source: 'WHATSAPP',
                value: 0,
                contactInfo: ask.phoneNumber,
                notes: reminder
                    ? `Outbound review reminder sent to ${ask.customerName}.`
                    : `Outbound review invite sent to ${ask.customerName}.`,
            },
        });
    });
}
const worker = new queue_1.Worker(queue_1.QUEUE_NAME, async (job) => {
    console.log(`Processing job ${job.id} of type ${job.name}`);
    if (job.name === 'UpdateTaskStatus') {
        const { id, status, timestamp } = job.data;
        // Idempotency check with composite key
        const idempotencyKey = `UpdateTaskStatus:${id}:${status}:${timestamp}`;
        const canProcess = await idem.checkAndLock(idempotencyKey);
        if (!canProcess) {
            console.log(`Job ${job.id} skipped (idempotency lock for ${idempotencyKey})`);
            return;
        }
        // Execute with retry wrapper
        await (0, queue_1.withRetry)(async () => {
            const task = await database_1.prisma.task.findUnique({
                where: { id },
                include: { subtasks: true }
            });
            if (!task)
                throw new Error(`Task ${id} not found`);
            if ((status === "IN_PROGRESS" || status === "DONE") && task.dependsOnTaskIds.length) {
                const completedDependencies = await database_1.prisma.task.count({
                    where: { id: { in: task.dependsOnTaskIds }, status: "DONE" },
                });
                if (completedDependencies !== task.dependsOnTaskIds.length) {
                    throw new Error(`Cannot start task ${id}: dependency tasks are not DONE.`);
                }
            }
            // Ponytail verification: Enforce checklist validation (Gap 05)
            if (status === "DONE" && task.subtasks?.some((st) => !st.isCompleted)) {
                throw new Error(`Cannot mark task ${id} as DONE: Pending subtasks exist.`);
            }
            const updateData = { status };
            if (status === "DONE")
                updateData.completedAt = new Date();
            if (status === "IN_PROGRESS")
                updateData.startedAt = task.startedAt ?? new Date();
            const applyStatusChange = async (db) => {
                await db.task.update({ where: { id }, data: updateData });
                await db.taskLog.create({
                    data: {
                        taskId: id,
                        level: status === "FAILED" ? "ERROR" : "INFO",
                        message: `Status changed from ${task.status} to ${status} via Queue`,
                    },
                });
            };
            if (task.clientId) {
                await withWorkerClientTenant(task.clientId, applyStatusChange);
            }
            else {
                await applyStatusChange(database_1.prisma);
            }
            // Read-back verification
            const verify = task.clientId
                ? await withWorkerClientTenant(task.clientId, (db) => db.task.findUnique({ where: { id } }))
                : await database_1.prisma.task.findUnique({ where: { id } });
            if (verify?.status !== status) {
                throw new Error(`Read-back verification failed for task ${id}`);
            }
            if (status === "FAILED") {
                Sentry.captureMessage(`Task ${id} marked FAILED`);
            }
        });
        console.log(`Successfully updated and verified task ${id} to ${status}`);
    }
    else if (job.name === 'SendReviewAsk') {
        await processReviewAsk(job.data.reviewAskId, false);
    }
    else if (job.name === 'SendReviewAskReminder') {
        await processReviewAsk(job.data.reviewAskId, true);
    }
    else if (job.name === 'DailyHealthCheck') {
        console.log('Running daily health check for all clients...');
        // REQ-M1-26: Freshness engine: check for no new ChangeLogEntry/post/photo in 14 days
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        const activeClients = await database_1.prisma.client.findMany({
            where: { isActive: true },
            include: {
                changeLog: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
                gbpProfiles: {
                    include: {
                        posts: {
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                        },
                        photos: {
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                        },
                    },
                },
                credentials: true,
            },
        });
        const owners = await database_1.prisma.staffUser.findMany({
            where: { role: 'OWNER', isActive: true },
        });
        const notifyUsers = owners.length > 0
            ? owners
            : await database_1.prisma.staffUser.findMany({ where: { isActive: true } });
        for (const client of activeClients) {
            const dates = [client.createdAt];
            if (client.changeLog.length > 0) {
                dates.push(new Date(client.changeLog[0].createdAt));
            }
            for (const profile of client.gbpProfiles) {
                if (profile.posts.length > 0) {
                    dates.push(new Date(profile.posts[0].createdAt));
                }
                if (profile.photos.length > 0) {
                    dates.push(new Date(profile.photos[0].createdAt));
                }
            }
            const latestActivity = new Date(Math.max(...dates.map(d => d.getTime())));
            if (latestActivity < fourteenDaysAgo) {
                const dedupeKey = `freshness:${client.id}:14-day-inactivity`;
                const sourceRule = 'REQ-M1-26: no ChangeLogEntry, GBP post, or GBP photo activity in 14 days';
                const recommendedAction = 'Review the client workspace and create a fresh post, photo, or optimization task.';
                // Prevent duplicate alerts: check if a freshness alert was already created in the last 14 days
                const recentAlert = await database_1.prisma.notification.findFirst({
                    where: {
                        type: 'client_stale',
                        dedupeKey,
                        createdAt: { gte: fourteenDaysAgo },
                    },
                });
                if (!recentAlert) {
                    for (const user of notifyUsers) {
                        await database_1.prisma.notification.create({
                            data: {
                                userId: user.id,
                                type: 'client_stale',
                                title: '14-Day Inactivity Alert',
                                message: `Client ${client.name} has had no activity (no changelog entries, posts, or photos) in the last 14 days.`,
                                sourceRule,
                                recommendedAction,
                                dedupeKey,
                                relatedEntityId: client.id,
                                relatedEntityType: 'client',
                            },
                        });
                    }
                    console.log(`Raised 14-day freshness alert for client: ${client.name}`);
                }
            }
        }
        // REQ-M6-APPR-02: Expire approvals after 30 days
        const expiredApprovalCount = await (0, approval_expiry_1.expireStaleApprovals)({
            prisma: database_1.prisma,
            withClientTenant: withWorkerClientTenant,
        });
        console.log(`Auto-expired ${expiredApprovalCount} pending approvals.`);
        let staleTokens = 0;
        const now = new Date();
        const dateKey = now.toISOString().slice(0, 10);
        for (const client of activeClients) {
            const orgCredentials = await database_1.prisma.orgCredential.findMany({
                where: { organizationId: client.organizationId, isValid: true },
                select: { id: true, service: true, encryptedKey: true },
            });
            await withWorkerClientTenant(client.id, async (tenantDb) => {
                const healthTask = await tenantDb.task.upsert({
                    where: { idempotencyKey: `HealthCheck:${client.id}:${dateKey}` },
                    update: {
                        status: 'DONE',
                        completedAt: now,
                        result: JSON.stringify({
                            checkedAt: now.toISOString(),
                            clientCredentials: client.credentials.length,
                            orgCredentials: orgCredentials.length,
                        }),
                    },
                    create: {
                        clientId: client.id,
                        taskId: 'REQ-M6-08',
                        title: `Daily health check: ${client.name}`,
                        description: 'Automated per-client external credential health proof.',
                        module: 'M6',
                        priority: 'LOW',
                        status: 'DONE',
                        completedAt: now,
                        idempotencyKey: `HealthCheck:${client.id}:${dateKey}`,
                        result: JSON.stringify({
                            checkedAt: now.toISOString(),
                            clientCredentials: client.credentials.length,
                            orgCredentials: orgCredentials.length,
                        }),
                    },
                });
                for (const cred of client.credentials) {
                    const expired = Boolean(cred.tokenExpiryAt && cred.tokenExpiryAt < now);
                    if (expired && cred.isValid) {
                        await tenantDb.clientCredential.update({
                            where: { id: cred.id },
                            data: { isValid: false },
                        });
                        staleTokens++;
                    }
                    await tenantDb.taskLog.create({
                        data: {
                            taskId: healthTask.id,
                            level: expired ? 'WARN' : 'INFO',
                            message: `Client credential ${cred.service}: ${expired ? 'expired and invalidated' : 'valid'}`,
                        },
                    });
                }
                for (const cred of orgCredentials) {
                    let level = 'INFO';
                    let message = `Org credential ${cred.service}: checked`;
                    try {
                        const liveHealth = await (0, credential_health_1.checkOrgCredentialLiveHealth)(cred.service, await decryptSecret(cred.encryptedKey));
                        level = liveHealth.healthy ? 'INFO' : 'WARN';
                        message = liveHealth.message;
                    }
                    catch (error) {
                        level = 'WARN';
                        message = `Org credential ${cred.service}: live ping failed`;
                    }
                    await tenantDb.taskLog.create({
                        data: {
                            taskId: healthTask.id,
                            level,
                            message,
                        },
                    });
                }
            });
        }
        await database_1.prisma.orgCredential.updateMany({
            where: { isValid: true },
            data: { lastCheckedAt: now }
        });
        console.log(`Credential Health Check: invalidated ${staleTokens} stale client API tokens and wrote per-client health TaskLog proof.`);
    }
    else if (job.name === 'OffboardingRetentionSweep') {
        console.log('Running offboarding retention sweep...');
        const offboardedClients = await database_1.prisma.client.findMany({
            where: { lifecycleState: 'OFFBOARDED' },
            select: { id: true, name: true },
        });
        for (const client of offboardedClients) {
            await withWorkerClientTenant(client.id, async (tenantDb) => {
                const result = await tenantDb.leadLogEntry.updateMany({
                    where: {
                        clientId: client.id,
                        contactInfo: { not: null },
                        NOT: { contactInfo: '[REDACTED DUE TO OFFBOARDING]' },
                    },
                    data: { contactInfo: '[REDACTED DUE TO OFFBOARDING]' },
                });
                const task = await tenantDb.task.upsert({
                    where: { idempotencyKey: `OffboardingRetention:${client.id}` },
                    update: {
                        status: 'DONE',
                        completedAt: new Date(),
                        result: JSON.stringify({ redactedLeadContacts: result.count }),
                    },
                    create: {
                        clientId: client.id,
                        taskId: 'REQ-NFR-06',
                        title: `Offboarding retention sweep: ${client.name}`,
                        description: 'Automated retention/deletion enforcement for offboarded client PII.',
                        module: 'M6',
                        priority: 'HIGH',
                        status: 'DONE',
                        completedAt: new Date(),
                        idempotencyKey: `OffboardingRetention:${client.id}`,
                        result: JSON.stringify({ redactedLeadContacts: result.count }),
                    },
                });
                await tenantDb.taskLog.create({
                    data: {
                        taskId: task.id,
                        level: 'INFO',
                        message: `Offboarding retention sweep redacted ${result.count} lead contact record(s).`,
                    },
                });
            });
        }
        console.log(`OffboardingRetentionSweep completed for ${offboardedClients.length} client(s).`);
    }
    else if (job.name === 'WelcomeClientCommunication') {
        const since = new Date();
        since.setDate(since.getDate() - 1);
        const clients = await database_1.prisma.client.findMany({
            where: { isActive: true, createdAt: { gte: since } },
            select: { id: true, name: true, email: true },
        });
        for (const client of clients) {
            await recordClientCommunication(client, `Welcome:${client.id}`, `Welcome communication: ${client.name}`, `Welcome to RankForge. Your onboarding workspace is active and the team has started intake checks.`);
        }
    }
    else if (job.name === 'WeeklyBuildSummary') {
        const dateKey = new Date().toISOString().slice(0, 10);
        const since = new Date();
        since.setDate(since.getDate() - 7);
        const clients = await database_1.prisma.client.findMany({
            where: { isActive: true, lifecycleState: 'BUILD' },
            select: { id: true, name: true, email: true },
        });
        for (const client of clients) {
            const taskLogs = await withWorkerClientTenant(client.id, (tenantDb) => tenantDb.taskLog.findMany({
                where: {
                    createdAt: { gte: since },
                    task: { clientId: client.id },
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: { task: { select: { title: true } } },
            }));
            const message = taskLogs.length
                ? `Weekly BUILD update: ${taskLogs.length} recent task log(s). Latest: ${taskLogs
                    .map((log) => `${log.task.title}: ${log.message}`)
                    .join(' | ')}`
                : 'Weekly BUILD update: no task log activity was recorded this week. Open tasks and approvals remain visible in your RankForge workspace.';
            await recordClientCommunication(client, `WeeklyBuildSummary:${client.id}:${dateKey}`, `Weekly BUILD summary: ${client.name}`, message);
        }
    }
    else if (job.name === 'MilestoneCommunication') {
        const since = new Date();
        since.setDate(since.getDate() - 1);
        const changes = await database_1.prisma.changeLogEntry.findMany({
            where: { field: 'lifecycleState', createdAt: { gte: since } },
            select: { clientId: true, newValue: true, client: { select: { id: true, name: true, email: true } } },
        });
        for (const change of changes) {
            await recordClientCommunication(change.client, `Milestone:${change.clientId}:${change.newValue}`, `Milestone communication: ${change.client.name}`, `Milestone reached: your campaign moved to ${change.newValue}.`);
        }
    }
    else if (job.name === 'MonthlyReportDelivery') {
        const clients = await database_1.prisma.client.findMany({
            where: { isActive: true },
            select: { id: true, name: true, email: true },
        });
        const now = new Date();
        const dateKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
        for (const client of clients) {
            const report = await withWorkerClientTenant(client.id, (tenantDb) => tenantDb.monthlyReport.findFirst({
                where: { clientId: client.id },
                orderBy: { generatedAt: 'desc' },
            }));
            if (!report)
                continue;
            await recordClientCommunication(client, `MonthlyReportDelivery:${client.id}:${dateKey}`, `Monthly report delivery: ${client.name}`, `Your latest monthly RankForge report is ready for review.`);
        }
    }
    else if (job.name === 'WeeklyRankUpdate') {
        console.log('Running weekly rank update and anomaly scanner...');
        const dateKey = new Date().toISOString().slice(0, 10);
        // Build the weekly metric anomaly scanner (REQ-M5-03)
        const keywords = await database_1.prisma.keywordMapEntry.findMany({
            where: { status: "ACTIVE" }
        });
        const anomaliesDetected = await runMetricAnomalyScanner(dateKey);
        console.log(`Weekly anomaly scanner detected ${anomaliesDetected} rank drops.`);
        await recordCadenceTask(`WeeklyRankUpdate:${dateKey}`, 'Weekly rank update cadence proof', `Weekly rank update checked ${keywords.length} active keyword(s) and detected ${anomaliesDetected} anomaly candidate(s).`, { result: { keywordsChecked: keywords.length, anomaliesDetected } });
    }
    else if (job.name === 'QuarterlyCategorySync') {
        console.log('Running quarterly category sync...');
        await runQuarterlyCategorySync();
    }
    else if (job.name === 'MonthlyPostGenerator') {
        console.log('Running Monthly Post Generator for all active GBP profiles...');
        const monthKey = new Date().toISOString().slice(0, 7);
        if (!process.env.OPENAI_API_KEY) {
            console.log('MonthlyPostGenerator skipped: content generation is not implemented/configured.');
            await recordCadenceTask(`MonthlyPostGenerator:${monthKey}`, 'Monthly post generator cadence proof', 'Monthly post generator blocked: content generation is not implemented/configured.', { status: 'BLOCKED', level: 'WARN' });
            return;
        }
        const profiles = await database_1.prisma.gbpProfile.findMany({
            include: { client: { select: { id: true, name: true, isActive: true } } },
        });
        let draftsCreated = 0;
        for (const profile of profiles.filter((p) => p.client.isActive)) {
            await withWorkerClientTenant(profile.client.id, async (tenantDb) => {
                for (const [index, rotation] of post_generation_1.MONTHLY_POST_ROTATION.entries()) {
                    const prompt = `${rotation.instruction} Business: ${profile.client.name}. Category: ${profile.primaryCategory ?? 'local service'}. Keep it under 100 words.`;
                    const response = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: 'gpt-4o-mini',
                            messages: [{ role: 'user', content: prompt }],
                        }),
                    });
                    if (!response.ok) {
                        throw new Error(`OpenAI post generation failed with status ${response.status}`);
                    }
                    const data = await response.json();
                    const content = data.choices?.[0]?.message?.content?.trim() ?? '';
                    (0, post_generation_1.assertPostBodyCompliant)(content);
                    await tenantDb.gbpPost.create({
                        data: {
                            gbpProfileId: profile.id,
                            title: `${rotation.eventType} post ${index + 1} for ${monthKey}`,
                            content,
                            status: 'DRAFT',
                            eventType: rotation.eventType,
                            scheduledAt: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1 + index * 7)),
                        },
                    });
                    draftsCreated++;
                }
            });
        }
        await recordCadenceTask(`MonthlyPostGenerator:${monthKey}`, 'Monthly post generator cadence proof', `Monthly post generator created ${draftsCreated} draft post(s) across ${profiles.length} profile(s).`, { result: { draftsCreated, rotation: post_generation_1.MONTHLY_POST_ROTATION.map((item) => item.eventType) } });
    }
    else if (job.name === 'MetaWebhookEvent') {
        console.log('Processing Meta Webhook Event (WhatsApp Inbound Message)...');
        const data = job.data;
        if (data.messages && data.messages.length > 0) {
            for (const msg of data.messages) {
                const fromNumber = msg.from;
                const msgId = msg.id;
                const text = msg.text?.body || '[Non-text message]';
                console.log(`Received WhatsApp reply from ${fromNumber}: ${text}`);
                const clientId = data.clientId;
                if (!clientId) {
                    console.log('Skipping WhatsApp inbound lead log: webhook payload has no clientId.');
                    continue;
                }
                await withWorkerClientTenant(clientId, async (tenantDb) => {
                    const client = await tenantDb.client.findUnique({ where: { id: clientId } });
                    if (!client)
                        return;
                    await tenantDb.leadLogEntry.create({
                        data: {
                            clientId,
                            source: 'WHATSAPP',
                            value: 0,
                            contactInfo: fromNumber,
                            notes: `Inbound WhatsApp message: ${text} (MsgID: ${msgId})`
                        }
                    });
                });
            }
        }
    }
    else if (job.name === 'FaqVisibilityMonitor') {
        console.log('Running FaqVisibilityMonitor for tracked FAQs...');
        const dateKey = new Date().toISOString().slice(0, 10);
        if (!process.env.SERP_API_KEY || !process.env.SERP_API_URL) {
            console.log('Skipping FaqVisibilityMonitor: SERP_API_KEY and SERP_API_URL are not configured.');
            await recordCadenceTask(`FaqVisibilityMonitor:${dateKey}`, 'FAQ visibility monitor cadence proof', 'FAQ visibility monitor blocked: SERP_API_KEY and SERP_API_URL are not configured.', { status: 'BLOCKED', level: 'WARN' });
            return;
        }
        const allFaqs = await database_1.prisma.gbpFaq.findMany({
            include: { gbpProfile: { select: { clientId: true } } },
        });
        let testedCount = 0;
        for (const faq of allFaqs) {
            const testedAt = new Date();
            const evidence = await (0, faq_monitoring_1.fetchFaqVisibility)(process.env.SERP_API_URL, process.env.SERP_API_KEY, faq.question, testedAt);
            const isVisible = evidence.visible;
            await withWorkerClientTenant(faq.gbpProfile.clientId, (tenantDb) => tenantDb.gbpFaq.update({
                where: { id: faq.id },
                data: {
                    passCount: isVisible ? faq.passCount + 1 : faq.passCount,
                    failCount: !isVisible ? faq.failCount + 1 : faq.failCount,
                    lastTestedAt: testedAt,
                    lastVisibilitySource: evidence.providerUrl,
                    lastVisibilityEvidence: JSON.stringify(evidence),
                }
            }));
            testedCount++;
        }
        console.log(`FaqVisibilityMonitor tested ${testedCount} FAQs.`);
        await recordCadenceTask(`FaqVisibilityMonitor:${dateKey}`, 'FAQ visibility monitor cadence proof', `FAQ visibility monitor tested ${testedCount} FAQ(s).`, { result: { testedCount } });
    }
    else if (job.name === 'WeeklyGeoGridScan') {
        console.log('Running Weekly Geo-Grid Scan...');
        const dateKey = new Date().toISOString().slice(0, 10);
        const activeClients = await database_1.prisma.client.findMany({
            where: { isActive: true },
            include: { keywords: { where: { status: 'ACTIVE' } }, gbpProfiles: true }
        });
        let savedScans = 0;
        let skippedScans = 0;
        for (const client of activeClients) {
            const priorityKeywords = client.keywords.filter((k) => k.priority <= 5);
            const profile = client.gbpProfiles.find((p) => p.gbpLocationId);
            if (!profile || !profile.gbpLocationId) {
                console.log(`Skipping geo-grid scan for client ${client.name}: No GBP profile with location ID.`);
                skippedScans++;
                continue;
            }
            for (const kw of priorityKeywords) {
                try {
                    let scanData = null;
                    const cred = await database_1.prisma.orgCredential.findFirst({
                        where: { organizationId: client.organizationId, service: "LOCAL_FALCON", isValid: true },
                    });
                    if (cred) {
                        try {
                            const apiKey = await decryptSecret(cred.encryptedKey);
                            const response = await fetch("https://api.localfalcon.com/api/v1/reports/run", {
                                method: "POST",
                                headers: {
                                    "Authorization": `Bearer ${apiKey}`,
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    location_id: profile.gbpLocationId,
                                    keyword: kw.keyword,
                                    grid_size: "3x3",
                                    grid_radius: "1.0mi",
                                }),
                            });
                            if (response.ok) {
                                const resJson = await response.json();
                                scanData = resJson;
                            }
                        }
                        catch (err) {
                            console.error(`Local Falcon API call failed: ${err.message}. Skipping result save.`);
                        }
                    }
                    if (!scanData) {
                        console.log(`Skipping geo-grid save for ${client.name}/${kw.keyword}: Local Falcon data unavailable.`);
                        skippedScans++;
                        continue;
                    }
                    const scanResult = (0, geo_grid_1.buildGeoGridScanResult)(scanData, {
                        locationId: profile.gbpLocationId,
                        keyword: kw.keyword,
                        gridSize: '3x3',
                        gridRadius: '1.0mi',
                    });
                    await withWorkerClientTenant(client.id, (tenantDb) => tenantDb.geoGridScanResult.create({
                        data: {
                            clientId: client.id,
                            keyword: kw.keyword,
                            gridSize: 3,
                            scanDate: new Date(),
                            averageRank: scanResult.averageRank,
                            pointResults: scanResult.pointResults,
                            sourceLineage: scanResult.sourceLineage,
                        }
                    }));
                    console.log(`Saved geo-grid scan result for client ${client.name}, keyword: ${kw.keyword}`);
                    savedScans++;
                }
                catch (e) {
                    console.error(`Error executing geo-grid scan for client ${client.id}:`, e);
                    skippedScans++;
                }
            }
        }
        await recordCadenceTask(`WeeklyGeoGridScan:${dateKey}`, 'Weekly geo-grid scan cadence proof', `Weekly geo-grid scan saved ${savedScans} scan(s) and skipped ${skippedScans} scan(s).`, { result: { activeClients: activeClients.length, savedScans, skippedScans } });
    }
    else if (job.name === 'MonthlyCompetitorPolicyScan') {
        console.log('Running Monthly Competitor Policy Scan...');
        const dateKey = new Date().toISOString().slice(0, 7);
        const activeClients = await database_1.prisma.client.findMany({
            where: { isActive: true },
            include: { keywords: { where: { status: 'ACTIVE' } } }
        });
        let violationsFound = 0;
        for (const client of activeClients) {
            const priorityKeywords = client.keywords.filter((k) => k.priority <= 5);
            for (const kw of priorityKeywords) {
                const dataForSeoCredential = await database_1.prisma.orgCredential.findFirst({
                    where: { organizationId: client.organizationId, service: "DATAFORSEO", isValid: true },
                });
                if (!dataForSeoCredential) {
                    console.log(`Skipping competitor policy scan for ${client.name}/${kw.keyword}: DATAFORSEO credential missing.`);
                    continue;
                }
                let dataForSeoPayload = null;
                try {
                    const decrypted = await decryptSecret(dataForSeoCredential.encryptedKey);
                    let login = '';
                    let password = '';
                    try {
                        const parsed = JSON.parse(decrypted);
                        login = parsed.login;
                        password = parsed.password;
                    }
                    catch {
                        [login, password] = decrypted.split(':');
                    }
                    if (!login || !password)
                        throw new Error('Invalid DataForSEO credential payload');
                    const authHeader = `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`;
                    const locationName = [client.city, client.state, client.country].filter(Boolean).join(', ') || 'United States';
                    const response = await fetch('https://api.dataforseo.com/v3/serp/google/maps/live/advanced', {
                        method: 'POST',
                        headers: {
                            Authorization: authHeader,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify([{
                                keyword: kw.keyword,
                                location_name: locationName,
                                language_code: 'en',
                                depth: 10,
                            }]),
                    });
                    if (response.ok) {
                        dataForSeoPayload = await response.json();
                    }
                    else {
                        console.log(`Skipping competitor policy scan for ${client.name}/${kw.keyword}: DataForSEO returned ${response.status}.`);
                        continue;
                    }
                }
                catch (error) {
                    console.log(`Skipping competitor policy scan for ${client.name}/${kw.keyword}: DataForSEO credential or request failed.`);
                    continue;
                }
                const competitors = (dataForSeoPayload?.tasks?.[0]?.result?.[0]?.items ?? [])
                    .map((item) => ({
                    name: item.title,
                    url: item.url,
                    rank: item.rank_group ?? item.rank_absolute ?? null,
                    sourceLineage: {
                        provider: 'DATAFORSEO',
                        endpoint: 'serp/google/maps/live/advanced',
                        taskId: dataForSeoPayload?.tasks?.[0]?.id ?? null,
                        keyword: kw.keyword,
                        rank: item.rank_group ?? item.rank_absolute ?? null,
                    },
                }))
                    .filter((item) => item.name);
                for (const comp of competitors) {
                    // Heuristic policy check: check if the name contains keyword elements that look stuffed
                    const keywordWords = kw.keyword.toLowerCase().split(/\s+/);
                    const compNameLower = comp.name.toLowerCase();
                    const matchesKeyword = keywordWords.every((word) => compNameLower.includes(word));
                    const hasStuffingSign = comp.name.split(/\s+/).length > 3; // Long name with keyword = potential stuffing
                    if (matchesKeyword && hasStuffingSign) {
                        // Check if task already exists
                        const taskKey = `SuggestEdit:${client.id}:${comp.name}:${kw.keyword}`;
                        const exists = await withWorkerClientTenant(client.id, (tenantDb) => tenantDb.task.findFirst({
                            where: {
                                clientId: client.id,
                                idempotencyKey: taskKey
                            }
                        }));
                        if (!exists) {
                            await withWorkerClientTenant(client.id, (tenantDb) => tenantDb.task.create({
                                data: {
                                    clientId: client.id,
                                    taskId: 'REQ-M1-27',
                                    title: `Suggest Edit: Spam name flag - ${comp.name}`,
                                    description: `Flagged competitor "${comp.name}" ranking on keyword "${kw.keyword}".\n\nPolicy Violation: Keyword Stuffing in Business Name.\nWebsite: ${comp.url}\n\nRecommended Action: Submit "Suggest an Edit" on Google Maps to change name to legal/clean name.`,
                                    priority: 'MEDIUM',
                                    module: 'M1',
                                    status: 'NOT_STARTED',
                                    idempotencyKey: taskKey,
                                    result: JSON.stringify({ sourceLineage: comp.sourceLineage }),
                                    subtasks: {
                                        create: [
                                            { title: 'Verify competitor legal business name', sortOrder: 1 },
                                            { title: "Click 'Suggest an edit' on Google Maps", sortOrder: 2 },
                                            { title: 'Submit name cleanup request', sortOrder: 3 },
                                            { title: 'Log submission status in task details', sortOrder: 4 }
                                        ]
                                    }
                                }
                            }));
                            violationsFound++;
                        }
                    }
                }
            }
        }
        console.log(`MonthlyCompetitorPolicyScan completed. Generated ${violationsFound} Suggest Edit tasks.`);
        await recordCadenceTask(`MonthlyCompetitorPolicyScan:${dateKey}`, 'Monthly competitor policy scan cadence proof', `Monthly competitor policy scan generated ${violationsFound} suggest-edit task(s).`, { result: { activeClients: activeClients.length, violationsFound } });
    }
    else if (job.name === 'MonthlyBacklinkGapPull') {
        console.log('Running monthly backlink gap pull...');
        const dateKey = new Date().toISOString().slice(0, 7);
        const activeClients = await database_1.prisma.client.findMany({
            where: { isActive: true },
            include: {
                competitors: {
                    where: { competitorUrl: { not: null } },
                    orderBy: { analyzedAt: 'desc' },
                    take: 3,
                },
            },
        });
        let clientsChecked = 0;
        let opportunitiesSaved = 0;
        for (const client of activeClients) {
            const credential = await database_1.prisma.orgCredential.findFirst({
                where: { organizationId: client.organizationId, service: 'DATAFORSEO', isValid: true },
            });
            if (!credential || !client.competitors.length)
                continue;
            let credentials;
            try {
                credentials = (0, backlink_gap_1.parseDataForSeoCredentials)(await decryptSecret(credential.encryptedKey));
            }
            catch (error) {
                console.error(`DataForSEO credential decrypt failed for organization ${client.organizationId}:`, error);
                Sentry.captureException(error);
                continue;
            }
            clientsChecked++;
            for (const competitor of client.competitors) {
                if (!competitor.competitorUrl)
                    continue;
                try {
                    const opportunities = await (0, backlink_gap_1.fetchDataForSeoBacklinkGap)(credentials, competitor.competitorUrl);
                    opportunitiesSaved += await withWorkerClientTenant(client.id, (tenantDb) => (0, backlink_gap_1.upsertBacklinkOpportunities)(tenantDb, client.id, opportunities));
                }
                catch (error) {
                    console.error(`Backlink gap pull failed for client ${client.id} competitor ${competitor.competitorUrl}:`, error);
                    Sentry.captureException(error);
                }
            }
        }
        await recordCadenceTask(`MonthlyBacklinkGapPull:${dateKey}`, 'Monthly backlink gap pull cadence proof', `Monthly backlink gap pull checked ${clientsChecked} client(s) and saved ${opportunitiesSaved} opportunity row(s).`, { result: { activeClients: activeClients.length, clientsChecked, opportunitiesSaved } });
    }
    else if (job.name === 'MonthlyConversionOptimizationLoop') {
        console.log('Running Monthly Conversion Optimization Loop...');
        const activeClients = await database_1.prisma.client.findMany({
            where: { isActive: true },
            include: {
                gbpProfiles: { select: { id: true, gbpLocationId: true } },
                assets: {
                    where: { assetType: { in: ['GA4', 'GSC'] }, isVerified: true },
                    select: { assetType: true, externalId: true },
                },
                credentials: {
                    where: {
                        service: { in: [database_1.GBP_OAUTH_SERVICE, 'GA4', 'GSC'] },
                        isValid: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        let tasksCreated = 0;
        let gbpPerformanceLeadEventsCreated = 0;
        let googleMeasurementLeadEventsCreated = 0;
        const diagnosisTasksCreated = await createSelfCorrectionDiagnosisTasks(currentYear, currentMonth);
        for (const client of activeClients) {
            const credential = client.credentials.find((cred) => cred.service === database_1.GBP_OAUTH_SERVICE);
            if (credential) {
                const accessToken = await getGoogleAccessToken(credential);
                if (accessToken) {
                    for (const profile of client.gbpProfiles) {
                        if (!profile.gbpLocationId)
                            continue;
                        try {
                            const ingestion = await withWorkerClientTenant(client.id, (tenantDb) => (0, gbp_performance_1.ingestGbpPerformanceLeads)(tenantDb, {
                                clientId: client.id,
                                gbpProfileId: profile.id,
                                locationName: profile.gbpLocationId,
                                startDate: sixtyDaysAgo,
                                endDate: now,
                                accessToken,
                                fetchedAt: now,
                            }));
                            gbpPerformanceLeadEventsCreated += ingestion.created;
                        }
                        catch (error) {
                            console.error(`GBP Performance ingestion failed for client ${client.id} profile ${profile.id}:`, error);
                            Sentry.captureException(error);
                        }
                    }
                }
            }
            const ga4Asset = client.assets.find((asset) => asset.assetType === 'GA4' && asset.externalId);
            const ga4Credential = client.credentials.find((cred) => cred.service === 'GA4');
            if (ga4Asset?.externalId && ga4Credential) {
                const accessToken = await getGoogleAccessToken(ga4Credential);
                if (accessToken) {
                    try {
                        googleMeasurementLeadEventsCreated += await withWorkerClientTenant(client.id, (tenantDb) => (0, google_measurement_1.ingestGa4OrganicSearchConversions)({
                            db: tenantDb,
                            clientId: client.id,
                            propertyId: ga4Asset.externalId,
                            accessToken,
                            startDate: thirtyDaysAgo,
                            endDate: now,
                        }));
                    }
                    catch (error) {
                        console.error(`GA4 measurement ingestion failed for client ${client.id}:`, error);
                        Sentry.captureException(error);
                    }
                }
            }
            const gscAsset = client.assets.find((asset) => asset.assetType === 'GSC' && asset.externalId);
            const gscCredential = client.credentials.find((cred) => cred.service === 'GSC');
            if (gscAsset?.externalId && gscCredential) {
                const accessToken = await getGoogleAccessToken(gscCredential);
                if (accessToken) {
                    try {
                        googleMeasurementLeadEventsCreated += await withWorkerClientTenant(client.id, (tenantDb) => (0, google_measurement_1.ingestGscOrganicClicks)({
                            db: tenantDb,
                            clientId: client.id,
                            siteUrl: gscAsset.externalId,
                            accessToken,
                            startDate: thirtyDaysAgo,
                            endDate: now,
                        }));
                    }
                    catch (error) {
                        console.error(`GSC measurement ingestion failed for client ${client.id}:`, error);
                        Sentry.captureException(error);
                    }
                }
            }
            // Get current period leads
            const currentLeads = await withWorkerClientTenant(client.id, (tenantDb) => tenantDb.leadLogEntry.findMany({
                where: {
                    clientId: client.id,
                    createdAt: { gte: thirtyDaysAgo, lte: now }
                }
            }));
            // Get previous period leads
            const prevLeads = await withWorkerClientTenant(client.id, (tenantDb) => tenantDb.leadLogEntry.findMany({
                where: {
                    clientId: client.id,
                    createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }
                }
            }));
            // Group counts
            const currentCalls = currentLeads.filter((l) => l.source === 'GBP_CALL').length;
            const currentDirections = currentLeads.filter((l) => l.source === 'GBP_DIRECTIONS').length;
            const currentWebsite = currentLeads.filter((l) => l.source === 'GBP_WEBSITE').length;
            const prevCalls = prevLeads.filter((l) => l.source === 'GBP_CALL').length;
            const prevDirections = prevLeads.filter((l) => l.source === 'GBP_DIRECTIONS').length;
            const prevWebsite = prevLeads.filter((l) => l.source === 'GBP_WEBSITE').length;
            // Calculate percentage changes or absolute values
            const getChange = (curr, prev) => {
                if (prev === 0)
                    return curr > 0 ? 0 : -100; // if both 0, -100% drop
                return ((curr - prev) / prev) * 100;
            };
            const callsChange = getChange(currentCalls, prevCalls);
            const directionsChange = getChange(currentDirections, prevDirections);
            const websiteChange = getChange(currentWebsite, prevWebsite);
            // Determine the weakest conversion step
            // The step with either the lowest current count OR the largest percentage drop
            const metrics = [
                { name: 'GBP Phone Calls', curr: currentCalls, change: callsChange, source: 'GBP_CALL' },
                { name: 'Google Maps Directions', curr: currentDirections, change: directionsChange, source: 'GBP_DIRECTIONS' },
                { name: 'GBP Website Clicks', curr: currentWebsite, change: websiteChange, source: 'GBP_WEBSITE' }
            ];
            // Sort by greatest drop first, then by lowest current count
            metrics.sort((a, b) => {
                if (a.change !== b.change)
                    return a.change - b.change; // lowest change first (greatest drop)
                return a.curr - b.curr; // lowest count first
            });
            const weakest = metrics[0];
            // Suggest experiment based on weakest step
            let experimentTitle = '';
            let experimentDesc = '';
            let experimentSubtasks = [];
            if (weakest.source === 'GBP_CALL') {
                experimentTitle = 'Conversion Optimization: GBP Phone Calls';
                experimentDesc = `Weakest Step: GBP Phone Calls (Current: ${weakest.curr}, Prev: ${prevCalls}, Change: ${weakest.change.toFixed(1)}%).\n\nSuggested Experiment: Add holiday phone overrides or verify primary contact number is reachable during peak business hours.`;
                experimentSubtasks = [
                    'Verify that active phone number listed is correct and has voicemail configured.',
                    'Review holiday phone overrides list in GbpProfile settings.',
                    'Ensure booking shortlink includes standard click-to-call links.'
                ];
            }
            else if (weakest.source === 'GBP_DIRECTIONS') {
                experimentTitle = 'Conversion Optimization: Google Maps Directions';
                experimentDesc = `Weakest Step: Google Maps Directions (Current: ${weakest.curr}, Prev: ${prevDirections}, Change: ${weakest.change.toFixed(1)}%).\n\nSuggested Experiment: Upload 3 fresh outdoor/exterior geotagged storefront photos to help customers find your entry coordinates easily.`;
                experimentSubtasks = [
                    'Take 3 high-quality outdoor storefront photos showing physical entrance.',
                    'Upload exterior photos tagged with category EXTERIOR.',
                    'Check maps pin drop accuracy in GbpProfile address fields.'
                ];
            }
            else {
                experimentTitle = 'Conversion Optimization: GBP Website Clicks';
                experimentDesc = `Weakest Step: GBP Website Clicks (Current: ${weakest.curr}, Prev: ${prevWebsite}, Change: ${weakest.change.toFixed(1)}%).\n\nSuggested Experiment: Refactor website primary landing page call-to-action button or add a tracked click-to-WhatsApp shortlink.`;
                experimentSubtasks = [
                    'Audit landing page layout and color contrast of CTA buttons.',
                    'Add UTM website parameters tracking to track campaign clicks.',
                    'Integrate WhatsApp click-to-chat shortlink generator in booking settings.'
                ];
            }
            // Check if task already exists for this client in the current month
            const taskKey = `ConversionOpt:${client.id}:${currentYear}-${currentMonth}`;
            const exists = await withWorkerClientTenant(client.id, (tenantDb) => tenantDb.task.findUnique({
                where: { idempotencyKey: taskKey }
            }));
            if (!exists) {
                await withWorkerClientTenant(client.id, (tenantDb) => tenantDb.task.create({
                    data: {
                        clientId: client.id,
                        taskId: 'REQ-M1-29',
                        title: experimentTitle,
                        description: experimentDesc,
                        priority: 'MEDIUM',
                        module: 'M1',
                        status: 'NOT_STARTED',
                        idempotencyKey: taskKey,
                        subtasks: {
                            create: experimentSubtasks.map((title, index) => ({
                                title,
                                sortOrder: index + 1
                            }))
                        }
                    }
                }));
                tasksCreated++;
                console.log(`Created Conversion Optimization task for client: ${client.name} (Weakest step: ${weakest.name})`);
            }
        }
        console.log(`MonthlyConversionOptimizationLoop completed. Generated ${tasksCreated} experiment suggestion tasks and ${diagnosisTasksCreated} diagnosis task(s).`);
        await recordCadenceTask(`MonthlyConversionOptimizationLoop:${currentYear}-${String(currentMonth).padStart(2, '0')}`, 'Monthly conversion optimization cadence proof', `Monthly conversion optimization generated ${tasksCreated} experiment task(s), ${diagnosisTasksCreated} diagnosis task(s), ingested ${gbpPerformanceLeadEventsCreated} GBP Performance lead event(s), and ingested ${googleMeasurementLeadEventsCreated} GA4/GSC organic event(s).`, { result: { activeClients: activeClients.length, tasksCreated, diagnosisTasksCreated, gbpPerformanceLeadEventsCreated, googleMeasurementLeadEventsCreated } });
    }
}, { connection: queue_1.redisConnection });
worker.on('completed', job => {
    console.log(`Job ${job.id} completed!`);
});
worker.on('failed', async (job, err) => {
    console.error(`Job ${job?.id} failed with ${err.message}`);
    // File 05 Guardrail: Actually alert developers
    Sentry.captureException(err);
    if (job) {
        try {
            await recordFailedTaskJob(job, err);
        }
        catch (recordError) {
            console.error('Failed to record task job failure:', recordError);
            Sentry.captureException(recordError);
        }
    }
});
const schedulers_1 = require("./schedulers");
async function bootstrap() {
    (0, env_1.validateWorkerEnv)();
    await (0, schedulers_1.initSchedulers)();
    console.log('Worker is running...');
}
bootstrap().catch(err => {
    console.error('Failed to bootstrap worker:', err);
    Sentry.captureException(err);
    process.exit(1);
});
