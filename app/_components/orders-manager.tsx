"use client";

import { FormEvent, useEffect, useState } from "react";

import { adminRequest } from "../_lib/admin-api";

type ItemMeasurements = {
  upper?: string | null;
  chest?: string | null;
  waist?: string | null;
  armHole?: string | null;
  mori?: string | null;
  notes?: string | null;
};

type OrderItem = {
  id: string;
  itemType: "LEHENGA" | "JEWELLERY";
  productNameSnapshot: string;
  skuSnapshot: string;
  sizeLabelSnapshot?: string | null;
  quantity: number;
  rentalStartDate: string;
  rentalEndDate: string;
  rentalDays: number;
  lineTotal: string;
  lehengaId?: string | null;
  jewelleryId?: string | null;
  measurementUpper?: string | null;
  measurementChest?: string | null;
  measurementWaist?: string | null;
  measurementArmHole?: string | null;
  measurementMori?: string | null;
  measurementNotes?: string | null;
  lehenga?: {
    images?: Array<{ id?: string; imageUrl: string; altText?: string | null }>;
  } | null;
  jewellery?: {
    images?: Array<{ id?: string; imageUrl: string; altText?: string | null }>;
  } | null;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  rentalStartDate: string;
  rentalEndDate: string;
  subtotalAmount: string;
  securityDeposit: string;
  totalAmount: string;
  amountPaid?: string;
  amountDueAtPickup?: string;
  paymentGatewayPaymentId?: string | null;
  depositRefundStatus?: string;
  depositRefundedAmount?: string;
  specialInstructions?: string | null;
  internalNotes?: string | null;
  customer: {
    firstName: string;
    phone: string;
    email?: string | null;
  };
  pickupLocation: {
    name: string;
  };
  items: OrderItem[];
};

type ProductOption = {
  id: string;
  name: string;
};

