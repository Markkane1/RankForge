-- REQ-M6-STATE-01/02/04: guard client lifecycle transitions in Postgres too.
-- This closes raw SQL / unextended Prisma bypasses of the app-level state machine.

CREATE OR REPLACE FUNCTION guard_client_lifecycle_transition()
RETURNS trigger AS $$
DECLARE
    allowed boolean;
    at_risk_task_id text;
BEGIN
    IF NEW."lifecycleState" = OLD."lifecycleState" THEN
        RETURN NEW;
    END IF;

    allowed := CASE OLD."lifecycleState"
        WHEN 'ONBOARDING' THEN NEW."lifecycleState" IN ('BUILD', 'PAUSED')
        WHEN 'BUILD' THEN NEW."lifecycleState" IN ('GROWTH', 'AT_RISK', 'PAUSED')
        WHEN 'GROWTH' THEN NEW."lifecycleState" IN ('AT_RISK', 'PAUSED')
        WHEN 'AT_RISK' THEN NEW."lifecycleState" IN ('GROWTH', 'PAUSED')
        WHEN 'PAUSED' THEN NEW."lifecycleState" IN ('ONBOARDING', 'BUILD', 'GROWTH', 'AT_RISK', 'OFFBOARDED')
        WHEN 'OFFBOARDED' THEN false
        ELSE false
    END;

    IF NOT allowed THEN
        RAISE EXCEPTION 'Illegal lifecycle transition from % to %', OLD."lifecycleState", NEW."lifecycleState";
    END IF;

    IF NEW."lifecycleState" = 'GROWTH' AND NOT EXISTS (
        SELECT 1 FROM "BaselineSnapshot" WHERE "clientId" = OLD."id"
    ) THEN
        RAISE EXCEPTION 'Cannot transition to GROWTH: A BaselineSnapshot is required to proceed.';
    END IF;

    IF NEW."lifecycleState" = 'PAUSED' AND OLD."lifecycleState" <> 'PAUSED' THEN
        INSERT INTO "Task" (
            "id",
            "taskId",
            "clientId",
            "title",
            "description",
            "module",
            "priority",
            "status",
            "idempotencyKey",
            "createdAt",
            "updatedAt"
        ) VALUES (
            'db_' || md5(random()::text || clock_timestamp()::text),
            'REQ-NFR-06',
            OLD."id",
            'Offboarding handover checklist',
            'Complete account handover, access cleanup, export delivery, and retention/deletion confirmation before OFFBOARDED.',
            'M6',
            'HIGH',
            'NOT_STARTED',
            'OffboardingChecklist:' || OLD."id",
            now(),
            now()
        )
        ON CONFLICT ("idempotencyKey") DO NOTHING;
    END IF;

    IF NEW."lifecycleState" = 'OFFBOARDED' AND NOT EXISTS (
        SELECT 1 FROM "Task"
        WHERE "clientId" = OLD."id"
          AND "idempotencyKey" = 'OffboardingChecklist:' || OLD."id"
          AND "status" = 'DONE'
    ) THEN
        RAISE EXCEPTION 'Cannot transition to OFFBOARDED: offboarding handover checklist task must be DONE.';
    END IF;

    INSERT INTO "ChangeLogEntry" (
        "id",
        "clientId",
        "module",
        "entityType",
        "entityId",
        "field",
        "oldValue",
        "newValue",
        "changedById",
        "createdAt"
    ) VALUES (
        'db_' || md5(random()::text || clock_timestamp()::text),
        OLD."id",
        'CORE',
        'Client',
        OLD."id",
        'lifecycleState',
        OLD."lifecycleState"::text,
        NEW."lifecycleState"::text,
        NULLIF(current_setting('app.current_user_id', true), ''),
        now()
    );

    IF NEW."lifecycleState" = 'AT_RISK' THEN
        at_risk_task_id := 'db_' || md5(random()::text || clock_timestamp()::text);

        INSERT INTO "Task" (
            "id",
            "taskId",
            "clientId",
            "title",
            "description",
            "module",
            "priority",
            "status",
            "createdAt",
            "updatedAt"
        ) VALUES (
            at_risk_task_id,
            'REQ-M6-STATE-03',
            OLD."id",
            'CRITICAL: Client AT RISK - Immediate Outreach Required',
            'Automated trigger: Client has entered AT_RISK state.',
            'M6',
            'CRITICAL',
            'NOT_STARTED',
            now(),
            now()
        );

        INSERT INTO "Notification" (
            "id",
            "userId",
            "type",
            "title",
            "message",
            "relatedEntityId",
            "relatedEntityType",
            "createdAt",
            "updatedAt"
        )
        SELECT
            'db_' || md5(random()::text || clock_timestamp()::text || "id"),
            "id",
            'client_at_risk',
            'Client At Risk',
            'A client has transitioned to AT_RISK. Urgent churn prevention task generated.',
            at_risk_task_id,
            'task',
            now(),
            now()
        FROM "StaffUser"
        WHERE "organizationId" = OLD."organizationId"
          AND "role" = 'OWNER';
    END IF;

    IF NEW."lifecycleState" = 'OFFBOARDED' THEN
        UPDATE "LeadLogEntry"
        SET "contactInfo" = '[REDACTED DUE TO OFFBOARDING]'
        WHERE "clientId" = OLD."id";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS guard_client_lifecycle_transition ON "Client";

CREATE TRIGGER guard_client_lifecycle_transition
    BEFORE UPDATE OF "lifecycleState" ON "Client"
    FOR EACH ROW
    EXECUTE FUNCTION guard_client_lifecycle_transition();
