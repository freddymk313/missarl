"use client";

import { useState } from "react";
import { Plus, Power, X } from "lucide-react";
import { UserRecord } from "@/lib/db/users";
import { UserRole, ROLES } from "@/lib/permissions";
import { createUserAction, updateUserAction } from "@/actions/users";
import { formatFrenchDate } from "@/lib/formatters";

interface UsersManagerProps {
  initialUsers: UserRecord[];
  currentUserId: string;
}

export function UsersManager({ initialUsers, currentUserId }: UsersManagerProps) {
  const [users, setUsers] = useState<UserRecord[]>(initialUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

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

    const formData = new FormData(e.currentTarget);
    try {
      const res = await createUserAction(formData);
      if (!res.success) {
        setFormError(res.error || "Erreur de création");
      } else if (res.user) {
        setUsers((prev) => [res.user!, ...prev]);
        setIsModalOpen(false);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          {users.length} compte(s) utilisateur(s) configuré(s). Seul le Super Administrateur peut créer des accès et attribuer les privilèges.
        </p>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs shrink-0 cursor-pointer"
        >
          <Plus className="size-4" /> Nouvel Utilisateur
        </button>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/40 font-black text-muted-foreground uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Collaborateur</th>
                <th className="py-3.5 px-4">Adresse Email</th>
                <th className="py-3.5 px-4">Rôle Attribué</th>
                <th className="py-3.5 px-4">Dernière Connexion</th>
                <th className="py-3.5 px-4 text-center">État</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {users.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-foreground flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-xs">
                        {u.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-foreground">{u.fullName}</span>
                          {isSelf && (
                            <span className="rounded-md bg-secondary px-1.5 py-0.2 text-[9px] font-black uppercase text-primary">
                              Vous
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">{u.email}</td>
                    <td className="py-3.5 px-4">
                      {isSelf ? (
                        <span className="inline-block rounded-md bg-accent/20 border border-accent/40 px-2 py-0.5 text-[10px] font-black uppercase text-foreground">
                          {ROLES[u.role].label}
                        </span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          className="h-8 rounded-lg border border-border bg-card px-2 text-xs font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="SUPER_ADMIN">Super Administrateur</option>
                          <option value="ADMIN">Admin Commercial</option>
                          <option value="PRICE_COLLECTOR">Collecteur de Prix</option>
                        </select>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                      {u.lastLoginAt ? formatFrenchDate(u.lastLoginAt) : "Jamais connecté"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.isActive
                            ? "bg-success/15 text-success border border-success/30"
                            : "bg-destructive/15 text-destructive border border-destructive/30"
                        }`}
                      >
                        {u.isActive ? "Actif" : "Désactivé"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u.id, u.isActive)}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-colors cursor-pointer border ${
                            u.isActive
                              ? "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                              : "bg-success/15 text-success border-success/30 hover:bg-success/25"
                          }`}
                        >
                          <Power className="size-3" />
                          {u.isActive ? "Désactiver" : "Activer"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Create User */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-extrabold text-primary">Créer un Utilisateur Interne</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive border border-destructive/20">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground">Nom complet *</label>
                <input
                  name="fullName"
                  required
                  placeholder="ex: Jean Ilunga"
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground">Adresse email *</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="nom@missarl.com"
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground">Mot de passe temporaire *</label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground">Rôle & Privilèges *</label>
                <select
                  name="role"
                  required
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                >
                  <option value="ADMIN">Admin Commercial (Devis, Commandes, Factures)</option>
                  <option value="PRICE_COLLECTOR">Collecteur de Prix (Catalogue et Tarifs uniquement)</option>
                  <option value="SUPER_ADMIN">Super Administrateur (Accès Total)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Création..." : "Créer le compte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
