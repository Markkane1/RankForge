-- REQ-NFR-07: Immutable append-only audit trail
-- Create a trigger function that forcefully rejects any UPDATE or DELETE operations on ChangeLogEntry

CREATE OR REPLACE FUNCTION prevent_change_log_mutations()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'ChangeLogEntry table is strictly append-only. UPDATE and DELETE operations are forbidden for compliance.';
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to block UPDATE operations
CREATE TRIGGER prevent_change_log_update
    BEFORE UPDATE ON "ChangeLogEntry"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_change_log_mutations();

-- Apply the trigger to block DELETE operations
CREATE TRIGGER prevent_change_log_delete
    BEFORE DELETE ON "ChangeLogEntry"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_change_log_mutations();