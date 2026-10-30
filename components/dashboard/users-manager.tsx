"use client";

import * as React from "react";
import {
  Users,
  Plus,
  Shield,
  ShieldCheck,
  Power,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { UserRecord } from "@/lib/db/users";
import { UserRole, ROLES } from "@/lib/permissions";
import { createUserAction, updateUserAction } from "@/actions/users";
import {
  PageHeader,
  DataTable,
  DataTableToolbar,
  StatusPill,
  DetailSheet,
  formatDate,
} from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface UsersManagerProps {
  initialUsers: UserRecord[];
  currentUserId: string;
}

export function UsersManager({ initialUsers, currentUserId }: UsersManagerProps) {
  const [users, setUsers] = React.useState<UserRecord[]>(initialUsers);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  // Temporary password success banner
  const [newCreatedUser, setNewCreatedUser] = React.useState<{
    fullName: string;
    email: string;
    tempPassword: string;
  } | null>(null);
  const [copied, setCopied] = React.useState(false);

  const filteredUsers = React.useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, searchTerm]);

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    if (userId === currentUserId) {
      alert("Vous ne pouvez pas désactiver votre propre compte Super Administrateur.");
      return;
    }

    const res = await updateUserAction(userId, { isActive: !currentActive });
    if (!res.success) {
      alert(res.error || "Erreur de mise à jour");
    } else if (res.user) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.user! : u)));
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (userId === currentUserId) {
      alert("Vous ne pouvez pas modifier votre propre rôle.");
      return;
    }

    const res = await updateUserAction(userId, { role: newRole });
    if (!res.success) {
      alert(res.error || "Erreur de modification du rôle");
    } else if (res.user) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.user! : u)));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const pwd = formData.get("password")?.toString() || "";
    const name = formData.get("fullName")?.toString() || "";
    const email = formData.get("email")?.toString() || "";

    try {
      const res = await createUserAction(formData);
      if (!res.success) {
        setFormError(res.error || "Erreur de création");
      } else if (res.user) {
        setUsers((prev) => [res.user!, ...prev]);
        setIsModalOpen(false);
        setNewCreatedUser({
          fullName: name,
          email,
          tempPassword: pwd,
        });
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPassword = () => {
    if (!newCreatedUser) return;
    navigator.clipboard.writeText(newCreatedUser.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const roleBadgeStyles: Record<UserRole, { label: string; className: string }> = {
    SUPER_ADMIN: {
      label: "Super Administrateur",
      className: "border-primary/30 bg-primary/10 text-primary font-bold",
    },
    ADMIN: {
      label: "Administrateur Commercial",
      className: "border-accent/30 bg-accent/15 text-accent-foreground font-semibold",
    },
    PRICE_COLLECTOR: {
      label: "Collecteur de Prix",
      className: "border-border/80 bg-secondary text-muted-foreground font-medium",
    },
  };

  const columns = React.useMemo<ColumnDef<UserRecord>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: "Utilisateur",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="size-8 rounded-lg bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center shrink-0">
              <AvatarFallback className="rounded-lg bg-primary text-primary-foreground font-bold text-xs">
                {row.original.fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <span className="font-bold text-foreground block truncate">
                {row.original.fullName}
              </span>
              <span className="text-[11px] text-muted-foreground block truncate">
                {row.original.email}
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: "Rôle attribué",
        cell: ({ row }) => {
          const isSelf = row.original.id === currentUserId;
          const conf = roleBadgeStyles[row.original.role] || {
            label: row.original.role,
            className: "bg-secondary text-foreground",
          };

          return (
            <div className="flex items-center gap-2">
              <select
                disabled={isSelf}
                value={row.original.role}
                onChange={(e) =>
                  handleRoleChange(row.original.id, e.target.value as UserRole)
                }
                className={`h-7 rounded-lg border px-2 text-xs outline-none ${conf.className} ${
                  isSelf ? "opacity-80 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <option value="SUPER_ADMIN">Super Administrateur</option>
                <option value="ADMIN">Administrateur Commercial</option>
                <option value="PRICE_COLLECTOR">Collecteur de Prix</option>
              </select>
              {isSelf && (
                <span className="text-[10px] text-muted-foreground italic">(Vous)</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "lastLoginAt",
        header: "Dernière connexion",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs tabular-nums">
            {row.original.lastLoginAt ? formatDate(row.original.lastLoginAt) : "Jamais connecté"}
          </span>
        ),
      },
      {
        accessorKey: "isActive",
        header: "État du compte",
        cell: ({ row }) => (
          <StatusPill status={row.original.isActive ? "ACTIVE" : "INACTIVE"} />
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const isSelf = row.original.id === currentUserId;
          return (
            <div className="text-right">
              <button
                type="button"
                disabled={isSelf}
                onClick={() =>
                  handleToggleActive(row.original.id, row.original.isActive)
                }
                title={
                  isSelf
                    ? "Impossible de désactiver votre propre compte"
                    : row.original.isActive
                    ? "Désactiver ce compte"
                    : "Activer ce compte"
                }
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-colors ${
                  isSelf
                    ? "opacity-40 cursor-not-allowed border-border"
                    : row.original.isActive
                    ? "border-destructive/20 text-destructive hover:bg-destructive/10"
                    : "border-success/20 text-success hover:bg-success/10"
                }`}
              >
                <Power className="size-3" />
                <span>{row.original.isActive ? "Désactiver" : "Activer"}</span>
              </button>
            </div>
          );
        },
      },
    ],
    [currentUserId]
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title="Gestion des Utilisateurs & Rôles"
        description="Contrôle des accès, attributions des habilitations et gestion du cycle de vie des comptes."
        icon={<Users className="size-5" />}
        actions={
          <Button
            onClick={() => {
              setFormError("");
              setIsModalOpen(true);
            }}
            className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
          >
            <Plus className="size-3.5" />
            <span>Nouvel utilisateur</span>
          </Button>
        }
      />

      {/* Temporary Password Notification Banner */}
      {newCreatedUser && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary font-bold text-xs sm:text-sm">
              <ShieldCheck className="size-4 text-accent" />
              <span>Compte créé pour {newCreatedUser.fullName}</span>
            </div>
            <button
              type="button"
              onClick={() => setNewCreatedUser(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Fermer
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3.5">
            <div>
              <span className="text-[11px] text-muted-foreground block">
                Mot de passe temporaire unique généré :
              </span>
              <span className="font-mono text-sm font-bold text-foreground">
                {newCreatedUser.tempPassword}
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyPassword}
              className="h-8 gap-1.5 text-xs font-semibold self-start sm:self-auto border-border"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-success" />
                  <span>Copié dans le presse-papiers</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span>Copier le mot de passe</span>
                </>
              )}
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <AlertTriangle className="size-3 text-warning-foreground shrink-0" />
            <span>
              Transmettez ces identifiants de manière sécurisée à l&apos;utilisateur. Ce mot de passe ne sera plus affiché après fermeture.
            </span>
          </p>
        </div>
      )}

      {/* Users Table */}
      <DataTable
        columns={columns}
        data={filteredUsers}
        toolbar={
          <DataTableToolbar
            searchPlaceholder="Rechercher par nom, email, rôle..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            onAddNew={() => {
              setFormError("");
              setIsModalOpen(true);
            }}
            addNewLabel="Nouvel utilisateur"
          />
        }
        renderMobileCard={(u) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Avatar className="size-7 rounded-lg bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center">
                  <AvatarFallback className="rounded-lg bg-primary text-primary-foreground font-bold text-xs">
                    {u.fullName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-foreground text-xs">{u.fullName}</p>
                  <p className="text-[10px] text-muted-foreground">{u.email}</p>
                </div>
              </div>
              <StatusPill status={u.isActive ? "ACTIVE" : "INACTIVE"} />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
              <span className="text-muted-foreground text-[11px]">{ROLES[u.role]?.label || u.role}</span>
              {u.id === currentUserId ? (
                <span className="text-[10px] text-muted-foreground italic">(Votre compte)</span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleToggleActive(u.id, u.isActive)}
                  className={`text-xs font-semibold ${
                    u.isActive ? "text-destructive" : "text-success"
                  }`}
                >
                  {u.isActive ? "Désactiver" : "Activer"}
                </button>
              )}
            </div>
          </div>
        )}
      />

      {/* Create User Sheet */}
      <DetailSheet
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title="Créer un Nouvel Utilisateur"
        subtitle="Créez un compte pour un collaborateur et définissez son rôle opérationnel."
      >
        {formError && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Nom complet du collaborateur *
            </label>
            <input
              type="text"
              name="fullName"
              required
              placeholder="Ex: Jean Mukendi"
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs font-medium text-foreground outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Adresse email professionnelle *
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="jmukendi@missarl.com"
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs font-medium text-foreground outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Rôle attribué *
            </label>
            <select
              name="role"
              required
              defaultValue="ADMIN"
              className="h-10 w-full rounded-lg border border-input bg-card px-2.5 text-xs font-semibold text-foreground outline-none"
            >
              <option value="ADMIN">Administrateur Commercial (Clients, Devis, Commandes, Factures)</option>
              <option value="PRICE_COLLECTOR">Collecteur de Prix (Catalogue et Tarifs uniquement)</option>
              <option value="SUPER_ADMIN">Super Administrateur (Gestion totale du système)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Mot de passe initial *
            </label>
            <input
              type="text"
              name="password"
              required
              minLength={6}
              defaultValue="Password123!"
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs font-mono font-bold text-foreground outline-none"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Au minimum 6 caractères. L&apos;utilisateur pourra le modifier ultérieurement.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              className="h-8 text-xs"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              size="sm"
              className="h-8 bg-primary text-primary-foreground text-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3 animate-spin mr-1" />
                  Création...
                </>
              ) : (
                "Créer le compte utilisateur"
              )}
            </Button>
          </div>
        </form>
      </DetailSheet>
    </div>
  );
}
