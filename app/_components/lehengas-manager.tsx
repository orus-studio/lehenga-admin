"use client";

import { FormEvent, useEffect, useState } from "react";

import { adminRequest } from "../_lib/admin-api";
import { buildImagePayload } from "../_lib/image-upload";
import { CatalogCard } from "./catalog-card";
import { MockImageDropzone, type MockUploadImage } from "./mock-image-dropzone";

type CategoryOption = {
  id: string;
  name: string;
  isFeatured: boolean;
};

type LehengaItem = {
  id: string;
  name: string;
  sku: string;
  status: string;
  shortDescription?: string | null;
  description?: string | null;
  color?: string | null;
  fabric?: string | null;
  occasion?: string | null;
  category?: { id: string; name: string; slug: string } | null;
  rentalPricePerDay: string;
  discountPercent?: string | null;
  securityDeposit?: string | null;
  minimumRentalDays?: number | null;
  sizes: Array<{ id: string; sizeLabel: string; quantityTotal: number; quantityReserved: number }>;
  images: Array<{ id: string; imageUrl: string; altText?: string | null }>;
  isFeatured: boolean;
};

export function LehengasManager() {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [items, setItems] = useState<LehengaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<LehengaItem | null>(null);
  const [selectedImages, setSelectedImages] = useState<MockUploadImage[]>([]);
  const [editingItem, setEditingItem] = useState<LehengaItem | null>(null);
  const [editImages, setEditImages] = useState<MockUploadImage[]>([]);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    shortDescription: "",
    description: "",
    color: "",
    fabric: "",
    occasion: "",
    rentalPricePerDay: "",
    discountPercent: "0",
    securityDeposit: "",
    minimumRentalDays: "1",
    categoryId: "",
    quantityTotal: "1",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    sku: "",
    shortDescription: "",
    description: "",
    color: "",
    fabric: "",
    occasion: "",
    rentalPricePerDay: "",
    discountPercent: "0",
    securityDeposit: "",
    minimumRentalDays: "1",
    categoryId: "",
    quantityTotal: "1",
    quantityReserved: "0",
  });

  async function loadData() {
    try {
      setError(null);
      const [categoriesData, itemsData] = await Promise.all([
        adminRequest<CategoryOption[]>("/admin/categories", { withAuth: true }),
        adminRequest<LehengaItem[]>("/admin/lehengas", { withAuth: true }),
      ]);
      setCategories(categoriesData);
      setItems(itemsData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load lehengas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        const [categoriesData, itemsData] = await Promise.all([
          adminRequest<CategoryOption[]>("/admin/categories", { withAuth: true }),
          adminRequest<LehengaItem[]>("/admin/lehengas", { withAuth: true }),
        ]);

        if (cancelled) {
          return;
        }

        setError(null);
        setCategories(categoriesData);
        setItems(itemsData);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load lehengas");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const images = await buildImagePayload(selectedImages);

      await adminRequest("/admin/lehengas", {
        method: "POST",
        withAuth: true,
        body: {
          name: form.name,
          sku: form.sku,
          shortDescription: form.shortDescription || undefined,
          description: form.description || undefined,
          color: form.color || undefined,
          fabric: form.fabric || undefined,
          occasion: form.occasion || undefined,
          rentalPricePerDay: Number(form.rentalPricePerDay),
          discountPercent: Number(form.discountPercent || 0),
          securityDeposit: form.securityDeposit ? Number(form.securityDeposit) : undefined,
          minimumRentalDays: Number(form.minimumRentalDays),
          categoryId: form.categoryId || undefined,
          images,
          sizes: [
            {
              sizeLabel: "Free Size",
              quantityTotal: Number(form.quantityTotal || 1),
              quantityReserved: 0,
            },
          ],
        },
      });

      setForm({
        name: "",
        sku: "",
        shortDescription: "",
        description: "",
        color: "",
        fabric: "",
        occasion: "",
        rentalPricePerDay: "",
        discountPercent: "0",
        securityDeposit: "",
        minimumRentalDays: "1",
        categoryId: "",
        quantityTotal: "1",
      });
      setSelectedImages([]);
      await loadData();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await adminRequest(`/admin/lehengas/${id}`, {
        method: "DELETE",
        withAuth: true,
      });
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete failed");
    }
  }

  async function updateFeaturedCollection(item: LehengaItem, checked: boolean) {
    setSubmitting(true);
    setError(null);

    try {
      await adminRequest(`/admin/lehengas/${item.id}`, {
        method: "PATCH",
        withAuth: true,
        body: {
          isFeatured: checked,
        },
      });
      const nextItem = { ...item, isFeatured: checked };
      setPreviewItem((current) => (current?.id === item.id ? nextItem : current));
      await loadData();
    } catch (storefrontError) {
      setError(storefrontError instanceof Error ? storefrontError.message : "Failed to update storefront");
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(item: LehengaItem) {
    setEditingItem(item);
    setEditImages([]);
    setEditForm({
      name: item.name,
      sku: item.sku,
      shortDescription: item.shortDescription ?? "",
      description: item.description ?? "",
      color: item.color ?? "",
      fabric: item.fabric ?? "",
      occasion: item.occasion ?? "",
      rentalPricePerDay: item.rentalPricePerDay,
      discountPercent: item.discountPercent ?? "0",
      securityDeposit: item.securityDeposit ?? "",
      minimumRentalDays: String(item.minimumRentalDays ?? 1),
      categoryId: item.category?.id ?? "",
      quantityTotal: String(item.sizes[0]?.quantityTotal ?? 1),
      quantityReserved: String(item.sizes[0]?.quantityReserved ?? 0),
    });
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingItem) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const images = editImages.length > 0 ? await buildImagePayload(editImages) : undefined;

      await adminRequest(`/admin/lehengas/${editingItem.id}`, {
        method: "PATCH",
        withAuth: true,
        body: {
          name: editForm.name,
          sku: editForm.sku,
          shortDescription: editForm.shortDescription || undefined,
          description: editForm.description || undefined,
          color: editForm.color || undefined,
          fabric: editForm.fabric || undefined,
          occasion: editForm.occasion || undefined,
          rentalPricePerDay: Number(editForm.rentalPricePerDay),
          discountPercent: Number(editForm.discountPercent || 0),
          securityDeposit: editForm.securityDeposit ? Number(editForm.securityDeposit) : undefined,
          minimumRentalDays: Number(editForm.minimumRentalDays),
          categoryId: editForm.categoryId || undefined,
          sizes: [
            {
              sizeLabel: editingItem.sizes[0]?.sizeLabel ?? "Free Size",
              quantityTotal: Number(editForm.quantityTotal || 1),
              quantityReserved: Number(editForm.quantityReserved || 0),
            },
          ],
          ...(images ? { images } : {}),
        },
      });

      setEditingItem(null);
      setEditImages([]);
      await loadData();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Failed to update lehenga");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-grid-two admin-grid-form">
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <h3>Add lehenga</h3>
        </div>
        <form className="admin-form-grid" onSubmit={handleSubmit}>
          <label className="admin-field">
            <span>Name</span>
            <input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} required />
          </label>
          <label className="admin-field">
            <span>SKU</span>
            <input value={form.sku} onChange={(e) => setForm((c) => ({ ...c, sku: e.target.value }))} required />
          </label>
          <label className="admin-field">
            <span>Rental price per day</span>
            <input
              type="number"
              value={form.rentalPricePerDay}
              onChange={(e) => setForm((c) => ({ ...c, rentalPricePerDay: e.target.value }))}
              required
            />
          </label>
          <label className="admin-field">
            <span>Discount percent</span>
            <input
              type="number"
              min={0}
              max={100}
              value={form.discountPercent}
              onChange={(e) => setForm((c) => ({ ...c, discountPercent: e.target.value }))}
            />
          </label>
          <label className="admin-field">
            <span>Security deposit</span>
            <input
              type="number"
              min={0}
              value={form.securityDeposit}
              onChange={(e) => setForm((c) => ({ ...c, securityDeposit: e.target.value }))}
            />
          </label>
          <label className="admin-field">
            <span>Minimum rental days</span>
            <input
              type="number"
              min={1}
              value={form.minimumRentalDays}
              onChange={(e) => setForm((c) => ({ ...c, minimumRentalDays: e.target.value }))}
            />
          </label>
          <label className="admin-field">
            <span>Category</span>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((c) => ({ ...c, categoryId: e.target.value }))}
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Available quantity</span>
            <input
              type="number"
              min={1}
              value={form.quantityTotal}
              onChange={(e) => setForm((c) => ({ ...c, quantityTotal: e.target.value }))}
            />
          </label>
          <label className="admin-field admin-field-full">
            <span>Short description</span>
            <input
              value={form.shortDescription}
              onChange={(e) => setForm((c) => ({ ...c, shortDescription: e.target.value }))}
            />
          </label>
          <label className="admin-field admin-field-full">
            <span>Description</span>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
            />
          </label>
          <MockImageDropzone
            label="Product image upload"
            hint="Select lehenga images. They will be uploaded to S3 when you save."
            value={selectedImages}
            onChange={setSelectedImages}
          />

          {error ? <p className="admin-error-banner admin-field-full">{error}</p> : null}

          <button className="admin-primary-button admin-field-full" type="submit" disabled={submitting}>
            {submitting ? "Saving lehenga..." : "Add lehenga"}
          </button>
        </form>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <h3>Lehenga catalog</h3>
        </div>
        {loading ? <p className="admin-empty-state">Loading lehengas...</p> : null}
        <div className="admin-card-list">
          {items.map((item) => (
            <CatalogCard
              key={item.id}
              title={item.name}
              subtitle={`${item.status} · SKU ${item.sku}`}
              meta={`${item.images.length} image(s) · ${item.sizes[0]?.quantityTotal ?? 0} total`}
              imageUrl={item.images[0]?.imageUrl}
              onView={() => setPreviewItem(item)}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
          {!loading && items.length === 0 ? (
            <p className="admin-empty-state">No lehengas added yet.</p>
          ) : null}
        </div>
      </section>

      {previewItem ? (
        <div className="admin-preview-overlay" role="dialog" aria-modal="true" aria-labelledby="lehenga-preview-title">
          <div className="admin-preview-modal">
            <div className="admin-panel-heading">
              <div>
                <span className="admin-eyebrow">Catalog preview</span>
                <h3 id="lehenga-preview-title">{previewItem.name}</h3>
              </div>
              <button type="button" className="admin-ghost-button" onClick={() => setPreviewItem(null)}>
                Close
              </button>
            </div>

            <div className="admin-preview-grid">
              <div className="admin-preview-gallery">
                {previewItem.images.map((image, index) => (
                  <article key={image.id} className="admin-preview-gallery-item">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.imageUrl} alt={image.altText || `${previewItem.name} preview ${index + 1}`} />
                  </article>
                ))}
              </div>

              <div className="admin-preview-copy">
                <div className="admin-storefront-controls">
                  <label className="admin-check">
                    <input
                      type="checkbox"
                      checked={previewItem.isFeatured}
                      disabled={submitting}
                      onChange={(event) => updateFeaturedCollection(previewItem, event.target.checked)}
                    />
                    <span>Add this lehenga to Featured Collection</span>
                  </label>
                  <p>
                    Storefront category sections automatically show the latest four products assigned to each
                    category enabled on the Categories page.
                  </p>
                </div>

                <div className="admin-preview-meta">
                  <strong>SKU</strong>
                  <span>{previewItem.sku}</span>
                </div>
                <div className="admin-preview-meta">
                  <strong>Status</strong>
                  <span>{previewItem.status}</span>
                </div>
                <div className="admin-preview-meta">
                  <strong>Category</strong>
                  <span>{previewItem.category?.name ?? "No category"}</span>
                </div>
                <div className="admin-preview-meta">
                  <strong>Rental price</strong>
                  <span>Rs {previewItem.rentalPricePerDay}</span>
                </div>
                <div className="admin-preview-meta">
                  <strong>Discount</strong>
                  <span>{Number(previewItem.discountPercent ?? 0)}%</span>
                </div>
                <div className="admin-preview-meta">
                  <strong>Security deposit</strong>
                  <span>{previewItem.securityDeposit ? `Rs ${previewItem.securityDeposit}` : "Not set"}</span>
                </div>
                <div className="admin-preview-meta">
                  <strong>Minimum rental</strong>
                  <span>{previewItem.minimumRentalDays ? `${previewItem.minimumRentalDays} day(s)` : "1 day"}</span>
                </div>
                <div className="admin-preview-meta">
                  <strong>Description</strong>
                  <span>{previewItem.shortDescription || previewItem.description || "No description added."}</span>
                </div>
                <div className="admin-preview-meta">
                  <strong>Size setup</strong>
                  <span>{previewItem.sizes[0]?.sizeLabel ?? "Free Size"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {editingItem ? (
        <div className="admin-preview-overlay" role="dialog" aria-modal="true" aria-labelledby="edit-lehenga-title">
          <div className="admin-preview-modal">
            <div className="admin-panel-heading">
              <div>
                <span className="admin-eyebrow">Edit lehenga</span>
                <h3 id="edit-lehenga-title">{editingItem.name}</h3>
              </div>
              <button type="button" className="admin-ghost-button" onClick={() => setEditingItem(null)}>
                Close
              </button>
            </div>
            <form className="admin-form-grid" onSubmit={handleEditSubmit}>
              <label className="admin-field">
                <span>Name</span>
                <input value={editForm.name} onChange={(e) => setEditForm((c) => ({ ...c, name: e.target.value }))} required />
              </label>
              <label className="admin-field">
                <span>SKU</span>
                <input value={editForm.sku} onChange={(e) => setEditForm((c) => ({ ...c, sku: e.target.value }))} required />
              </label>
              <label className="admin-field">
                <span>Rental price per day</span>
                <input type="number" value={editForm.rentalPricePerDay} onChange={(e) => setEditForm((c) => ({ ...c, rentalPricePerDay: e.target.value }))} required />
              </label>
              <label className="admin-field">
                <span>Discount percent</span>
                <input type="number" min={0} max={100} value={editForm.discountPercent} onChange={(e) => setEditForm((c) => ({ ...c, discountPercent: e.target.value }))} />
              </label>
              <label className="admin-field">
                <span>Security deposit</span>
                <input type="number" min={0} value={editForm.securityDeposit} onChange={(e) => setEditForm((c) => ({ ...c, securityDeposit: e.target.value }))} />
              </label>
              <label className="admin-field">
                <span>Minimum rental days</span>
                <input type="number" min={1} value={editForm.minimumRentalDays} onChange={(e) => setEditForm((c) => ({ ...c, minimumRentalDays: e.target.value }))} />
              </label>
              <label className="admin-field">
                <span>Category</span>
                <select value={editForm.categoryId} onChange={(e) => setEditForm((c) => ({ ...c, categoryId: e.target.value }))}>
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>Total quantity</span>
                <input type="number" min={1} value={editForm.quantityTotal} onChange={(e) => setEditForm((c) => ({ ...c, quantityTotal: e.target.value }))} />
              </label>
              <label className="admin-field">
                <span>Reserved quantity</span>
                <input type="number" min={0} value={editForm.quantityReserved} onChange={(e) => setEditForm((c) => ({ ...c, quantityReserved: e.target.value }))} />
              </label>
              <label className="admin-field admin-field-full">
                <span>Short description</span>
                <input value={editForm.shortDescription} onChange={(e) => setEditForm((c) => ({ ...c, shortDescription: e.target.value }))} />
              </label>
              <label className="admin-field admin-field-full">
                <span>Description</span>
                <textarea rows={4} value={editForm.description} onChange={(e) => setEditForm((c) => ({ ...c, description: e.target.value }))} />
              </label>
              <MockImageDropzone
                label="Replace lehenga images"
                hint="Select new images only if you want to replace the current set."
                value={editImages}
                onChange={setEditImages}
              />
              <button className="admin-primary-button admin-field-full" type="submit" disabled={submitting}>
                {submitting ? "Saving lehenga..." : "Save changes"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
