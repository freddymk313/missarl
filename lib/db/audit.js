"use strict";
// ============================================================================
// Audit Logging Service for MIS SARL
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = logAudit;
exports.getAuditLogs = getAuditLogs;
const db_1 = require("@/lib/db");
async function logAudit(params) {
    try {
        const detailsJson = JSON.stringify(params.details || {});
        await (0, db_1.sql) `
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
      VALUES (
        ${params.userId || null}, 
        ${params.action}, 
        ${params.entityType}, 
        ${params.entityId}, 
        ${detailsJson}::jsonb, 
        ${params.ipAddress || null}
      )
    `;
    }
    catch (err) {
        console.error("[AuditLog] Failed to record audit log:", err);
    }
}
async function getAuditLogs(limit = 100) {
    const rows = await (0, db_1.sql) `
    SELECT 
      a.id,
      a.user_id as "userId",
      u.email as "userEmail",
      u.full_name as "userFullName",
      a.action,
      a.entity_type as "entityType",
      a.entity_id as "entityId",
      a.details,
      a.ip_address as "ipAddress",
      a.created_at as "createdAt"
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT ${limit}
  `;
    return rows;
}
