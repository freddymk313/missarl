"use client";

import { useState } from "react";
import { Plus, Power, X } from "lucide-react";
import { UserRecord } from "@/lib/db/users";
import { UserRole, ROLES } from "@/lib/permissions";
import { createUserAction, updateUserAction } from "@/actions/users";

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
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {users.length} compte(s) utilisateur(s) configuré(s). Seul le Super Administrateur peut créer des accès et attribuer les privilèges.
        </p>

        <button onClick={() => setIsModalOpen(true)} className="button button-primary text-xs shrink-0">
          <Plus className="size-4" /> Nouvel Utilisateur
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-slate-50 font-black text-slate-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Nom Complet</th>
                <th className="py-3.5 px-4">Email</th>
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
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-primary flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                        {u.fullName.charAt(0).toUpperCase()}
                      </div>
                      <span>{u.fullName}</span>
                      {isSelf && (
                        <span className="rounded bg-slate-200 px-1.5 py-0.2 text-[9px] font-black uppercase text-slate-700">
                          Vous
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">{u.email}</td>
                    <td className="py-3.5 px-4">
                      {isSelf ? (
                        <span className="rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-black uppercase text-amber-900">
                          {ROLES[u.role].label}
                        </span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          className="rounded-lg border border-border bg-white px-2 py-1 text-xs font-semibold"
                        >
                          <option value="SUPER_ADMIN">Super Administrateur</option>
                          <option value="ADMIN">Admin Commercial</option>
                          <option value="PRICE_COLLECTOR">Collecteur de Prix</option>
                        </select>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("fr-FR") : "Jamais connecté"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {u.isActive ? "Actif" : "Désactivé"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {!isSelf && (
                        <button
                          onClick={() => handleToggleActive(u.id, u.isActive)}
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
                            u.isActive
                              ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-extrabold text-primary">Créer un Utilisateur Interne</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-800 border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Nom complet *</label>
                <input
                  name="fullName"
                  required
                  placeholder="ex: Jean Ilunga"
                  className="form-field mt-1 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Adresse email *</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="nom@missarl.com"
                  className="form-field mt-1 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Mot de passe temporaire *</label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="form-field mt-1 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Rôle & Privilèges *</label>
                <select name="role" required className="form-field mt-1 text-xs font-bold text-primary">
                  <option value="ADMIN">Admin Commercial (Devis, Commandes, Factures)</option>
                  <option value="PRICE_COLLECTOR">Collecteur de Prix (Catalogue et Tarifs uniquement)</option>
                  <option value="SUPER_ADMIN">Super Administrateur (Accès Total)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="button button-outline text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="button button-primary text-xs"
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
