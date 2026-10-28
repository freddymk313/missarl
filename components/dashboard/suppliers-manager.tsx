"use client";

import { useState } from "react";
import { Plus, Search, Truck, Phone, Mail, MapPin, X } from "lucide-react";
import { SupplierRecord } from "@/lib/db/suppliers";
import { createSupplierAction } from "@/actions/suppliers";

interface SuppliersManagerProps {
  initialSuppliers: SupplierRecord[];
}

export function SuppliersManager({ initialSuppliers }: SuppliersManagerProps) {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>(initialSuppliers);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.country && s.country.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
            placeholder="Rechercher par nom, code fournisseur ou pays..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-field pl-10 text-xs"
          />
        </div>

        <button onClick={() => setIsModalOpen(true)} className="button button-primary text-xs shrink-0">
          <Plus className="size-4" /> Nouveau Fournisseur
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredSuppliers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-white">
            <Truck className="mx-auto size-10 text-slate-300 mb-2" />
            Aucun fournisseur répertorié.
          </div>
        ) : (
          filteredSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="card-lift p-6 bg-white border border-border rounded-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-md bg-accent/20 px-2 py-0.5 font-mono text-[11px] font-black text-slate-900">
                  {supplier.code}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                  {supplier.country || "International"}
                </span>
              </div>

              <h3 className="mt-3 text-base font-extrabold text-primary">{supplier.name}</h3>

              {supplier.contactPerson && (
                <p className="mt-1 text-xs font-semibold text-slate-700">
                  Interlocuteur: {supplier.contactPerson}
                </p>
              )}

              {supplier.notes && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2 italic">
                  &ldquo;{supplier.notes}&rdquo;
                </p>
              )}

              <div className="mt-4 space-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
                {supplier.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="size-3.5 text-accent shrink-0" />
                    <span>{supplier.phone}</span>
                  </p>
                )}
                {supplier.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="size-3.5 text-accent shrink-0" />
                    <span className="truncate">{supplier.email}</span>
                  </p>
                )}
                {supplier.address && (
                  <p className="flex items-start gap-2">
                    <MapPin className="size-3.5 text-accent shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{supplier.address}</span>
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Create */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-extrabold text-primary">Nouveau Fournisseur</h3>
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
                  <label className="block text-xs font-bold text-slate-700">Code *</label>
                  <input
                    name="code"
                    required
                    placeholder="FOURN-ATL"
                    className="form-field mt-1 text-xs font-mono uppercase"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700">Raison Sociale *</label>
                  <input
                    name="name"
                    required
                    placeholder="Atlas Mining Supplies..."
                    className="form-field mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Pays d&apos;origine</label>
                  <input
                    name="country"
                    placeholder="RDC, Afrique du Sud, Belgique..."
                    className="form-field mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Contact / Représentant</label>
                  <input
                    name="contactPerson"
                    placeholder="Directeur commercial..."
                    className="form-field mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Téléphone</label>
                  <input
                    name="phone"
                    placeholder="+27 ... ou +243 ..."
                    className="form-field mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Email commercial</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="sales@fournisseur.com"
                    className="form-field mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Adresse / Siège</label>
                <input
                  name="address"
                  placeholder="Ville, Province, Pays..."
                  className="form-field mt-1 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Spécialité / Notes techniques</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Pièces d'usure, robinetterie industrielle, câblage..."
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
                  {isSubmitting ? "Enregistrement..." : "Créer le fournisseur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
