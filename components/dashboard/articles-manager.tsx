"use client";

import { useState } from "react";
import { Plus, Search, Edit, Package, X, DollarSign } from "lucide-react";
import { ItemRecord } from "@/lib/db/items";
import { SupplierRecord } from "@/lib/db/suppliers";
import { UserRole } from "@/lib/permissions";
import { createItemAction, updateItemAction } from "@/actions/items";

interface ArticlesManagerProps {
  initialItems: ItemRecord[];
  suppliers: SupplierRecord[];
  role: UserRole;
}

export function ArticlesManager({ initialItems, suppliers, role }: ArticlesManagerProps) {
  const [items, setItems] = useState<ItemRecord[]>(initialItems);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const canManage = role === "SUPER_ADMIN";

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      searchTerm.trim() === "" ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.skuRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.supplierName && item.supplierName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedCategory === "ALL" || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(
    new Set(items.map((i) => i.category).filter(Boolean) as string[])
  );

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ItemRecord) => {
    setEditingItem(item);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      if (editingItem) {
        const res = await updateItemAction(editingItem.id, {
          skuRef: formData.get("skuRef")?.toString(),
          description: formData.get("description")?.toString(),
          category: formData.get("category")?.toString(),
          unit: formData.get("unit")?.toString(),
          brand: formData.get("brand")?.toString(),
          supplierId: formData.get("supplierId")?.toString() || undefined,
          purchasePrice: parseFloat(formData.get("purchasePrice")?.toString() || "0"),
          sellingPrice: parseFloat(formData.get("sellingPrice")?.toString() || "0"),
          stockQuantity: parseFloat(formData.get("stockQuantity")?.toString() || "0"),
          minStockLevel: parseFloat(formData.get("minStockLevel")?.toString() || "0"),
        });

        if (!res.success) {
          setFormError(res.error || "Erreur de mise à jour");
        } else if (res.item) {
          setItems((prev) => prev.map((i) => (i.id === editingItem.id ? res.item! : i)));
          setIsModalOpen(false);
        }
      } else {
        const res = await createItemAction(formData);
        if (!res.success) {
          setFormError(res.error || "Erreur de création");
        } else if (res.item) {
          setItems((prev) => [res.item!, ...prev]);
          setIsModalOpen(false);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inattendue";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par désignation, réf. SKU, marque, fournisseur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-field pl-10 text-xs"
            />
          </div>

          <div className="relative shrink-0">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="form-field text-xs font-semibold pr-8 bg-white"
            >
              <option value="ALL">Toutes catégories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {canManage && (
          <button onClick={handleOpenCreate} className="button button-primary text-xs shrink-0">
            <Plus className="size-4" /> Nouvel Article
          </button>
        )}
      </div>

      {/* Role notice if price collector */}
      {!canManage && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-700 border border-slate-200">
          <DollarSign className="size-4 text-accent shrink-0" />
          <span>
            Mode Consultation : vous visualisez les caractéristiques et les tarifs en vigueur. La modification des prix est réservée au Super Administrateur.
          </span>
        </div>
      )}

      {/* Items Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-slate-50 font-black text-slate-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Réf. SKU</th>
                <th className="py-3.5 px-4">Désignation</th>
                <th className="py-3.5 px-4">Catégorie</th>
                <th className="py-3.5 px-4">Unité</th>
                <th className="py-3.5 px-4">Marque</th>
                {canManage && <th className="py-3.5 px-4 text-right">Prix d&apos;achat</th>}
                <th className="py-3.5 px-4 text-right">Prix de vente</th>
                <th className="py-3.5 px-4 text-center">Stock</th>
                {canManage && <th className="py-3.5 px-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 9 : 7} className="py-12 text-center text-muted-foreground">
                    <Package className="mx-auto size-8 text-slate-300 mb-2" />
                    Aucun article trouvé pour ces critères de recherche.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-primary">{item.skuRef}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-sm">
                      {item.description}
                      {item.supplierName && (
                        <p className="text-[10px] text-muted-foreground">Fourn: {item.supplierName}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {item.category || "Général"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-600">{item.unit}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{item.brand || "—"}</td>
                    {canManage && (
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                        ${item.purchasePrice.toFixed(2)}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-primary text-sm">
                      ${item.sellingPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${
                          item.stockQuantity <= item.minStockLevel
                            ? "bg-rose-100 text-rose-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {item.stockQuantity}
                      </span>
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <Edit className="size-3" /> Modifier
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-extrabold text-primary">
                {editingItem ? "Modifier l'article" : "Ajouter un nouvel article"}
              </h3>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Réf. SKU *</label>
                  <input
                    name="skuRef"
                    required
                    defaultValue={editingItem?.skuRef || ""}
                    placeholder="ex: ROB-VAN-DN100"
                    className="form-field mt-1 text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Unité *</label>
                  <input
                    name="unit"
                    required
                    defaultValue={editingItem?.unit || "Pce"}
                    placeholder="Pce, Mètre, Lot, Kg..."
                    className="form-field mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Désignation complète *</label>
                <textarea
                  name="description"
                  required
                  rows={2}
                  defaultValue={editingItem?.description || ""}
                  placeholder="Spécification technique détaillée de l'équipement..."
                  className="form-field mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Catégorie</label>
                  <input
                    name="category"
                    defaultValue={editingItem?.category || ""}
                    placeholder="Plomberie, Mines, Électro..."
                    className="form-field mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Marque / Fabricant</label>
                  <input
                    name="brand"
                    defaultValue={editingItem?.brand || ""}
                    placeholder="Schneider, KSB, Warman..."
                    className="form-field mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Fournisseur attitré</label>
                <select
                  name="supplierId"
                  defaultValue={editingItem?.supplierId || ""}
                  className="form-field mt-1 text-xs"
                >
                  <option value="">Sélectionner un fournisseur (optionnel)</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Prix d&apos;achat ($)</label>
                  <input
                    name="purchasePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editingItem?.purchasePrice ?? 0}
                    className="form-field mt-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Prix de vente catalogue ($) *</label>
                  <input
                    name="sellingPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    defaultValue={editingItem?.sellingPrice ?? 0}
                    className="form-field mt-1 text-xs font-mono font-bold text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Quantité en stock</label>
                  <input
                    name="stockQuantity"
                    type="number"
                    step="0.01"
                    defaultValue={editingItem?.stockQuantity ?? 0}
                    className="form-field mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Alerte stock minimum</label>
                  <input
                    name="minStockLevel"
                    type="number"
                    step="0.01"
                    defaultValue={editingItem?.minStockLevel ?? 0}
                    className="form-field mt-1 text-xs"
                  />
                </div>
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
                  {isSubmitting ? "Enregistrement..." : editingItem ? "Sauvegarder" : "Créer l'article"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
