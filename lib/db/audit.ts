// ============================================================================
// Audit Logging Service for MIS SARL
// ============================================================================

import { sql } from "@/lib/db";

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userEmail?: string;
  userFullName?: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

export async function logAudit(params: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}): Promise<void> {
  try {
    const detailsJson = JSON.stringify(params.details || {});
    await sql`
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
  } catch (err) {
    console.error("[AuditLog] Failed to record audit log:", err);
  }
}

export async function getAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
  const rows = await sql`
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

  return rows as unknown as AuditLogEntry[];
}
