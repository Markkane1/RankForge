-- REQ-AUTH-07 / REQ-SEC-01: client-scoped RLS coverage.

ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_isolation" ON "Client";
CREATE POLICY "client_isolation" ON "Client"
  FOR ALL
  USING ("id" = current_setting('app.current_client_id', true))
  WITH CHECK ("id" = current_setting('app.current_client_id', true));

DO $$
DECLARE
  direct_table text;
  direct_tables text[] := ARRAY[
    'GbpProfile',
    'GeoGridScanResult',
    'ClientAsset',
    'KeywordMapEntry',
    'CompetitorBenchmark',
    'ServiceArea',
    'ChangeLogEntry',
    'LeadLogEntry',
    'MonthlyReport',
    'ClientCredential',
    'BaselineSnapshot',
    'ClientPortalUser',
    'ClientPreference',
    'SiteAudit',
    'SiteRestorePoint',
    'PageMatrixEntry',
    'CitationRecord',
    'BacklinkOpportunity',
    'SecondaryReviewMetric',
    'ReviewAsk',
    'ContentPiece'
  ];
  optional_direct_table text;
  optional_direct_tables text[] := ARRAY[
    'Task',
    'ApprovalRequest',
    'WriteAttempt'
  ];
BEGIN
  FOREACH direct_table IN ARRAY direct_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', direct_table);
    EXECUTE format('DROP POLICY IF EXISTS client_isolation ON %I', direct_table);
    EXECUTE format(
      'CREATE POLICY client_isolation ON %I FOR ALL USING ("clientId" = current_setting(''app.current_client_id'', true)) WITH CHECK ("clientId" = current_setting(''app.current_client_id'', true))',
      direct_table
    );
  END LOOP;

  FOREACH optional_direct_table IN ARRAY optional_direct_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', optional_direct_table);
    EXECUTE format('DROP POLICY IF EXISTS client_isolation ON %I', optional_direct_table);
    EXECUTE format(
      'CREATE POLICY client_isolation ON %I FOR ALL USING ("clientId" IS NULL OR "clientId" = current_setting(''app.current_client_id'', true)) WITH CHECK ("clientId" IS NULL OR "clientId" = current_setting(''app.current_client_id'', true))',
      optional_direct_table
    );
  END LOOP;
END $$;

ALTER TABLE "GbpFaq" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_isolation" ON "GbpFaq";
CREATE POLICY "client_isolation" ON "GbpFaq"
  FOR ALL
  USING (EXISTS (SELECT 1 FROM "GbpProfile" gp WHERE gp.id = "GbpFaq"."gbpProfileId" AND gp."clientId" = current_setting('app.current_client_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM "GbpProfile" gp WHERE gp.id = "GbpFaq"."gbpProfileId" AND gp."clientId" = current_setting('app.current_client_id', true)));

ALTER TABLE "GbpProduct" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_isolation" ON "GbpProduct";
CREATE POLICY "client_isolation" ON "GbpProduct"
  FOR ALL
  USING (EXISTS (SELECT 1 FROM "GbpProfile" gp WHERE gp.id = "GbpProduct"."gbpProfileId" AND gp."clientId" = current_setting('app.current_client_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM "GbpProfile" gp WHERE gp.id = "GbpProduct"."gbpProfileId" AND gp."clientId" = current_setting('app.current_client_id', true)));

ALTER TABLE "GbpPost" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_isolation" ON "GbpPost";
CREATE POLICY "client_isolation" ON "GbpPost"
  FOR ALL
  USING (EXISTS (SELECT 1 FROM "GbpProfile" gp WHERE gp.id = "GbpPost"."gbpProfileId" AND gp."clientId" = current_setting('app.current_client_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM "GbpProfile" gp WHERE gp.id = "GbpPost"."gbpProfileId" AND gp."clientId" = current_setting('app.current_client_id', true)));

ALTER TABLE "GbpReview" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_isolation" ON "GbpReview";
CREATE POLICY "client_isolation" ON "GbpReview"
  FOR ALL
  USING (EXISTS (SELECT 1 FROM "GbpProfile" gp WHERE gp.id = "GbpReview"."gbpProfileId" AND gp."clientId" = current_setting('app.current_client_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM "GbpProfile" gp WHERE gp.id = "GbpReview"."gbpProfileId" AND gp."clientId" = current_setting('app.current_client_id', true)));

ALTER TABLE "GbpPhoto" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_isolation" ON "GbpPhoto";
CREATE POLICY "client_isolation" ON "GbpPhoto"
  FOR ALL
  USING (EXISTS (SELECT 1 FROM "GbpProfile" gp WHERE gp.id = "GbpPhoto"."gbpProfileId" AND gp."clientId" = current_setting('app.current_client_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM "GbpProfile" gp WHERE gp.id = "GbpPhoto"."gbpProfileId" AND gp."clientId" = current_setting('app.current_client_id', true)));

ALTER TABLE "GbpService" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_isolation" ON "GbpService";
CREATE POLICY "client_isolation" ON "GbpService"
  FOR ALL
  USING (EXISTS (SELECT 1 FROM "GbpProfile" gp WHERE gp.id = "GbpService"."gbpProfileId" AND gp."clientId" = current_setting('app.current_client_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM "GbpProfile" gp WHERE gp.id = "GbpService"."gbpProfileId" AND gp."clientId" = current_setting('app.current_client_id', true)));

ALTER TABLE "Subtask" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_isolation" ON "Subtask";
CREATE POLICY "client_isolation" ON "Subtask"
  FOR ALL
  USING (EXISTS (SELECT 1 FROM "Task" t WHERE t.id = "Subtask"."taskId" AND (t."clientId" IS NULL OR t."clientId" = current_setting('app.current_client_id', true))))
  WITH CHECK (EXISTS (SELECT 1 FROM "Task" t WHERE t.id = "Subtask"."taskId" AND (t."clientId" IS NULL OR t."clientId" = current_setting('app.current_client_id', true))));

ALTER TABLE "TaskLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_isolation" ON "TaskLog";
CREATE POLICY "client_isolation" ON "TaskLog"
  FOR ALL
  USING (EXISTS (SELECT 1 FROM "Task" t WHERE t.id = "TaskLog"."taskId" AND (t."clientId" IS NULL OR t."clientId" = current_setting('app.current_client_id', true))))
  WITH CHECK (EXISTS (SELECT 1 FROM "Task" t WHERE t.id = "TaskLog"."taskId" AND (t."clientId" IS NULL OR t."clientId" = current_setting('app.current_client_id', true))));

ALTER TABLE "SiteAuditIssue" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_isolation" ON "SiteAuditIssue";
CREATE POLICY "client_isolation" ON "SiteAuditIssue"
  FOR ALL
  USING (EXISTS (SELECT 1 FROM "SiteAudit" sa WHERE sa.id = "SiteAuditIssue"."siteAuditId" AND sa."clientId" = current_setting('app.current_client_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM "SiteAudit" sa WHERE sa.id = "SiteAuditIssue"."siteAuditId" AND sa."clientId" = current_setting('app.current_client_id', true)));
