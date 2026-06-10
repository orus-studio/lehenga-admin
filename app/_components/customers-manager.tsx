"use client";

import { FormEvent, useEffect, useState } from "react";

import { adminRequest } from "../_lib/admin-api";

type CustomerOrder = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  createdAt: string;
};

type Customer = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone: string;
  notes?: string | null;
  createdAt: string;
  _count: {
    orders: number;
  };
  orders: CustomerOrder[];
};

type ProductOption = {
  id: string;
  name: string;
  sku: string;
  status: string;
  shortDescription?: string | null;
  rentalPricePerDay: string;
  securityDeposit?: string | null;
  category?: { id: string; name: string } | null;
  images?: Array<{ id: string; imageUrl: string; altText?: string | null }>;
  sizes?: Array<{
    id: string;
    sizeLabel: string;
    quantityTotal: number;
    quantityReserved: number;
  }>;
  stockQuantity?: number;
};

type OrderItemDraft = {
  itemType: "LEHENGA" | "JEWELLERY";
  productId: string;
  quantity: string;
  rentalStartDate: string;
  rentalEndDate: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function CustomersManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [lehengas, setLehengas] = useState<ProductOption[]>([]);
  const [jewellery, setJewellery] = useState<ProductOption[]>([]);
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [orderCustomerId, setOrderCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    notes: "",
  });
  const [orderForm, setOrderForm] = useState({
    rentalStartDate: "",
    rentalEndDate: "",
    specialInstructions: "",
    internalNotes: "",
    items: [
      {
        itemType: "LEHENGA",
        productId: "",
        quantity: "1",
        rentalStartDate: "",
        rentalEndDate: "",
      },
    ] as OrderItemDraft[],
  });

  async function loadData() {
    try {
      setError(null);
      const [customersData, lehengasData, jewelleryData] = await Promise.all([
        adminRequest<Customer[]>("/admin/customers", { withAuth: true }),
        adminRequest<ProductOption[]>("/admin/lehengas", { withAuth: true }),
        adminRequest<ProductOption[]>("/admin/jewellery", { withAuth: true }),
      ]);

      setCustomers(customersData);
      setLehengas(lehengasData);
      setJewellery(jewelleryData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      if (!cancelled) {
        await loadData();
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  async function handleCreateCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await adminRequest("/admin/customers", {
        method: "POST",
        withAuth: true,
        body: {
          firstName: customerForm.firstName,
          lastName: customerForm.lastName || undefined,
          email: customerForm.email,
          phone: customerForm.phone,
          password: customerForm.password,
          notes: customerForm.notes || undefined,
        },
      });

      setCustomerForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        password: "",
        notes: "",
      });
      await loadData();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Failed to create customer");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!orderCustomerId) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await adminRequest("/admin/orders", {
        method: "POST",
        withAuth: true,
        body: {
          customerId: orderCustomerId,
          rentalStartDate: orderForm.rentalStartDate,
          rentalEndDate: orderForm.rentalEndDate,
          paymentMethod: "PICKUP",
          specialInstructions: orderForm.specialInstructions || undefined,
          internalNotes: orderForm.internalNotes || undefined,
          items: orderForm.items.map((item) =>
            item.itemType === "LEHENGA"
              ? {
                  itemType: item.itemType,
                  lehengaId: item.productId,
                  quantity: Number(item.quantity || 1),
                  rentalStartDate: item.rentalStartDate,
                  rentalEndDate: item.rentalEndDate,
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

      setOrderCustomerId(null);
      setOrderForm({
        rentalStartDate: "",
        rentalEndDate: "",
        specialInstructions: "",
        internalNotes: "",
        items: [
          {
            itemType: "LEHENGA",
            productId: "",
            quantity: "1",
            rentalStartDate: "",
            rentalEndDate: "",
          },
        ],
      });
      await loadData();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-stack">
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <h3>Create customer</h3>
        </div>
        <form className="admin-form-grid" onSubmit={handleCreateCustomer}>
          <label className="admin-field">
            <span>First name</span>
            <input
              required
              value={customerForm.firstName}
              onChange={(event) => setCustomerForm((current) => ({ ...current, firstName: event.target.value }))}
            />
          </label>
          <label className="admin-field">
            <span>Last name</span>
            <input
              value={customerForm.lastName}
              onChange={(event) => setCustomerForm((current) => ({ ...current, lastName: event.target.value }))}
            />
          </label>
          <label className="admin-field">
            <span>Email</span>
            <input
              required
              type="email"
              value={customerForm.email}
              onChange={(event) => setCustomerForm((current) => ({ ...current, email: event.target.value }))}
            />
          </label>
          <label className="admin-field">
            <span>Phone / WhatsApp</span>
            <input
              required
              value={customerForm.phone}
              onChange={(event) => setCustomerForm((current) => ({ ...current, phone: event.target.value }))}
            />
          </label>
          <label className="admin-field">
            <span>Password</span>
            <input
              required
              type="password"
              value={customerForm.password}
              onChange={(event) => setCustomerForm((current) => ({ ...current, password: event.target.value }))}
            />
          </label>
          <label className="admin-field admin-field-full">
            <span>Notes</span>
            <textarea
              rows={3}
              value={customerForm.notes}
              onChange={(event) => setCustomerForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </label>

          {error ? <p className="admin-error-banner admin-field-full">{error}</p> : null}

          <button className="admin-primary-button admin-field-full" type="submit" disabled={submitting}>
            {submitting ? "Creating customer..." : "Create customer"}
          </button>
        </form>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <h3>Customers</h3>
        </div>
        {loading ? <p className="admin-empty-state">Loading customers...</p> : null}
        <div className="admin-card-list">
          {customers.map((customer) => (
            <article key={customer.id} className="admin-customer-card">
              <div className="admin-customer-card-head">
                <div>
                  <strong>
                    {customer.firstName} {customer.lastName ?? ""}
                  </strong>
                  <p>{customer.email}</p>
                  <a href={`tel:${customer.phone}`}>{customer.phone}</a>
                  <a href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                </div>
                <div className="admin-customer-card-actions">
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={() =>
                      setExpandedCustomerId((current) => (current === customer.id ? null : customer.id))
                    }
                  >
                    {expandedCustomerId === customer.id ? "Hide details" : "View details"}
                  </button>
                  <button
                    type="button"
                    className="admin-primary-button"
                    onClick={() => setOrderCustomerId(customer.id)}
                  >
                    Create order
                  </button>
                </div>
              </div>

              <div className="admin-customer-stats">
                <span>{customer._count.orders} purchase(s)</span>
                <span>Joined {formatDate(customer.createdAt)}</span>
              </div>

              {expandedCustomerId === customer.id ? (
                <div className="admin-customer-details">
                  {customer.notes ? <p>{customer.notes}</p> : <p>No customer notes yet.</p>}
                  <div className="admin-list">
                    {customer.orders.map((order) => (
                      <div key={order.id} className="admin-list-item">
                        <strong>{order.orderNumber}</strong>
                        <p>
                          {order.status} · Rs {order.totalAmount}
                        </p>
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                    ))}
                    {customer.orders.length === 0 ? (
                      <p className="admin-empty-state">No purchases yet for this customer.</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
          {!loading && customers.length === 0 ? <p className="admin-empty-state">No customers yet.</p> : null}
        </div>
      </section>

      {orderCustomerId ? (
        <div className="admin-preview-overlay" role="dialog" aria-modal="true" aria-labelledby="create-order-title">
          <div className="admin-preview-modal">
            <div className="admin-panel-heading">
              <div>
                <span className="admin-eyebrow">Order creation</span>
                <h3 id="create-order-title">Create order for customer</h3>
              </div>
              <button type="button" className="admin-ghost-button" onClick={() => setOrderCustomerId(null)}>
                Close
              </button>
            </div>

            <form className="admin-stack" onSubmit={handleCreateOrder}>
              <div className="admin-form-grid">
                <label className="admin-field">
                  <span>Rental start date</span>
                  <input
                    type="date"
                    required
                    value={orderForm.rentalStartDate}
                    onChange={(event) =>
                      setOrderForm((current) => ({
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
                    value={orderForm.rentalEndDate}
                    onChange={(event) =>
                      setOrderForm((current) => ({
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
                {orderForm.items.map((item, index) => {
                  const productOptions = [...(item.itemType === "LEHENGA" ? lehengas : jewellery)].sort((left, right) =>
                    left.sku.localeCompare(right.sku),
                  );
                  const selectedProduct = productOptions.find((product) => product.id === item.productId);

                  return (
                    <div key={`${item.itemType}-${index}`} className="admin-order-item-editor">
                      <div className="admin-order-editor-row">
                        <select
                          aria-label="Product type"
                          value={item.itemType}
                          onChange={(event) =>
                            setOrderForm((current) => ({
                              ...current,
                              items: current.items.map((entry, entryIndex) =>
                                entryIndex === index
                                  ? {
                                      itemType: event.target.value as "LEHENGA" | "JEWELLERY",
                                      productId: "",
                                      quantity: "1",
                                      rentalStartDate: entry.rentalStartDate,
                                      rentalEndDate: entry.rentalEndDate,
                                    }
                                  : entry,
                              ),
                            }))
                          }
                        >
                          <option value="LEHENGA">Lehenga</option>
                          <option value="JEWELLERY">Jewellery</option>
                        </select>
                        <select
                          aria-label="Select product by SKU"
                          value={item.productId}
                          onChange={(event) =>
                            setOrderForm((current) => ({
                              ...current,
                              items: current.items.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, productId: event.target.value } : entry,
                              ),
                            }))
                          }
                          required
                        >
                          <option value="">Select SKU</option>
                          {productOptions.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.sku} - {product.name}
                            </option>
                          ))}
                        </select>
                        <input
                          aria-label="Quantity"
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(event) =>
                            setOrderForm((current) => ({
                              ...current,
                              items: current.items.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, quantity: event.target.value } : entry,
                              ),
                            }))
                          }
                        />
                        <input
                          aria-label="Rental start date"
                          type="date"
                          required
                          value={item.rentalStartDate}
                          onChange={(event) =>
                            setOrderForm((current) => ({
                              ...current,
                              items: current.items.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, rentalStartDate: event.target.value } : entry,
                              ),
                            }))
                          }
                        />
                        <input
                          aria-label="Rental end date"
                          type="date"
                          required
                          min={item.rentalStartDate || undefined}
                          value={item.rentalEndDate}
                          onChange={(event) =>
                            setOrderForm((current) => ({
                              ...current,
                              items: current.items.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, rentalEndDate: event.target.value } : entry,
                              ),
                            }))
                          }
                        />
                        <button
                          type="button"
                          className="admin-danger-button"
                          onClick={() =>
                            setOrderForm((current) => ({
                              ...current,
                              items:
                                current.items.length === 1
                                  ? current.items
                                  : current.items.filter((_, entryIndex) => entryIndex !== index),
                            }))
                          }
                        >
                          Remove
                        </button>
                      </div>

                      {selectedProduct ? (
                        <article className="admin-order-product-card">
                          <div className="admin-order-product-image">
                            {selectedProduct.images?.[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={selectedProduct.images[0].imageUrl}
                                alt={selectedProduct.images[0].altText || selectedProduct.name}
                              />
                            ) : (
                              <span>{selectedProduct.name.slice(0, 1)}</span>
                            )}
                          </div>
                          <div className="admin-order-product-copy">
                            <div>
                              <span className="admin-eyebrow">{selectedProduct.sku}</span>
                              <h4>{selectedProduct.name}</h4>
                            </div>
                            <p>{selectedProduct.shortDescription || "No description added."}</p>
                            <div className="admin-order-product-meta">
                              <span>Category: {selectedProduct.category?.name ?? "Unassigned"}</span>
                              <span>Status: {selectedProduct.status}</span>
                              <span>Rental: Rs {selectedProduct.rentalPricePerDay}/day</span>
                              <span>Deposit: Rs {selectedProduct.securityDeposit ?? "0"}</span>
                              <span>
                                Stock:{" "}
                                {item.itemType === "LEHENGA"
                                  ? selectedProduct.sizes
                                      ?.map((size) => `${size.sizeLabel}: ${size.quantityTotal}`)
                                      .join(", ") || "No sizes"
                                  : selectedProduct.stockQuantity ?? 0}
                              </span>
                            </div>
                          </div>
                        </article>
                      ) : null}
                    </div>
                  );
                })}

                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={() =>
                    setOrderForm((current) => ({
                      ...current,
                      items: [
                        ...current.items,
                        {
                          itemType: "LEHENGA",
                          productId: "",
                          quantity: "1",
                          rentalStartDate: current.rentalStartDate,
                          rentalEndDate: current.rentalEndDate,
                        },
                      ],
                    }))
                  }
                >
                  Add item
                </button>
              </div>

              <label className="admin-field">
                <span>Special instructions</span>
                <textarea
                  rows={3}
                  value={orderForm.specialInstructions}
                  onChange={(event) =>
                    setOrderForm((current) => ({ ...current, specialInstructions: event.target.value }))
                  }
                />
              </label>
              <label className="admin-field">
                <span>Internal notes</span>
                <textarea
                  rows={3}
                  value={orderForm.internalNotes}
                  onChange={(event) =>
                    setOrderForm((current) => ({ ...current, internalNotes: event.target.value }))
                  }
                />
              </label>

              <button className="admin-primary-button" type="submit" disabled={submitting}>
                {submitting ? "Creating order..." : "Create order"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
