"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Building2,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  X,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { ClientRecord } from "@/lib/db/clients";
import {
  createClientAction,
  updateClientAction,
  deleteClientAction,
} from "@/actions/clients";
import { RefChip } from "@/components/dashboard/ui/ref-chip";

interface ClientsManagerProps {
  initialClients: ClientRecord[];
}

export function ClientsManager({ initialClients }: ClientsManagerProps) {
  const [clients, setClients] = useState<ClientRecord[]>(initialClients);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [deletingClient, setDeletingClient] = useState<ClientRecord | null>(null);

  // Loading & error feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // Edit fields state
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editContactPerson, setEditContactPerson] = useState("");
  const [editTaxId, setEditTaxId] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editBillingAddress, setEditBillingAddress] = useState("");
  const [editDeliveryAddress, setEditDeliveryAddress] = useState("");
  const [editPaymentTerms, setEditPaymentTerms] = useState("30_DAYS");
  const [editCurrency, setEditCurrency] = useState("USD");
  const [editIsActive, setEditIsActive] = useState(true);

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openEditModal = (client: ClientRecord) => {
    setEditingClient(client);
    setEditCode(client.code);
    setEditName(client.name);
    setEditContactPerson(client.contactPerson || "");
    setEditTaxId(client.taxId || "");
    setEditPhone(client.phone || "");
    setEditEmail(client.email || "");
    setEditBillingAddress(client.billingAddress || "");
    setEditDeliveryAddress(client.deliveryAddress || "");
    setEditPaymentTerms(client.paymentTerms || "30_DAYS");
    setEditCurrency(client.currency || "USD");
    setEditIsActive(client.isActive);
    setFormError("");
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await createClientAction(formData);
      if (!res.success) {
        setFormError(res.error || "Erreur de création du client.");
      } else if (res.client) {
        setClients((prev) => [...prev, res.client!]);
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
    if (!editingClient) return;
    setFormError("");
    setIsSubmitting(true);

    try {
      const res = await updateClientAction(editingClient.id, {
        code: editCode.trim().toUpperCase(),
        name: editName.trim(),
        contactPerson: editContactPerson.trim() || null,
        taxId: editTaxId.trim() || null,
        phone: editPhone.trim() || null,
        email: editEmail.trim() || null,
        billingAddress: editBillingAddress.trim() || null,
        deliveryAddress: editDeliveryAddress.trim() || null,
        paymentTerms: editPaymentTerms,
        currency: editCurrency,
        isActive: editIsActive,
      });

      if (!res.success) {
        setFormError(res.error || "Erreur de mise à jour du client.");
      } else if (res.client) {
        setClients((prev) =>
          prev.map((c) => (c.id === editingClient.id ? res.client! : c))
        );
        setEditingClient(null);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingClient) return;
    setDeleteError("");
    setIsSubmitting(true);

    try {
      const res = await deleteClientAction(deletingClient.id);
      if (!res.success) {
        setDeleteError(res.error || "Impossible de supprimer ce client.");
      } else {
        setClients((prev) => prev.filter((c) => c.id !== deletingClient.id));
        setDeletingClient(null);
      }
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-4 rounded-2xl border border-border shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par nom de client, code ou contact..."
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
          <Plus className="size-4" /> Nouveau Client
        </button>
      </div>

      {/* Clients Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredClients.length === 0 ? (
          <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-card">
            <Building2 className="mx-auto size-10 text-muted-foreground/40 mb-2" />
            <p className="font-bold text-foreground">Aucun client trouvé</p>
            <p className="text-xs text-muted-foreground mt-1">
              Modifiez vos critères de recherche ou ajoutez un nouveau compte client.
            </p>
          </div>
        ) : (
          filteredClients.map((client) => (
            <div
              key={client.id}
              className="flex flex-col justify-between p-5 bg-card border border-border rounded-2xl shadow-xs hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <RefChip value={client.code} />
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      client.isActive
                        ? "bg-success/15 text-success border border-success/30"
                        : "bg-destructive/15 text-destructive border border-destructive/30"
                    }`}
                  >
                    {client.isActive ? "Actif" : "Inactif"}
                  </span>
                </div>

                <h3 className="mt-3 text-base font-black text-primary leading-tight">
                  {client.name}
                </h3>

                {client.contactPerson && (
                  <p className="mt-1 text-xs font-semibold text-foreground">
                    Contact : {client.contactPerson}
                  </p>
                )}

                <div className="mt-4 space-y-1.5 border-t border-border/80 pt-3 text-xs text-muted-foreground">
                  {client.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="size-3.5 text-primary shrink-0" />
                      <span>{client.phone}</span>
                    </p>
                  )}
                  {client.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="size-3.5 text-primary shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </p>
                  )}
                  {client.deliveryAddress && (
                    <p className="flex items-start gap-2">
                      <MapPin className="size-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{client.deliveryAddress}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-row gap-2.5 mt-5 pt-3 border-t border-border/80">
  {/* Bouton Voir */}
  <Link
    href={`/dashboard/clients/${client.id}`}
    className="inline-flex w-full items-center justify-center gap-2 h-9 rounded-xl bg-secondary/80 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
  >
    Voir <ArrowRight className="size-3.5" />
  </Link>

  {/* Ligne des boutons Modifier et Supprimer à hauteurs égales */}
  {/* <div className="flex items-center gap-2"> */}
    <button
      type="button"
      onClick={() => openEditModal(client)}
      className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary hover:text-primary transition-colors cursor-pointer"
    >
      <Pencil className="size-3.5" />
      Modifier
    </button>
    <button
      type="button"
      onClick={() => {
        setDeleteError("");
        setDeletingClient(client);
      }}
      className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition-colors cursor-pointer"
    >
      <Trash2 className="size-3.5" />
      Supprimer
    </button>
  {/* </div> */}
</div>
            </div>
          ))
        )}
      </div>

      {/* Modal Création Client */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-extrabold text-primary">Nouveau Client</h3>
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

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground">Code Client *</label>
                  <input
                    name="code"
                    required
                    placeholder="CLI-KCC"
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono uppercase text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-foreground">Raison sociale / Nom *</label>
                  <input
                    name="name"
                    required
                    placeholder="Kamoto Copper Company..."
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground">Personne de contact</label>
                  <input
                    name="contactPerson"
                    placeholder="Directeur des achats..."
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground">Identifiant fiscal (NIF)</label>
                  <input
                    name="taxId"
                    placeholder="A09123456Z"
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground">Téléphone</label>
                  <input
                    name="phone"
                    placeholder="+243 ..."
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground">Adresse email</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="achats@client.com"
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground">Adresse de facturation</label>
                <input
                  name="billingAddress"
                  placeholder="Commune, Ville, Province..."
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground">Site de livraison (Mine / Dépôt)</label>
                <input
                  name="deliveryAddress"
                  placeholder="Site minier, Magasin central, Kolwezi..."
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground">Conditions de paiement</label>
                  <select
                    name="paymentTerms"
                    defaultValue="30_DAYS"
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  >
                    <option value="COMPTANT">Paiement Comptant</option>
                    <option value="30_DAYS">30 jours net</option>
                    <option value="45_DAYS">45 jours net</option>
                    <option value="60_DAYS">60 jours net</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground">Devise principale</label>
                  <select
                    name="currency"
                    defaultValue="USD"
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="CDF">CDF (FC)</option>
                  </select>
                </div>
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
                  {isSubmitting ? "Création en cours..." : "Enregistrer le client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Modification Client */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Pencil className="size-4 text-primary" />
                <h3 className="text-base font-extrabold text-foreground">Modifier le Client</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingClient(null)}
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

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground">Code Client *</label>
                  <input
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    required
                    placeholder="CLI-KCC"
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono uppercase text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-foreground">Raison sociale / Nom *</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    placeholder="Kamoto Copper Company..."
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground">Personne de contact</label>
                  <input
                    value={editContactPerson}
                    onChange={(e) => setEditContactPerson(e.target.value)}
                    placeholder="Directeur des achats..."
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground">Identifiant fiscal (NIF)</label>
                  <input
                    value={editTaxId}
                    onChange={(e) => setEditTaxId(e.target.value)}
                    placeholder="A09123456Z"
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground">Téléphone</label>
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+243 ..."
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground">Adresse email</label>
                  <input
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    type="email"
                    placeholder="achats@client.com"
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground">Adresse de facturation</label>
                <input
                  value={editBillingAddress}
                  onChange={(e) => setEditBillingAddress(e.target.value)}
                  placeholder="Commune, Ville, Province..."
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground">Site de livraison (Mine / Dépôt)</label>
                <input
                  value={editDeliveryAddress}
                  onChange={(e) => setEditDeliveryAddress(e.target.value)}
                  placeholder="Site minier, Magasin central, Kolwezi..."
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground">Conditions de paiement</label>
                  <select
                    value={editPaymentTerms}
                    onChange={(e) => setEditPaymentTerms(e.target.value)}
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  >
                    <option value="COMPTANT">Paiement Comptant</option>
                    <option value="30_DAYS">30 jours net</option>
                    <option value="45_DAYS">45 jours net</option>
                    <option value="60_DAYS">60 jours net</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground">Devise principale</label>
                  <select
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value)}
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="CDF">CDF (FC)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground">Statut du compte *</label>
                  <select
                    value={editIsActive ? "true" : "false"}
                    onChange={(e) => setEditIsActive(e.target.value === "true")}
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  >
                    <option value="true">Actif</option>
                    <option value="false">Inactif (Suspendu)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
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
      {deletingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl border border-border">
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-foreground">Supprimer le client</h3>
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
                Êtes-vous certain de vouloir supprimer définitivement le client{" "}
                <span className="font-extrabold text-foreground">{deletingClient.name}</span> (
                <span className="font-mono text-muted-foreground">{deletingClient.code}</span>) ?
              </p>
              <p className="text-[11px] text-muted-foreground bg-secondary/50 p-2.5 rounded-xl border border-border/60">
                <strong>Attention comptable :</strong> Si des devis, bons de commande, factures ou paiements sont rattachés à ce client, la suppression sera bloquée afin de préserver l&apos;intégrité de vos états financiers. Vous pourrez dans ce cas désactiver son compte.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setDeletingClient(null)}
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
