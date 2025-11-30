-- CreateIndex
CREATE INDEX `Layout_userId_isActive_idx` ON `Layout`(`userId`, `isActive`);

-- CreateIndex
CREATE INDEX `Widget_layoutId_order_idx` ON `Widget`(`layoutId`, `order`);
