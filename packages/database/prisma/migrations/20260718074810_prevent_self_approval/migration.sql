-- REQ-AUTH-05: Coordinator self-approval 4-eyes check constraint
-- Prevent the approver from being the same as the requester at the database level.

ALTER TABLE "ApprovalRequest"
ADD CONSTRAINT "prevent_self_approval"
CHECK ("requestedById" <> "approvedById" OR "approvedById" IS NULL);