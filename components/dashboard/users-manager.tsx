"use client";

import { useState } from "react";
import { Plus, Power, X, Pencil, Trash2, AlertTriangle, Loader2, KeyRound, Shield, Users } from "lucide-react";
import { UserRecord } from "@/lib/db/users";
import { UserRole, ROLES } from "@/lib/permissions";
import { createUserAction, updateUserAction, deleteUserAction } from "@/actions/users";
import { formatFrenchDate } from "@/lib/formatters";

interface UsersManagerProps {
  initialUsers: UserRecord[];
  currentUserId: string;
}

export function UsersManager({ initialUsers, currentUserId }: UsersManagerProps) {
  const [users, setUsers] = useState<UserRecord[]>(initialUsers);
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRecord | null>(null);

  // Loading and feedback states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // Edit form state
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("ADMIN");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPassword, setEditPassword] = useState("");

  const openEditModal = (user: UserRecord) => {
    setEditingUser(user);
    setEditFullName(user.fullName);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditIsActive(user.isActive);
    setEditPassword("");
    setFormError("");
  };

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

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await createUserAction(formData);
      if (!res.success) {
        setFormError(res.error || "Erreur de création de l'utilisateur.");
      } else if (res.user) {
        setUsers((prev) => [res.user!, ...prev]);
        setIsCreateModalOpen(false);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    setFormError("");
    setIsSubmitting(true);

    try {
      const payload: {
        fullName: string;
        email: string;
        role?: UserRole;
        isActive?: boolean;
        password?: string;
      } = {
        fullName: editFullName.trim(),
        email: editEmail.trim(),
      };

      if (editingUser.id !== currentUserId) {
        payload.role = editRole;
        payload.isActive = editIsActive;
      }

      if (editPassword.trim().length > 0) {
        if (editPassword.trim().length < 6) {
          setFormError("Le mot de passe doit contenir au moins 6 caractères.");
          setIsSubmitting(false);
          return;
        }
        payload.password = editPassword.trim();
      }

      const res = await updateUserAction(editingUser.id, payload);
      if (!res.success) {
        setFormError(res.error || "Erreur lors de la modification de l'utilisateur.");
      } else if (res.user) {
        setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? res.user! : u)));
        setEditingUser(null);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    setDeleteError("");
    setIsSubmitting(true);

    try {
      const res = await deleteUserAction(deletingUser.id);
      if (!res.success) {
        setDeleteError(res.error || "Impossible de supprimer cet utilisateur.");
      } else {
        setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
        setDeletingUser(null);
      }
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / En-tête de contrôle élégant */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-secondary border border-border text-primary shrink-0">
            <Users className="size-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">
              {users.length} compte(s) utilisateur(s) configuré(s)
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Seul le Super Administrateur peut créer, modifier ou supprimer des accès internes.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setFormError("");
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs shrink-0 cursor-pointer"
        >
          <Plus className="size-4" /> Nouvel Utilisateur
        </button>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
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
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-xs">
                          {u.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-foreground">{u.fullName}</span>
                            {isSelf && (
                              <span className="rounded-md bg-accent/20 border border-accent/40 px-1.5 py-0.5 text-[9px] font-black uppercase text-foreground">
                                Vous
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary border border-border px-2.5 py-1 text-[11px] font-bold text-foreground">
                        {ROLES[u.role]?.label || u.role}
                      </span>
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
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Modifier */}
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          title="Modifier les informations"
                          className="inline-flex items-center justify-center size-8 rounded-lg border border-border bg-card text-foreground hover:bg-secondary hover:text-primary transition-colors cursor-pointer"
                        >
                          <Pencil className="size-3.5" />
                        </button>

                        {/* Activer / Désactiver (interdit sur soi-même) */}
                        {!isSelf ? (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(u.id, u.isActive)}
                            title={u.isActive ? "Désactiver le compte" : "Activer le compte"}
                            className={`inline-flex items-center justify-center size-8 rounded-lg transition-colors cursor-pointer border ${
                              u.isActive
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20"
                                : "bg-success/15 text-success border-success/30 hover:bg-success/25"
                            }`}
                          >
                            <Power className="size-3.5" />
                          </button>
                        ) : (
                          <div className="size-8" />
                        )}

                        {/* Supprimer (interdit sur soi-même) */}
                        {!isSelf ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError("");
                              setDeletingUser(u);
                            }}
                            title="Supprimer l'utilisateur"
                            className="inline-flex items-center justify-center size-8 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        ) : (
                          <div className="size-8" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Création Utilisateur */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-extrabold text-primary">Créer un Utilisateur Interne</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
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

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
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
                  placeholder="•••••••• (min 6 caractères)"
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground">Rôle & Privilèges *</label>
                <select
                  name="role"
                  required
                  defaultValue="ADMIN"
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
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                  {isSubmitting ? "Création..." : "Créer le compte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Modification Utilisateur */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Pencil className="size-4 text-primary" />
                <h3 className="text-base font-extrabold text-foreground">Modifier l&apos;Utilisateur</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
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

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground">Nom complet *</label>
                <input
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  required
                  placeholder="ex: Jean Ilunga"
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground">Adresse email *</label>
                <input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  type="email"
                  required
                  placeholder="nom@missarl.com"
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>

              {/* Rôle */}
              <div>
                <label className="block text-xs font-bold text-foreground">Rôle & Privilèges *</label>
                {editingUser.id === currentUserId ? (
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                    <Shield className="size-4 text-primary" />
                    <span>Super Administrateur (Votre rôle ne peut pas être rétrogradé)</span>
                  </div>
                ) : (
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    required
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  >
                    <option value="ADMIN">Admin Commercial (Devis, Commandes, Factures)</option>
                    <option value="PRICE_COLLECTOR">Collecteur de Prix (Catalogue et Tarifs uniquement)</option>
                    <option value="SUPER_ADMIN">Super Administrateur (Accès Total)</option>
                  </select>
                )}
              </div>

              {/* État du compte */}
              {editingUser.id !== currentUserId && (
                <div>
                  <label className="block text-xs font-bold text-foreground">Statut du compte *</label>
                  <select
                    value={editIsActive ? "true" : "false"}
                    onChange={(e) => setEditIsActive(e.target.value === "true")}
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  >
                    <option value="true">Actif (Accès autorisé)</option>
                    <option value="false">Désactivé (Accès bloqué)</option>
                  </select>
                </div>
              )}

              {/* Modifier le mot de passe (optionnel) */}
              <div className="rounded-xl border border-border/80 bg-secondary/30 p-3">
                <label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <KeyRound className="size-3.5 text-primary" />
                  Nouveau mot de passe (optionnel)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  minLength={6}
                  placeholder="Laisser vide pour ne pas modifier"
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1.5"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Remplir ce champ uniquement pour réinitialiser le mot de passe (minimum 6 caractères).
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="h-9 px-4 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                  {isSubmitting ? "Enregistrement..." : "Enregistrer les modifications"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmation de Suppression */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl border border-border">
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-foreground">Supprimer l&apos;utilisateur</h3>
                <p className="text-xs text-muted-foreground">Confirmation requise</p>
              </div>
            </div>

            {deleteError && (
              <div className="mt-4 rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive border border-destructive/20">
                {deleteError}
              </div>
            )}

            <div className="mt-4 space-y-2 text-xs text-foreground">
              <p>
                Êtes-vous sûr de vouloir supprimer définitivement le compte de{" "}
                <span className="font-extrabold text-foreground">{deletingUser.fullName}</span> (
                <span className="font-mono text-muted-foreground">{deletingUser.email}</span>) ?
              </p>
              <p className="text-[11px] text-muted-foreground bg-secondary/50 p-2.5 rounded-xl border border-border/60">
                <strong>Remarque importante :</strong> Si cet utilisateur est l&apos;auteur de documents enregistrés (devis, commandes, factures), la suppression sera empêchée afin de préserver l&apos;intégrité comptable. Vous pouvez dans ce cas simplement désactiver son compte.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="h-9 px-4 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteConfirm}
                className="h-9 px-4 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                {isSubmitting ? "Suppression..." : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}