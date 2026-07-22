DO $$
DECLARE
  direct_tables text[] := ARRAY['ReviewAsk'];
  direct_table text;
BEGIN
  FOREACH direct_table IN ARRAY direct_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', direct_table);
    EXECUTE format('DROP POLICY IF EXISTS client_isolation ON %I', direct_table);
    EXECUTE format(
      'CREATE POLICY client_isolation ON %I FOR ALL USING ("clientId" = current_setting(''app.current_client_id'', true)) WITH CHECK ("clientId" = current_setting(''app.current_client_id'', true))',
      direct_table
    );
  END LOOP;
END $$;
