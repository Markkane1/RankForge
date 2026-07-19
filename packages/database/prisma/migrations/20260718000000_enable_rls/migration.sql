-- Enable Row Level Security on multitenant tables
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StaffUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrgCredential" ENABLE ROW LEVEL SECURITY;

-- Create policies for Client
CREATE POLICY "org_isolation_client" ON "Client"
  AS PERMISSIVE FOR ALL
  TO public
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));

-- Create policies for StaffUser
CREATE POLICY "org_isolation_staff" ON "StaffUser"
  AS PERMISSIVE FOR ALL
  TO public
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));

-- Create policies for OrgCredential
CREATE POLICY "org_isolation_credential" ON "OrgCredential"
  AS PERMISSIVE FOR ALL
  TO public
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));

-- IMPORTANT: This requires middleware or Prisma extensions to execute 
-- `SET app.current_org_id = 'xxx'` before running tenant-specific queries.
