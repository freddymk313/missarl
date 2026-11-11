"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Truck,
  Phone,
  Mail,
  MapPin,
  X,
  Globe,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { SupplierRecord } from "@/lib/db/suppliers";
import {
  createSupplierAction,
  updateSupplierAction,
  deleteSupplierAction,
} from "@/actions/suppliers";
import { RefChip } from "@/components/dashboard/ui/ref-chip";
import { ResponsiveModal } from "@/components/dashboard/ui/responsive-modal";

interface SuppliersManagerProps {
  initialSuppliers: SupplierRecord[];
}

export function SuppliersManager({ initialSuppliers }: SuppliersManagerProps) {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>(initialSuppliers);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierRecord | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<SupplierRecord | null>(null);

  // Status & errors
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // Edit fields
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editContactPerson, setEditContactPerson] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.country && s.country.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openEditModal = (supplier: SupplierRecord) => {
    setEditingSupplier(supplier);
    setEditCode(supplier.code);
    setEditName(supplier.name);
    setEditCountry(supplier.country || "");
    setEditContactPerson(supplier.contactPerson || "");
    setEditPhone(supplier.phone || "");
    setEditEmail(supplier.email || "");
    setEditAddress(supplier.address || "");
    setEditNotes(supplier.notes || "");
    setEditIsActive(supplier.isActive);
    setFormError("");
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await createSupplierAction(formData);
      if (!res.success) {
        setFormError(res.error || "Erreur de création");
      } else if (res.supplier) {
        setSuppliers((prev) => [...prev, res.supplier!]);
        setIsCreateModalOpen(false);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSupplier) return;
    setFormError("");
    setIsSubmitting(true);

    try {
      const res = await updateSupplierAction(editingSupplier.id, {
        code: editCode.trim().toUpperCase(),
        name: editName.trim(),
        country: editCountry.trim() || null,
        contactPerson: editContactPerson.trim() || null,
        phone: editPhone.trim() || null,
        email: editEmail.trim() || null,
        address: editAddress.trim() || null,
        notes: editNotes.trim() || null,
        isActive: editIsActive,
      });

      if (!res.success) {
        setFormError(res.error || "Erreur de mise à jour");
      } else if (res.supplier) {
        setSuppliers((prev) =>
          prev.map((s) => (s.id === editingSupplier.id ? res.supplier! : s))
        );
        setEditingSupplier(null);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSupplier) return;
    setDeleteError("");
    setIsSubmitting(true);

    try {
      const res = await deleteSupplierAction(deletingSupplier.id);
      if (!res.success) {
        setDeleteError(res.error || "Impossible de supprimer ce fournisseur.");
      } else {
        setSuppliers((prev) => prev.filter((s) => s.id !== deletingSupplier.id));
        setDeletingSupplier(null);
      }
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-4 rounded-2xl border border-border shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par nom, code fournisseur, pays ou interlocuteur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full rounded-xl border border-border bg-card pl-10 pr-12 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            ⌘F
          </span>
        </div>

        <button
          onClick={() => {
            setFormError("");
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs shrink-0 cursor-pointer"
        >
          <Plus className="size-4" /> Nouveau Fournisseur
        </button>
      </div>

      {/* Grid of Supplier Cards */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredSuppliers.length === 0 ? (
          <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-card">
            <Truck className="mx-auto size-10 text-muted-foreground/40 mb-2" />
            <p className="font-bold text-foreground">Aucun fournisseur répertorié</p>
            <p className="text-xs text-muted-foreground mt-1">
              Modifiez votre recherche ou ajoutez un partenaire commercial.
            </p>
          </div>
        ) : (
          filteredSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="flex flex-col justify-between p-5 bg-card border border-border rounded-2xl shadow-xs hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <RefChip value={supplier.code} />
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-secondary border border-border px-2 py-0.5 text-[10px] font-bold text-foreground">
                      <Globe className="size-3 text-muted-foreground" />
                      {supplier.country || "International"}
                    </span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        supplier.isActive
                          ? "bg-success/15 text-success border border-success/30"
                          : "bg-destructive/15 text-destructive border border-destructive/30"
                      }`}
                    >
                      {supplier.isActive ? "Actif" : "Inactif"}
                    </span>
                  </div>
                </div>

                <h3 className="mt-3 text-base font-black text-primary leading-tight">
                  {supplier.name}
                </h3>

                {supplier.contactPerson && (
                  <p className="mt-1 text-xs font-semibold text-foreground">
                    Interlocuteur : {supplier.contactPerson}
                  </p>
                )}

                {supplier.notes && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2 italic">
                    &ldquo;{supplier.notes}&rdquo;
                  </p>
                )}

                <div className="mt-4 space-y-1.5 border-t border-border/80 pt-3 text-xs text-muted-foreground">
                  {supplier.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="size-3.5 text-primary shrink-0" />
                      <span>{supplier.phone}</span>
                    </p>
                  )}
                  {supplier.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="size-3.5 text-primary shrink-0" />
                      <span className="truncate">{supplier.email}</span>
                    </p>
                  )}
                  {supplier.address && (
                    <p className="flex items-start gap-2">
                      <MapPin className="size-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{supplier.address}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-5 pt-3 border-t border-border/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(supplier)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  <Pencil className="size-3.5" />
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError("");
                    setDeletingSupplier(supplier);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition-colors cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Création Fournisseur */}
      <ResponsiveModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Nouveau Fournisseur"
        maxWidthClass="max-w-lg"
      >
        {formError && (
          <div className="mb-4 rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive border border-destructive/20">
            {formError}
          </div>
        )}
        <form onSubmit={handleCreateSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground">Code *</label>
              <input
                name="code"
                required
                placeholder="FOURN-ATL"
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono uppercase text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-foreground">Raison Sociale *</label>
              <input
                name="name"
                required
                placeholder="Atlas Mining Supplies..."
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground">Pays d&apos;origine</label>
              <input name="country" placeholder="RDC, Afrique du Sud..." className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1" />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground">Contact / Représentant</label>
              <input name="contactPerson" placeholder="Directeur commercial..." className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground">Téléphone</label>
              <input name="phone" placeholder="+27 ... ou +243 ..." className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1" />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground">Email commercial</label>
              <input name="email" type="email" placeholder="sales@fournisseur.com" className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground">Adresse / Siège</label>
            <input name="address" placeholder="Ville, Province, Pays..." className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1" />
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground">Spécialité / Notes techniques</label>
            <textarea name="notes" rows={2} placeholder="Pièces d'usure, robinetterie industrielle..." className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1 resize-none" />
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-border">
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="h-10 px-5 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-colors">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              {isSubmitting ? "Enregistrement..." : "Créer le fournisseur"}
            </button>
          </div>
        </form>
      </ResponsiveModal>

      {/* Modal Modification Fournisseur */}
      <ResponsiveModal
        open={!!editingSupplier}
        onClose={() => setEditingSupplier(null)}
        title="Modifier le Fournisseur"
        titleIcon={<Pencil className="size-4 text-primary" />}
        maxWidthClass="max-w-lg"
      >
        {formError && (
          <div className="mb-4 rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive border border-destructive/20">
            {formError}
          </div>
        )}
        <form onSubmit={handleEditSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground">Code *</label>
              <input value={editCode} onChange={(e) => setEditCode(e.target.value)} required placeholder="FOURN-ATL" className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono uppercase text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-foreground">Raison Sociale *</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} required placeholder="Atlas Mining Supplies..." className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground">Pays d&apos;origine</label>
              <input value={editCountry} onChange={(e) => setEditCountry(e.target.value)} placeholder="RDC, Afrique du Sud..." className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1" />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground">Contact / Représentant</label>
              <input value={editContactPerson} onChange={(e) => setEditContactPerson(e.target.value)} placeholder="Directeur commercial..." className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground">Téléphone</label>
              <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+27 ... ou +243 ..." className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1" />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground">Email commercial</label>
              <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} type="email" placeholder="sales@fournisseur.com" className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground">Adresse / Siège</label>
            <input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="Ville, Province, Pays..." className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1" />
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground">Spécialité / Notes techniques</label>
            <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} placeholder="Pièces d'usure, robinetterie industrielle..." className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground">Statut du partenaire *</label>
            <select value={editIsActive ? "true" : "false"} onChange={(e) => setEditIsActive(e.target.value === "true")} className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1">
              <option value="true">Actif (Partenaire régulier)</option>
              <option value="false">Inactif (Partenaire suspendu / archivé)</option>
            </select>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-border">
            <button type="button" onClick={() => setEditingSupplier(null)} className="h-10 px-5 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-colors">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              {isSubmitting ? "Enregistrement..." : "Enregistrer les modifications"}
            </button>
          </div>
        </form>
      </ResponsiveModal>

      {/* Modal Confirmation de Suppression */}
      <ResponsiveModal
        open={!!deletingSupplier}
        onClose={() => setDeletingSupplier(null)}
        title="Supprimer le fournisseur"
        titleIcon={<AlertTriangle className="size-4 text-destructive" />}
        variant="danger"
        maxWidthClass="max-w-md"
      >
        {deleteError && (
          <div className="mb-4 rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive border border-destructive/20">
            {deleteError}
          </div>
        )}
        <div className="space-y-3 text-xs text-foreground">
          <p>
            Êtes-vous certain de vouloir supprimer définitivement le fournisseur{" "}
            <span className="font-extrabold">{deletingSupplier?.name}</span> (
            <span className="font-mono text-muted-foreground">{deletingSupplier?.code}</span>) ?
          </p>
          <p className="text-[11px] text-muted-foreground bg-secondary/50 p-2.5 rounded-xl border border-border/60">
            <strong>Information catalogue :</strong> Les articles actuellement rattachés à ce fournisseur seront conservés dans votre catalogue, mais leur attribution fournisseur sera réinitialisée.
          </p>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 mt-3 border-t border-border">
          <button type="button" onClick={() => setDeletingSupplier(null)} className="h-10 px-5 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-colors">Annuler</button>
          <button type="button" disabled={isSubmitting} onClick={handleDeleteConfirm} className="h-10 px-5 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/90 transition-colors shadow-xs disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
            {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
            {isSubmitting ? "Suppression..." : "Supprimer définitivement"}
          </button>
        </div>
      </ResponsiveModal>
    </div>
  );
}
