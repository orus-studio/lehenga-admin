"use client";

import type { ReactNode } from "react";

type CatalogCardProps = {
  title: string;
  subtitle: string;
  meta: string;
  imageUrl?: string;
  onView?: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  extraActions?: ReactNode;
};

export function CatalogCard({ title, subtitle, meta, imageUrl, onView, onEdit, onDelete, extraActions }: CatalogCardProps) {
  return (
    <article className="admin-catalog-card">
      <div className="admin-catalog-card-media">
        {imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={title} loading="lazy" decoding="async" />
          </>
        ) : (
          <span>{title.slice(0, 1)}</span>
        )}
      </div>
      <div className="admin-catalog-card-copy">
        <strong>{title}</strong>
        <p>{subtitle}</p>
        <span>{meta}</span>
      </div>
      <div className="admin-catalog-card-actions">
        {extraActions}
        {onView ? (
          <button type="button" className="admin-secondary-button" onClick={onView}>
            View
          </button>
        ) : null}
        {onEdit ? (
          <button type="button" className="admin-secondary-button" onClick={onEdit}>
            Edit
          </button>
        ) : null}
        <button type="button" className="admin-danger-button" onClick={onDelete}>
          Delete
        </button>
      </div>
    </article>
  );
}
