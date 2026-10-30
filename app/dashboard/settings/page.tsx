import { requireSession } from "@/lib/auth";
import { siteConfig } from "@/app/config/site";
import { sql } from "@/lib/db";
import { getAuditLogs } from "@/lib/db/audit";
import {
  Database,
  FileCheck,
  Landmark,
  Shield,
  Layers,
  CheckCircle2,
  Settings as SettingsIcon,
} from "lucide-react";
import {
  PageHeader,
  KeyValueTile,
  RefChip,
  StatusPill,
  formatDate,
} from "@/components/dashboard/ui";

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
      <PageHeader
        title="Paramètres du Système"
        description="Configuration de l'entreprise, constantes fiscales, état de la base Neon PostgreSQL et journal d'audit."
        icon={<SettingsIcon className="size-5" />}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Section 1: Entreprise & Identité Fiscale */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border/70">
            <Landmark className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              Entreprise & Identité Fiscale
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <KeyValueTile
              label="Devise commerciale"
              value="USD (Dollar américain)"
            />
            <KeyValueTile
              label="Taux de TVA standard"
              value="16.00 %"
            />
            <KeyValueTile
              label="Numéro RCCM"
              value={siteConfig.legal.rccm}
            />
            <KeyValueTile
              label="Agrément ARSP"
              value="Certificat N° 17046"
            />
          </div>

          <div className="rounded-xl border border-border/80 bg-secondary/30 p-3.5 space-y-1.5 text-xs">
            <span className="font-semibold text-foreground block">
              Siège social & Domiciliation :
            </span>
            <p className="text-muted-foreground">
              {siteConfig.address.line}, {siteConfig.address.city}, {siteConfig.address.region}, {siteConfig.address.country}.
            </p>
            <span className="font-semibold text-foreground block pt-2">
              Coordonnées bancaires pour encaissements :
            </span>
            <p className="text-muted-foreground font-medium">
              Banque : Rawbank Lubumbashi · Compte USD
            </p>
          </div>
        </div>

        {/* Section 2: Infrastructure & Base de Données */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border/70">
            <Database className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              Infrastructure Neon PostgreSQL
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Statut de la connexion :</span>
              <StatusPill status="ACTIVE" showDot />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pilote d&apos;accès :</span>
              <span className="font-semibold text-foreground">
                @neondatabase/serverless (SQL direct)
              </span>
            </div>

            <div>
              <p className="text-muted-foreground mb-1.5 font-medium">
                Migrations versionnées appliquées :
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {appliedMigrations.map((m) => (
                  <div
                    key={m.version}
                    className="flex items-center justify-between rounded-lg border border-border/70 bg-secondary/40 px-3 py-1.5 text-[11px]"
                  >
                    <span className="font-semibold text-foreground truncate mr-2">
                      {m.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                      {formatDate(m.applied_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Sécurité & Journal d'Audit */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/70">
          <div className="flex items-center gap-2">
            <FileCheck className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              Journal d&apos;Audit des Opérations Récentes
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            Derniers événements système
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/80 bg-secondary/40 font-semibold text-muted-foreground text-[11px] uppercase">
              <tr>
                <th className="py-2.5 px-3">Date & Heure</th>
                <th className="py-2.5 px-3">Auteur</th>
                <th className="py-2.5 px-3">Action Réalisée</th>
                <th className="py-2.5 px-3">Type d&apos;entité</th>
                <th className="py-2.5 px-3">Identifiant Cible</th>
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
                  <tr key={log.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-2.5 px-3 text-muted-foreground tabular-nums text-[11px]">
                      {new Date(log.createdAt).toLocaleString("fr-FR")}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-foreground">
                      {log.userFullName || "Système"}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-primary">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3">
                      <RefChip variant="muted">{log.entityType}</RefChip>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground text-[11px] truncate max-w-xs tabular-nums">
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
