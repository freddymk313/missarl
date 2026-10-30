"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Building2, ArrowRight, Phone, Mail, MapPin, X, ShieldCheck } from "lucide-react";
import { ClientRecord } from "@/lib/db/clients";
import { createClientAction } from "@/actions/clients";
import { RefChip } from "@/components/dashboard/ui/ref-chip";

interface ClientsManagerProps {
  initialClients: ClientRecord[];
}

export function ClientsManager({ initialClients }: ClientsManagerProps) {
  const [clients, setClients] = useState<ClientRecord[]>(initialClients);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await createClientAction(formData);
      if (!res.success) {
        setFormError(res.error || "Erreur de création");
      } else if (res.client) {
        setClients((prev) => [...prev, res.client!]);
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
      {/* Top Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          onClick={() => setIsModalOpen(true)}
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
              className="flex flex-col justify-between p-6 bg-card border border-border rounded-2xl shadow-xs hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <RefChip value={client.code} />
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-[10px] font-bold text-success border border-success/30">
                    <ShieldCheck className="size-3" /> Actif
                  </span>
                </div>

                <h3 className="mt-3 text-base font-black text-primary">{client.name}</h3>

                {client.contactPerson && (
                  <p className="mt-1 text-xs font-semibold text-foreground">
                    Contact: {client.contactPerson}
                  </p>
                )}

                <div className="mt-4 space-y-2 border-t border-border/80 pt-3 text-xs text-muted-foreground">
                  {client.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="size-3.5 text-accent shrink-0" />
                      <span>{client.phone}</span>
                    </p>
                  )}
                  {client.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="size-3.5 text-accent shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </p>
                  )}
                  {client.deliveryAddress && (
                    <p className="flex items-start gap-2">
                      <MapPin className="size-3.5 text-accent shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{client.deliveryAddress}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-border">
                <Link
                  href={`/dashboard/clients/${client.id}`}
                  className="inline-flex w-full items-center justify-center gap-2 h-9 rounded-xl bg-secondary/80 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  Ouvrir le dossier client <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-extrabold text-primary">Nouveau Client</h3>
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

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
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
                  {isSubmitting ? "Création en cours..." : "Enregistrer le client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
