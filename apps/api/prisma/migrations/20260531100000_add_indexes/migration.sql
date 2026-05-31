-- CreateIndex
CREATE INDEX "Shop_zone_idx" ON "Shop"("zone");

-- CreateIndex
CREATE INDEX "Shop_isVerified_idx" ON "Shop"("isVerified");

-- CreateIndex
CREATE INDEX "Order_shopId_idx" ON "Order"("shopId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_batchId_idx" ON "Order"("batchId");

-- CreateIndex
CREATE INDEX "Order_scheduledFor_idx" ON "Order"("scheduledFor");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Loan_shopId_idx" ON "Loan"("shopId");

-- CreateIndex
CREATE INDEX "Notification_shopId_idx" ON "Notification"("shopId");

