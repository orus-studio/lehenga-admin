"use client";

import { FormEvent, useEffect, useState } from "react";

import { adminRequest } from "../_lib/admin-api";

type Category = {
  id: string;
  name: string;
  slug: string;
  style: string;
  description?: string | null;
  isFeatured: boolean;
};

const categoryStyles = [
  { value: "BRIDAL", label: "Bridal" },
  { value: "SEMI_BRIDAL", label: "Semi Bridal" },
  { value: "GOWN", label: "Gown" },
  { value: "JEWELLERY", label: "Jewellery" },
] as const;

export function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    style: "BRIDAL",
    description: "",
    isFeatured: false,
  });

  async function loadCategories() {
    try {
      setError(null);
      const data = await adminRequest<Category[]>("/admin/categories", { withAuth: true });
      setCategories(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      if (!cancelled) {
        await loadCategories();
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
      await adminRequest<Category>("/admin/categories", {
        method: "POST",
        withAuth: true,
        body: {
          style: form.style,
          description: form.description || undefined,
          isFeatured: form.isFeatured,
        },
      });

      setForm({
        style: "BRIDAL",
        description: "",
        isFeatured: false,
      });
      await loadCategories();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await adminRequest(`/admin/categories/${id}`, {
        method: "DELETE",
        withAuth: true,
      });
      await loadCategories();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete failed");
    }
  }

  async function toggleFeatured(category: Category) {
    setSubmitting(true);
    setError(null);

    try {
      await adminRequest(`/admin/categories/${category.id}`, {
        method: "PATCH",
        withAuth: true,
        body: {
          isFeatured: !category.isFeatured,
        },
      });
      await loadCategories();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update category");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-grid-two admin-grid-form">
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <h3>Create category</h3>
        </div>
        <form className="admin-form-grid" onSubmit={handleSubmit}>
          <label className="admin-field">
            <span>Category style</span>
            <select
              value={form.style}
              onChange={(event) => setForm((current) => ({ ...current, style: event.target.value }))}
            >
              {categoryStyles.map((style) => (
                <option key={style.value} value={style.value}>
                  {style.label}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-field admin-field-full">
            <span>Description</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Describe what belongs in this category."
              rows={4}
            />
          </label>

          <label className="admin-check">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(event) => setForm((current) => ({ ...current, isFeatured: event.target.checked }))}
            />
            <span>Show this category on the storefront</span>
          </label>

          {error ? <p className="admin-error-banner admin-field-full">{error}</p> : null}

          <button className="admin-primary-button admin-field-full" type="submit" disabled={submitting}>
            {submitting ? "Saving category..." : "Add category"}
          </button>
        </form>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <h3>Current categories</h3>
        </div>
        {loading ? <p className="admin-empty-state">Loading categories...</p> : null}
        <div className="admin-card-list">
          {categories.map((category) => (
            <article key={category.id} className="admin-catalog-card">
              <div className="admin-catalog-card-copy">
                <strong>{category.name}</strong>
                <p>{category.description || "No description added yet."}</p>
                <span>{category.slug}</span>
              </div>
              <div className="admin-catalog-card-actions">
                <button
                  type="button"
                  className={category.isFeatured ? "admin-primary-button" : "admin-secondary-button"}
                  onClick={() => toggleFeatured(category)}
                  disabled={submitting}
                >
                  {category.isFeatured ? "Hide from storefront" : "Show on storefront"}
                </button>
                <button type="button" className="admin-danger-button" onClick={() => handleDelete(category.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
          {!loading && categories.length === 0 ? (
            <p className="admin-empty-state">No categories added yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
