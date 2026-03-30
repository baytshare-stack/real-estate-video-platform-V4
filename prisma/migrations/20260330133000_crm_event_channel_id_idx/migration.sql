-- Studio CRM lists template events by channelId; speeds up TEMPLATE_* lookups.
CREATE INDEX "CrmEvent_channelId_idx" ON "CrmEvent"("channelId");
