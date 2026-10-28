"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Building2, ArrowRight, Phone, Mail, MapPin, X } from "lucide-react";
import { ClientRecord } from "@/lib/db/clients";
import { createClientAction } from "@/actions/clients";

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par nom de client, code ou contact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-field pl-10 text-xs"
          />
        </div>

        <button onClick={() => setIsModalOpen(true)} className="button button-primary text-xs shrink-0">
          <Plus className="size-4" /> Nouveau Client
        </button>
      </div>

      {/* Clients Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredClients.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-white">
            <Building2 className="mx-auto size-10 text-slate-300 mb-2" />
            Aucun client trouvé.
          </div>
        ) : (
          filteredClients.map((client) => (
            <div
              key={client.id}
              className="card-lift flex flex-col justify-between p-6 bg-white border border-border rounded-2xl"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-black text-primary">
                    {client.code}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    Actif
                  </span>
                </div>

                <h3 className="mt-3 text-base font-extrabold text-primary">{client.name}</h3>

                {client.contactPerson && (
                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    Contact: {client.contactPerson}
                  </p>
                )}

                <div className="mt-4 space-y-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
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
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 py-2.5 text-xs font-bold text-primary hover:bg-accent hover:text-slate-900 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-extrabold text-primary">Nouveau Client</h3>
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

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Code Client *</label>
                  <input
                    name="code"
                    required
                    placeholder="CLI-KCC"
                    className="form-field mt-1 text-xs font-mono uppercase"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700">Raison sociale / Nom *</label>
                  <input
                    name="name"
                    required
                    placeholder="Kamoto Copper Company..."
                    className="form-field mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Personne de contact</label>
                  <input
                    name="contactPerson"
                    placeholder="Directeur des achats..."
                    className="form-field mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Identifiant fiscal (NIF)</label>
                  <input
                    name="taxId"
                    placeholder="A09123456Z"
                    className="form-field mt-1 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Téléphone</label>
                  <input
                    name="phone"
                    placeholder="+243 ..."
                    className="form-field mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Adresse email</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="achats@client.com"
                    className="form-field mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Adresse de facturation</label>
                <input
                  name="billingAddress"
                  placeholder="Commune, Ville, Province..."
                  className="form-field mt-1 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Site de livraison (Mine / Dépôt)</label>
                <input
                  name="deliveryAddress"
                  placeholder="Site minier, Magasin central, Kolwezi..."
                  className="form-field mt-1 text-xs"
                />
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