type EditItemDraft = {
  id: string;
  itemType: "LEHENGA" | "JEWELLERY";
  productId: string;
  quantity: string;
  rentalStartDate: string;
  rentalEndDate: string;
  measurements?: ItemMeasurements | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatStatusLabel(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatPaymentMethod(value?: string | null) {
  if (!value) {
    return "Pay at pickup";
  }

  return value === "ONLINE" ? "Online payment" : "Pay at pickup";
}

function formatMeasurements(item: Pick<
  OrderItem,
  | "measurementUpper"
  | "measurementChest"
  | "measurementWaist"
  | "measurementArmHole"
  | "measurementMori"
  | "measurementNotes"
>) {
  return [
    item.measurementUpper ? `Upper: ${item.measurementUpper}` : null,
    item.measurementChest ? `Chest: ${item.measurementChest}` : null,
    item.measurementWaist ? `Waist: ${item.measurementWaist}` : null,
    item.measurementArmHole ? `Arm hole: ${item.measurementArmHole}` : null,
    item.measurementMori ? `Mori: ${item.measurementMori}` : null,
    item.measurementNotes ? `Notes: ${item.measurementNotes}` : null,
  ].filter((value): value is string => Boolean(value));
}

function getOrderItemImage(item: OrderItem) {
  return item.lehenga?.images?.[0] ?? item.jewellery?.images?.[0] ?? null;
}

export function OrdersManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [lehengas, setLehengas] = useState<ProductOption[]>([]);
  const [jewellery, setJewellery] = useState<ProductOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editForm, setEditForm] = useState({
    rentalStartDate: "",
    rentalEndDate: "",
    specialInstructions: "",
    internalNotes: "",
    items: [] as EditItemDraft[],
  });
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders(dateFilters?: { from?: string; to?: string }, showFilterLoader = false) {
    if (showFilterLoader) {
      setFiltering(true);
    }

    try {
      const params = new URLSearchParams();
      if (dateFilters?.from) params.set("createdFrom", dateFilters.from);
      if (dateFilters?.to) params.set("createdTo", dateFilters.to);
      const orderPath = `/admin/orders${params.size ? `?${params.toString()}` : ""}`;
      const [ordersData, lehengasData, jewelleryData] = await Promise.all([
        adminRequest<Order[]>(orderPath, { withAuth: true }),
        adminRequest<ProductOption[]>("/admin/lehengas", { withAuth: true }),
        adminRequest<ProductOption[]>("/admin/jewellery", { withAuth: true }),
      ]);

      setOrders(ordersData);
      setLehengas(lehengasData);
      setJewellery(jewelleryData);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load orders");
    } finally {
      setLoading(false);
      setFiltering(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      if (!cancelled) {
        await loadOrders();
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  async function handleFulfilled(orderId: string) {
    setSubmitting(true);
    setError(null);

    try {
      await adminRequest(`/admin/orders/${orderId}`, {
        method: "PATCH",
        withAuth: true,
        body: {
          status: "FULFILLED",
        },
      });
      await loadOrders();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Failed to update order");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRefundDeposit(orderId: string) {
    setSubmitting(true);
    setError(null);

    try {
      await adminRequest(`/admin/orders/${orderId}/refund-deposit`, {
        method: "POST",
        withAuth: true,
      });
      await loadOrders();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Failed to refund deposit");
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(order: Order) {
    setEditingOrder(order);
    setEditForm({
      rentalStartDate: order.rentalStartDate.slice(0, 10),
      rentalEndDate: order.rentalEndDate.slice(0, 10),
      specialInstructions: order.specialInstructions ?? "",
      internalNotes: order.internalNotes ?? "",
      items: order.items.map((item) => ({
        id: item.id,
        itemType: item.itemType,
        productId: item.itemType === "LEHENGA" ? item.lehengaId ?? "" : item.jewelleryId ?? "",
        quantity: String(item.quantity),
        rentalStartDate: item.rentalStartDate.slice(0, 10),
        rentalEndDate: item.rentalEndDate.slice(0, 10),
        measurements: {
          upper: item.measurementUpper ?? undefined,
          chest: item.measurementChest ?? undefined,
          waist: item.measurementWaist ?? undefined,
          armHole: item.measurementArmHole ?? undefined,
          mori: item.measurementMori ?? undefined,
          notes: item.measurementNotes ?? undefined,
        },
      })),
    });
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingOrder) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await adminRequest(`/admin/orders/${editingOrder.id}`, {
        method: "PATCH",
        withAuth: true,
        body: {
          rentalStartDate: editForm.rentalStartDate,
          rentalEndDate: editForm.rentalEndDate,
          specialInstructions: editForm.specialInstructions || undefined,
          internalNotes: editForm.internalNotes || undefined,
          items: editForm.items.map((item) =>
            item.itemType === "LEHENGA"
              ? {
                  itemType: item.itemType,
                  lehengaId: item.productId,
                  quantity: Number(item.quantity || 1),
                  rentalStartDate: item.rentalStartDate,
                  rentalEndDate: item.rentalEndDate,
                  measurements: item.measurements ?? undefined,
                }
              : {
                  itemType: item.itemType,
                  jewelleryId: item.productId,
                  quantity: Number(item.quantity || 1),
                  rentalStartDate: item.rentalStartDate,
                  rentalEndDate: item.rentalEndDate,
                },
          ),
        },
      });

      setEditingOrder(null);
      await loadOrders();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Failed to edit order");
    } finally {
      setSubmitting(false);
    }
  }

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const visibleOrders = normalizedSearchQuery
    ? orders.filter((order) => {
        const haystack = [
          order.id,
          order.orderNumber,
          order.customer.firstName,
          order.customer.phone,
          order.customer.email ?? "",
          order.status,
          order.paymentStatus,
          ...order.items.map((item) => item.productNameSnapshot),
          ...order.items.map((item) => item.skuSnapshot),
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedSearchQuery);
      })
    : orders;

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <h3>Created orders</h3>
      </div>

      <label className="admin-field admin-order-search">
        <span>Search orders</span>
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by order ID, order number, customer, lehenga, jewellery, SKU..."
        />
      </label>

      <div className="admin-order-date-filters">
        <label className="admin-field">
          <span>Created from</span>
          <input type="date" value={createdFrom} onChange={(event) => setCreatedFrom(event.target.value)} />
        </label>
        <label className="admin-field">
          <span>Created to</span>
          <input
            type="date"
            min={createdFrom || undefined}
            value={createdTo}
            onChange={(event) => setCreatedTo(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="admin-primary-button"
          onClick={() => loadOrders({ from: createdFrom, to: createdTo }, true)}
          disabled={loading || filtering || Boolean(createdFrom && createdTo && createdTo < createdFrom)}
        >
          {filtering ? "Filtering..." : "Filter orders"}
        </button>
        <button
          type="button"
          className="admin-secondary-button"
          onClick={() => {
            setCreatedFrom("");
            setCreatedTo("");
            void loadOrders(undefined, true);
          }}
          disabled={loading || filtering}
        >
          Clear dates
        </button>
      </div>

      {filtering ? (
        <div className="admin-order-filter-loader" role="status" aria-live="polite">
          <span className="admin-spinner" aria-hidden="true" />
          <span>Loading orders for the selected dates...</span>
        </div>
      ) : null}
      {loading ? <p className="admin-empty-state">Loading orders...</p> : null}
      {error ? <p className="admin-error-banner">{error}</p> : null}

      <div className="admin-list">
        {visibleOrders.map((order) => (
          <article key={order.id} className="admin-list-item admin-order-card">
            <div className="admin-order-card-head">
              <strong>{order.orderNumber}</strong>
              <span className="admin-order-total">Rs {order.totalAmount}</span>
            </div>

            <div className="admin-order-grid">
              <p>
                {order.customer.firstName} · {order.customer.phone}
                {order.customer.email ? ` · ${order.customer.email}` : ""}
              </p>
              <p>
                Fulfillment status: {formatStatusLabel(order.status)}
              </p>
              <p>
                Payment status: {formatStatusLabel(order.paymentStatus)}
              </p>
              <p>
                Payment method: {formatPaymentMethod(order.paymentMethod)}
              </p>
              <p>
                {formatDate(order.rentalStartDate)} to {formatDate(order.rentalEndDate)}
              </p>
              <p>Pickup: {order.pickupLocation.name}</p>
              <p className="admin-order-items">
                Items:{" "}
                {order.items
                  .map(
                    (item) =>
                      `${item.productNameSnapshot} · SKU ${item.skuSnapshot}${item.sizeLabelSnapshot ? ` (${item.sizeLabelSnapshot})` : ""} x${item.quantity} · ${formatDate(item.rentalStartDate)} to ${formatDate(item.rentalEndDate)}`,
                  )
                  .join(", ")}
              </p>
              {order.items.some((item) => getOrderItemImage(item)) ? (
                <div className="admin-order-image-list">
                  {order.items.map((item) => {
                    const image = getOrderItemImage(item);

                    return image ? (
                      <figure key={item.id} className="admin-order-image-card">
                        <img src={image.imageUrl} alt={image.altText || item.productNameSnapshot} />
                        <figcaption>
                          {item.productNameSnapshot}
                          {` · SKU ${item.skuSnapshot}`}
                          {item.sizeLabelSnapshot ? ` (${item.sizeLabelSnapshot})` : ""}
                        </figcaption>
                      </figure>
                    ) : null;
                  })}
                </div>
              ) : null}
              {order.items.some((item) => formatMeasurements(item).length > 0) ? (
                <div className="admin-order-measurements">
                  <strong>Lehenga details</strong>
                  <div className="admin-order-measurement-list">
                    {order.items.flatMap((item) =>
                      formatMeasurements(item).map((detail) => (
                        <span key={`${item.id}-${detail}`}>
                          {item.productNameSnapshot}: {detail}
                        </span>
                      )),
                    )}
                  </div>
                </div>
              ) : null}
              <p>
                Deposit: Rs {order.securityDeposit} · Refund status: {order.depositRefundStatus ?? "NOT_APPLICABLE"}
              </p>
            </div>

            <div className="admin-order-actions">
              <button
                type="button"
                className="admin-primary-button"
                onClick={() => handleFulfilled(order.id)}
                disabled={submitting || order.status === "FULFILLED"}
              >
                Fulfilled
              </button>
              <button type="button" className="admin-secondary-button" onClick={() => openEdit(order)}>
                Edit
              </button>
              {order.paymentGatewayPaymentId &&
              (order.paymentStatus === "PAID" || order.paymentStatus === "PARTIALLY_PAID") &&
              order.depositRefundStatus !== "REFUNDED" ? (
                <button
                  type="button"
                  className="admin-ghost-button"
                  onClick={() => handleRefundDeposit(order.id)}
                  disabled={submitting}
                >
                  Refund fixed deposit
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {!loading && visibleOrders.length === 0 ? (
        <p className="admin-empty-state">
          {orders.length === 0 ? "No orders have been created yet." : "No orders matched your search."}
        </p>
      ) : null}

      {editingOrder ? (
        <div className="admin-preview-overlay" role="dialog" aria-modal="true" aria-labelledby="edit-order-title">
          <div className="admin-preview-modal">
            <div className="admin-panel-heading">
              <div>
                <span className="admin-eyebrow">Order editing</span>
                <h3 id="edit-order-title">{editingOrder.orderNumber}</h3>
              </div>
              <button type="button" className="admin-ghost-button" onClick={() => setEditingOrder(null)}>
                Close
              </button>
            </div>

            <form className="admin-stack" onSubmit={handleEditSubmit}>
              <div className="admin-form-grid">
                <label className="admin-field">
                  <span>Rental start date</span>
                  <input
                    type="date"
                    required
                    value={editForm.rentalStartDate}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        rentalStartDate: event.target.value,
                        items: current.items.map((item) => ({
                          ...item,
                          rentalStartDate: event.target.value,
                        })),
                      }))
                    }
                  />
                </label>
                <label className="admin-field">
                  <span>Rental end date</span>
                  <input
                    type="date"
                    required
                    value={editForm.rentalEndDate}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        rentalEndDate: event.target.value,
                        items: current.items.map((item) => ({
                          ...item,
                          rentalEndDate: event.target.value,
                        })),
                      }))
                    }
                  />
                </label>
              </div>

              <div className="admin-stack">
                {editForm.items.map((item, index) => {
                  const productOptions = item.itemType === "LEHENGA" ? lehengas : jewellery;

                  return (
                    <div key={item.id} className="admin-order-editor-row">
                      <span>{item.itemType}</span>
                      <select
                        value={item.productId}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            items: current.items.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, productId: event.target.value } : entry,
                            ),
                          }))
                        }
                      >
                        <option value="">Select product</option>
                        {productOptions.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            items: current.items.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, quantity: event.target.value } : entry,
                            ),
                          }))
                        }
                      />
                      <input
                        type="date"
                        required
                        value={item.rentalStartDate}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            items: current.items.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, rentalStartDate: event.target.value } : entry,
                            ),
                          }))
                        }
                      />
                      <input
                        type="date"
                        required
                        min={item.rentalStartDate || undefined}
                        value={item.rentalEndDate}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            items: current.items.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, rentalEndDate: event.target.value } : entry,
                            ),
                          }))
                        }
                      />
                    </div>
                  );
                })}
              </div>

              <label className="admin-field">
                <span>Special instructions</span>
                <textarea
                  rows={3}
                  value={editForm.specialInstructions}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, specialInstructions: event.target.value }))
                  }
                />
              </label>
              <label className="admin-field">
                <span>Internal notes</span>
                <textarea
                  rows={3}
                  value={editForm.internalNotes}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, internalNotes: event.target.value }))
                  }
                />
              </label>

              <button className="admin-primary-button" type="submit" disabled={submitting}>
                {submitting ? "Saving order..." : "Save changes"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
