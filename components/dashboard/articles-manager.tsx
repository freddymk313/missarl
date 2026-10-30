"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Edit,
  Package,
  X,
  LayoutGrid,
  List,
  Eye,
  AlertCircle,
  Truck,
  Tag,
  Boxes,
} from "lucide-react";
import { ItemRecord } from "@/lib/db/items";
import { SupplierRecord } from "@/lib/db/suppliers";
import { UserRole } from "@/lib/permissions";
import { createItemAction, updateItemAction } from "@/actions/items";
import { RefChip } from "@/components/dashboard/ui/ref-chip";
import { MoneyText } from "@/components/dashboard/ui/money-text";
import { DetailSheet } from "@/components/dashboard/ui/detail-sheet";
import { ProgressRing } from "@/components/dashboard/ui/progress-ring";
import { KeyValueTile } from "@/components/dashboard/ui/key-value-tile";

interface ArticlesManagerProps {
  initialItems: ItemRecord[];
  suppliers: SupplierRecord[];
  role: UserRole;
}

export function ArticlesManager({ initialItems, suppliers, role }: ArticlesManagerProps) {
  const [items, setItems] = useState<ItemRecord[]>(initialItems);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemRecord | null>(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState<ItemRecord | null>(null);
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

  const lowStockCount = items.filter((i) => i.stockQuantity <= i.minStockLevel).length;

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
          if (selectedDetailItem?.id === editingItem.id) {
            setSelectedDetailItem(res.item);
          }
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
      {/* Quick Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            Total Articles
          </p>
          <p className="text-xl font-black text-primary mt-1">{items.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            Catégories
          </p>
          <p className="text-xl font-black text-primary mt-1">{categories.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            Fournisseurs Référencés
          </p>
          <p className="text-xl font-black text-primary mt-1">{suppliers.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            Alerte Stock Bas
          </p>
          <p className={`text-xl font-black mt-1 ${lowStockCount > 0 ? "text-warning" : "text-success"}`}>
            {lowStockCount}
          </p>
        </div>
      </div>

      {/* Role notice for PRICE_COLLECTOR */}
      {!canManage && (
        <div className="flex items-center gap-2.5 rounded-xl bg-secondary/80 p-3.5 text-xs text-foreground border border-border">
          <AlertCircle className="size-4 text-accent shrink-0" />
          <span>
            Mode Consultation Catalogue : vous visualisez l&apos;ensemble des caractéristiques et tarifs publics en vigueur.
          </span>
        </div>
      )}

      {/* Top Filter and Actions Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par désignation, réf. SKU, marque, fournisseur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full rounded-xl border border-border bg-card pl-10 pr-12 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              ⌘F
            </span>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 shrink-0"
          >
            <option value="ALL">Toutes catégories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Switcher */}
          <div className="flex items-center rounded-xl border border-border bg-card p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Vue Tableau"
            >
              <List className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Vue Fiches Cartes"
            >
              <LayoutGrid className="size-4" />
            </button>
          </div>

          {canManage && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <Plus className="size-4" /> Nouvel Article
            </button>
          )}
        </div>
      </div>

      {/* VIEW: Table View */}
      {viewMode === "table" && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-secondary/40 font-black text-muted-foreground uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Réf. SKU</th>
                  <th className="py-3.5 px-4">Désignation</th>
                  <th className="py-3.5 px-4">Catégorie</th>
                  <th className="py-3.5 px-4">Unité</th>
                  <th className="py-3.5 px-4">Marque</th>
                  {canManage && <th className="py-3.5 px-4 text-right">Prix d&apos;achat</th>}
                  <th className="py-3.5 px-4 text-right">Prix catalogue</th>
                  <th className="py-3.5 px-4 text-center">Stock</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 9 : 8} className="py-12 text-center text-muted-foreground">
                      <Package className="mx-auto size-8 text-muted-foreground/50 mb-2" />
                      Aucun article trouvé pour ces critères.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedDetailItem(item)}
                      className="hover:bg-secondary/30 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <RefChip value={item.skuRef} />
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground max-w-sm">
                        {item.description}
                        {item.supplierName && (
                          <p className="text-[10px] text-muted-foreground">Fourn: {item.supplierName}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold text-foreground">
                          {item.category || "Général"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-muted-foreground">{item.unit}</td>
                      <td className="py-3 px-4 font-semibold text-foreground">{item.brand || "—"}</td>
                      {canManage && (
                        <td className="py-3 px-4 text-right">
                          <MoneyText amount={item.purchasePrice} className="text-xs text-muted-foreground" />
                        </td>
                      )}
                      <td className="py-3 px-4 text-right">
                        <MoneyText amount={item.sellingPrice} className="text-xs font-black text-primary" />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.stockQuantity <= item.minStockLevel
                              ? "bg-warning/15 text-warning border border-warning/30"
                              : "bg-success/15 text-success border border-success/30"
                          }`}
                        >
                          {item.stockQuantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailItem(item)}
                            className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="size-3.5" />
                          </button>
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                              title="Modifier"
                            >
                              <Edit className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: Comfort Shift Packing Cards */}
      {viewMode === "cards" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground rounded-2xl border border-dashed border-border bg-card">
              <Package className="mx-auto size-8 text-muted-foreground/50 mb-2" />
              Aucun article ne correspond à votre recherche.
            </div>
          ) : (
            filteredItems.map((item) => {
              const stockRatio = item.minStockLevel > 0
                ? Math.min(100, Math.round((item.stockQuantity / (item.minStockLevel * 2)) * 100))
                : 100;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedDetailItem(item)}
                  className="rounded-2xl border border-border bg-card p-5 shadow-xs hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <RefChip value={item.skuRef} />
                      <ProgressRing
                        value={stockRatio}
                        size={36}
                        strokeWidth={3.5}
                        colorClass={item.stockQuantity <= item.minStockLevel ? "text-warning" : "text-success"}
                      />
                    </div>

                    <h3 className="mt-3 text-sm font-extrabold text-foreground line-clamp-2">
                      {item.description}
                    </h3>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold text-foreground">
                        {item.category || "Général"}
                      </span>
                      {item.brand && (
                        <span className="rounded-md bg-secondary/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {item.brand}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Prix unitaire</p>
                      <MoneyText amount={item.sellingPrice} className="font-mono font-black text-primary text-sm" />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Stock dispo</p>
                      <span className="font-mono font-bold text-foreground">
                        {item.stockQuantity} {item.unit}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* DETAIL SHEET (Slide-out side panel) */}
      <DetailSheet
        isOpen={!!selectedDetailItem}
        onClose={() => setSelectedDetailItem(null)}
        title={selectedDetailItem?.skuRef || "Détail de l'article"}
        statusBadge={
          selectedDetailItem ? (
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                selectedDetailItem.stockQuantity <= selectedDetailItem.minStockLevel
                  ? "bg-warning/15 text-warning border border-warning/30"
                  : "bg-success/15 text-success border border-success/30"
              }`}
            >
              {selectedDetailItem.stockQuantity <= selectedDetailItem.minStockLevel ? "Stock bas" : "En stock"}
            </span>
          ) : undefined
        }
      >
        {selectedDetailItem && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold text-muted-foreground">Désignation complète</p>
              <h2 className="text-base font-black text-foreground mt-1 leading-snug">
                {selectedDetailItem.description}
              </h2>
            </div>

            {/* Attribute Mini Tiles */}
            <div className="grid grid-cols-3 gap-2.5">
              <KeyValueTile label="Catégorie" value={selectedDetailItem.category || "Général"} />
              <KeyValueTile label="Unité" value={selectedDetailItem.unit} />
              <KeyValueTile label="Marque" value={selectedDetailItem.brand || "—"} />
            </div>

            {/* Financial Overview */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
              <p className="text-xs font-extrabold text-primary flex items-center gap-1.5">
                <Tag className="size-3.5 text-accent" /> Tarifs & Valorisation
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground text-[10px]">Prix Catalogue Public</p>
                  <MoneyText amount={selectedDetailItem.sellingPrice} className="text-base font-black text-primary font-mono mt-0.5" />
                </div>
                {canManage && (
                  <div>
                    <p className="text-muted-foreground text-[10px]">Prix d&apos;achat Fournisseur</p>
                    <MoneyText amount={selectedDetailItem.purchasePrice} className="text-sm font-bold text-muted-foreground font-mono mt-0.5" />
                  </div>
                )}
              </div>
            </div>

            {/* Stock Levels */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
              <p className="text-xs font-extrabold text-primary flex items-center gap-1.5">
                <Boxes className="size-3.5 text-accent" /> Gestion du Stock
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground text-[10px]">Stock Actuel</p>
                  <p className="font-mono font-bold text-foreground text-sm mt-0.5">
                    {selectedDetailItem.stockQuantity} {selectedDetailItem.unit}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px]">Seuil Minimum d&apos;Alerte</p>
                  <p className="font-mono font-bold text-foreground text-sm mt-0.5">
                    {selectedDetailItem.minStockLevel} {selectedDetailItem.unit}
                  </p>
                </div>
              </div>
            </div>

            {/* Supplier Info */}
            {selectedDetailItem.supplierName && (
              <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-1.5">
                <p className="text-xs font-extrabold text-primary flex items-center gap-1.5">
                  <Truck className="size-3.5 text-accent" /> Fournisseur Attitré
                </p>
                <p className="text-xs font-semibold text-foreground">
                  {selectedDetailItem.supplierName}
                </p>
              </div>
            )}

            {/* Edit Action (if super admin) */}
            {canManage && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenEdit(selectedDetailItem);
                    setSelectedDetailItem(null);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
                >
                  <Edit className="size-4" /> Modifier cette fiche article
                </button>
              </div>
            )}
          </div>
        )}
      </DetailSheet>

      {/* MODAL: Create / Edit Article */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-extrabold text-primary">
                {editingItem ? "Modifier l'article" : "Ajouter un nouvel article"}
              </h3>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground">Réf. SKU *</label>
                  <input
                    name="skuRef"
                    required
                    defaultValue={editingItem?.skuRef || ""}
                    placeholder="ex: ROB-VAN-DN100"
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono uppercase text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground">Unité *</label>
                  <input
                    name="unit"
                    required
                    defaultValue={editingItem?.unit || "Pce"}
                    placeholder="Pce, Mètre, Lot, Kg..."
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground">Désignation complète *</label>
                <textarea
                  name="description"
                  required
                  rows={2}
                  defaultValue={editingItem?.description || ""}
                  placeholder="Spécification technique détaillée de l'équipement..."
                  className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground">Catégorie</label>
                  <input
                    name="category"
                    defaultValue={editingItem?.category || ""}
                    placeholder="Plomberie, Robinetterie..."
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground">Marque / Fabricant</label>
                  <input
                    name="brand"
                    defaultValue={editingItem?.brand || ""}
                    placeholder="Schneider, KSB, Warman..."
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground">Fournisseur attitré</label>
                <select
                  name="supplierId"
                  defaultValue={editingItem?.supplierId || ""}
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
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
                  <label className="block text-xs font-bold text-foreground">Prix d&apos;achat ($)</label>
                  <input
                    name="purchasePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editingItem?.purchasePrice ?? 0}
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground">Prix catalogue ($) *</label>
                  <input
                    name="sellingPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    defaultValue={editingItem?.sellingPrice ?? 0}
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono font-bold text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground">Quantité en stock</label>
                  <input
                    name="stockQuantity"
                    type="number"
                    step="0.01"
                    defaultValue={editingItem?.stockQuantity ?? 0}
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground">Alerte stock minimum</label>
                  <input
                    name="minStockLevel"
                    type="number"
                    step="0.01"
                    defaultValue={editingItem?.minStockLevel ?? 0}
                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                </div>
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
