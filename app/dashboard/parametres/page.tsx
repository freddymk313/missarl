import { requireSession } from "@/lib/auth";
import { siteConfig } from "@/app/config/site";
import { sql } from "@/lib/db";
import { getAuditLogs } from "@/lib/db/audit";
import { Database, FileCheck, Landmark } from "lucide-react";

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
    <div className="space-y-8 max-w-7xl">
      <div>
        <p className="kicker">Configuration d&apos;Entreprise</p>
        <h1 className="text-2xl font-black text-primary tracking-tight mt-1">
          Paramètres du Système
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Constantes comptables, statut de la base de données Neon PostgreSQL et journal d&apos;audit.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Paramètres Financiers & Légaux */}
        <div className="rounded-2xl border border-border bg-white p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-extrabold text-primary flex items-center gap-2">
            <Landmark className="size-4 text-accent" /> Règles Financières & Identité Fiscale
          </h3>

          <dl className="grid grid-cols-2 gap-3 text-xs border-t border-border pt-4">
            <div>
              <dt className="text-muted-foreground font-semibold">Devise commerciale</dt>
              <dd className="font-mono font-bold text-slate-800 text-sm mt-0.5">USD (Dollar américain)</dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-semibold">Taux de TVA standard</dt>
              <dd className="font-mono font-bold text-slate-800 text-sm mt-0.5">16.00 %</dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-semibold">Numéro RCCM</dt>
              <dd className="font-mono font-bold text-primary mt-0.5">{siteConfig.legal.rccm}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-semibold">Agrément ARSP</dt>
              <dd className="font-bold text-primary mt-0.5">Certificat N° 17046</dd>
            </div>
          </dl>

          <div className="rounded-xl bg-slate-50 p-4 border border-border text-xs text-muted-foreground">
            <p className="font-bold text-slate-800">Siège social :</p>
            <p className="mt-0.5">{siteConfig.address.line}, {siteConfig.address.city}, {siteConfig.address.region}, {siteConfig.address.country}.</p>
            <p className="mt-2 font-bold text-slate-800">Coordonnées bancaires pour encaissements :</p>
            <p className="mt-0.5 font-mono text-[11px]">Banque : Rawbank Lubumbashi · Compte USD</p>
          </div>
        </div>

        {/* Infrastructure Base de Données */}
        <div className="rounded-2xl border border-border bg-white p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-extrabold text-primary flex items-center gap-2">
            <Database className="size-4 text-accent" /> Base de Données Neon PostgreSQL
          </h3>

          <div className="border-t border-border pt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Statut de la connexion :</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                <span className="size-1.5 rounded-full bg-emerald-500" /> Connecté (Neon Serverless)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pilote d&apos;accès :</span>
              <span className="font-mono font-bold text-slate-800 text-[11px]">@neondatabase/serverless (SQL direct)</span>
            </div>

            <div>
              <p className="text-muted-foreground mb-1.5">Migrations versionnées appliquées :</p>
              <div className="space-y-1 font-mono text-[11px]">
                {appliedMigrations.map((m) => (
                  <div key={m.version} className="flex items-center justify-between rounded bg-slate-50 px-2.5 py-1 border border-border/60">
                    <span className="font-bold text-primary">{m.name}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(m.applied_at).toLocaleDateString("fr-FR")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-extrabold text-primary flex items-center gap-2">
          <FileCheck className="size-4 text-accent" /> Journal d&apos;Audit des Opérations Récentes (Dernières actions)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-slate-50 font-black text-slate-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Date & Heure</th>
                <th className="py-2.5 px-3">Utilisateur</th>
                <th className="py-2.5 px-3">Action Réalisée</th>
                <th className="py-2.5 px-3">Type d&apos;entité</th>
                <th className="py-2.5 px-3">ID Cible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    Aucun événement d&apos;audit enregistré.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-mono text-muted-foreground text-[11px]">
                      {new Date(log.createdAt).toLocaleString("fr-FR")}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {log.userFullName || "Système"}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-primary text-[11px]">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold">
                        {log.entityType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground text-[10px] truncate max-w-xs">
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
