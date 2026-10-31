import { requireSession } from "@/lib/auth";
import { siteConfig } from "@/app/config/site";
import { sql } from "@/lib/db";
import { getAuditLogs } from "@/lib/db/audit";
import {
  Database,
  FileCheck,
  Landmark,
  ShieldCheck,
  Server,
} from "lucide-react";
import { formatFrenchDate } from "@/lib/formatters";

interface MigrationRow {
  version: string;
  name: string;
  applied_at: string;
}

export default async function ParametresPage() {
  await requireSession(["SUPER_ADMIN"]);

  const [appliedMigrationsRows, auditLogs] = await Promise.all([
    sql`SELECT version, name, applied_at::text FROM schema_migrations ORDER BY version ASC`,
    getAuditLogs(10),
  ]);

  const appliedMigrations = appliedMigrationsRows as unknown as MigrationRow[];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
            Paramètres du Système
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Règles financières, statut de la base de données Neon PostgreSQL et
            journal d&apos;audit.
          </p>
        </div>
      </div>

      {/* Grid: Règles Financières & Infrastructure Base de Données */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Règles Financières & Identité Fiscale */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-primary flex items-center gap-2">
            <Landmark className="size-4 text-primary" /> Règles Financières &
            Identité Fiscale
          </h3>

          <dl className="grid grid-cols-2 gap-4 text-xs border-t border-border pt-4">
            <div className="rounded-xl bg-secondary/40 p-3 border border-border/60">
              <dt className="text-muted-foreground font-semibold">
                Devise commerciale
              </dt>
              <dd className="font-mono font-bold text-foreground text-sm mt-1">
                USD ($)
              </dd>
            </div>
            <div className="rounded-xl bg-secondary/40 p-3 border border-border/60">
              <dt className="text-muted-foreground font-semibold">
                Taux de TVA standard
              </dt>
              <dd className="font-mono font-bold text-foreground text-sm mt-1">
                16.00 %
              </dd>
            </div>
            <div className="rounded-xl bg-secondary/40 p-3 border border-border/60">
              <dt className="text-muted-foreground font-semibold">
                Numéro RCCM
              </dt>
              <dd className="font-mono font-bold text-primary text-xs mt-1 truncate">
                {siteConfig.legal.rccm}
              </dd>
            </div>
            <div className="rounded-xl bg-secondary/40 p-3 border border-border/60">
              <dt className="text-muted-foreground font-semibold">
                Agrément ARSP
              </dt>
              <dd className="font-bold text-primary text-xs mt-1">
                Certificat N° 17046
              </dd>
            </div>
          </dl>

          <div className="rounded-xl bg-secondary/30 p-3.5 border border-border text-xs text-muted-foreground space-y-1">
            <p className="font-bold text-foreground">Siège social :</p>
            <p>
              {siteConfig.address.line}, {siteConfig.address.city},{" "}
              {siteConfig.address.country}.
            </p>
          </div>
        </div>

        {/* Infrastructure Base de Données */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-black text-primary flex items-center gap-2">
              <Database className="size-4 text-primary" /> Base de Données Neon
              PostgreSQL
            </h3>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-0.5 text-[10px] font-bold text-success">
              <span className="size-1.5 rounded-full bg-success animate-pulse" />{" "}
              Opérationnel
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between rounded-xl bg-secondary/30 px-3 py-2 border border-border/60">
              <span className="text-muted-foreground font-semibold">
                Pilote d&apos;accès :
              </span>
              <span className="font-mono font-bold text-foreground text-[11px]">
                @neondatabase/serverless
              </span>
            </div>

            <div>
              <p className="text-muted-foreground font-semibold mb-2">
                Migrations appliquées :
              </p>
              <div className="space-y-1.5 font-mono text-[11px] max-h-[140px] overflow-y-auto pr-1">
                {appliedMigrations.map((m) => (
                  <div
                    key={m.version}
                    className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 border border-border/60"
                  >
                    <span
                      className="font-bold text-primary truncate max-w-[200px]"
                      title={m.name}
                    >
                      {m.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(m.applied_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-sm font-black text-primary flex items-center gap-2">
            <FileCheck className="size-4 text-primary" /> Journal d&apos;Audit
            des Opérations Récentes
          </h3>
          <span className="text-[11px] text-muted-foreground">
            10 derniers événements enregistrés
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/40 font-black text-muted-foreground uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3">Date & Heure</th>
                <th className="py-3 px-3">Utilisateur</th>
                <th className="py-3 px-3">Action Réalisée</th>
                <th className="py-3 px-3">Type d&apos;entité</th>
                <th className="py-3 px-3">ID Cible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {auditLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Aucun événement d&apos;audit enregistré.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-secondary/30 transition-colors"
                  >
                    <td className="py-3 px-3 font-mono text-muted-foreground text-[11px]">
                      {formatFrenchDate(log.createdAt)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-foreground">
                      {log.userFullName || "Système"}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-primary text-[11px]">
                      {log.action}
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded-md bg-secondary border border-border px-2 py-0.5 text-[10px] font-bold text-foreground">
                        {log.entityType}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-muted-foreground text-[10px] truncate max-w-xs">
                      {log.entityId}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
