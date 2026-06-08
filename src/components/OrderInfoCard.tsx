import React, { useState } from "react";
import type { ShopifyLineItem, OrderInfo, OrderAction } from "../types";
import { useNotification } from "../context/NotificationContext";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import axios from "axios";
import Select from "react-select";
import RefundModal from "./RefundModal";

interface OrderInfoCardProps {
  order: OrderInfo | null;
  loading: boolean;
  error: string | null;
  messageId?: string;
  orderOptions: any;
  onOrderNameChanged: (orderName: string) => void;
  showConfirmButton: boolean,
  onConfirm: () => void;
  onActionCompleted?: () => void;
}

const renderLineItems = (items?: ShopifyLineItem[]) => {
  if (!items || items.length === 0)
    return <span className="text-gray-400">No items</span>;

  return (
    <ul className="space-y-1">
      {items.map((item, idx) => (
        <li key={idx} className="flex justify-between">
          <span>
            <span className="font-medium">{item.name}</span>
            {item.quantity !== undefined && <> x {item.quantity}</>}
          </span>
          {item.price !== undefined && (
            <span className="text-gray-600">
              ${typeof item.price === "number" ? item.price.toFixed(2) : item.price}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
};

const actionLabel = (type?: string) => {
  switch (type) {
    case "refund":
      return "Refund";
    case "cancellation":
      return "Cancellation";
    case "return":
      return "Return";
    case "exchange":
      return "Exchange";
    case "resend_invoice":
      return "Resent invoice";
    case "add_note":
      return "Added note";
    case "fulfillment_hold":
      return "Fulfillment hold";
    case "fulfillment_release":
      return "Fulfillment released";
    default:
      return type || "Action";
  }
};

const formatMoney = (amount?: string | number) => {
  if (amount === undefined || amount === null || amount === "") return "-";
  const value = Number(amount);
  return Number.isNaN(value) ? String(amount) : `$${value.toFixed(2)}`;
};

const formatActionDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const renderOrderActions = (actions?: OrderAction[]) => {
  if (!actions || actions.length === 0) {
    return <div className="text-sm text-gray-500">No order actions yet.</div>;
  }

  return (
    <div className="space-y-2">
      {actions.map((action, index) => (
        <div key={`${action.type}-${action.created_at}-${index}`} className="border border-gray-200 p-2 text-sm">
          <div className="flex justify-between gap-3">
            <span className="font-medium">{actionLabel(action.type)}</span>
            <span className="font-semibold">{formatMoney(action.amount)}</span>
          </div>
          <div className="mt-1 text-gray-600">{formatActionDate(action.created_at)}</div>
          {action.actor_name && (
            <div className="mt-1 text-gray-600">By {action.actor_name}</div>
          )}
          {action.note && (
            <div className="mt-1 text-gray-700 break-words">{action.note}</div>
          )}
        </div>
      ))}
    </div>
  );
};

const OrderInfoCard: React.FC<OrderInfoCardProps> = ({ 
  order, 
  loading, 
  error, 
  messageId,
  orderOptions, 
  onOrderNameChanged, 
  showConfirmButton, 
  onConfirm,  
  onActionCompleted,
}) => {
  const { notify } = useNotification();
  const { confirm } = useConfirmDialog();
  const [showRefundModal, setShowRefundModal] = useState(false);

  const postOrderAction = async (path: string, payload: Record<string, unknown>, fallbackMessage: string) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/shopify/order/${path}`,
        {
          order_id: order?.shopify_order?.order_id || "",
          shop: order?.shopify_order?.shop || "",
          message_id: messageId,
          ...payload,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      notify("success", response.data?.msg || fallbackMessage);
      onActionCompleted?.();
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "Order action failed.";
      console.error("Order action failed:", error.response?.data || error);
      notify("error", typeof errorMsg === "string" ? errorMsg : "Order action failed.");
    }
  };

  const handleReturnOrExchange = async (action: "return" | "exchange") => {
    const label = action === "return" ? "Return" : "Exchange";
    const note = window.prompt(`Enter the ${label.toLowerCase()} note:`);
    if (!note?.trim()) {
      notify("error", `${label} note is required.`);
      return;
    }
    const firstItem = order?.shopify_order?.line_items?.[0];
    if (!firstItem?.id) {
      notify("error", "This order has no line item available for return/exchange.");
      return;
    }
    const lineItemId = window.prompt(
      `Enter Shopify line item ID to ${action}:`,
      String(firstItem.id)
    );
    if (!lineItemId?.trim()) {
      notify("error", "Line item ID is required.");
      return;
    }
    const quantityInput = window.prompt(`Enter quantity to ${action}:`, "1");
    const quantity = Number(quantityInput || 1);
    if (!Number.isInteger(quantity) || quantity < 1) {
      notify("error", "Quantity must be a positive whole number.");
      return;
    }
    const amountInput = window.prompt(`Enter the ${label.toLowerCase()} amount:`, "0");
    const amount = Number(amountInput || 0);
    if (Number.isNaN(amount) || amount < 0) {
      notify("error", "Amount must be a valid number.");
      return;
    }
    const payload: Record<string, unknown> = {
      note,
      amount,
      selected_items: [{ line_item_id: lineItemId.trim(), quantity }],
    };
    if (action === "exchange") {
      const variantId = window.prompt("Enter the replacement Shopify variant ID:");
      if (!variantId?.trim()) {
        notify("error", "Replacement variant ID is required for exchanges.");
        return;
      }
      const exchangeQuantityInput = window.prompt("Enter replacement quantity:", String(quantity));
      const exchangeQuantity = Number(exchangeQuantityInput || quantity);
      if (!Number.isInteger(exchangeQuantity) || exchangeQuantity < 1) {
        notify("error", "Replacement quantity must be a positive whole number.");
        return;
      }
      payload.exchange_items = [{ variant_id: variantId.trim(), quantity: exchangeQuantity }];
    }
    await postOrderAction(action, payload, `${label} created successfully.`);
  };

  const handleResendInvoice = async () => {
    const ok = await confirm({
      title: "Resend Invoice",
      message: "Send an invoice email for this order?",
    });
    if (!ok) return;
    await postOrderAction("resend", { type: "invoice" }, "Invoice sent successfully.");
  };

  const handleAddNote = async () => {
    const note = window.prompt("Enter the order note:");
    if (!note?.trim()) {
      notify("error", "Order note is required.");
      return;
    }
    await postOrderAction("add-note", { note }, "Order note added successfully.");
  };

  const handleFulfillmentHold = async () => {
    const note = window.prompt("Enter the fulfillment hold reason:");
    if (!note?.trim()) {
      notify("error", "Fulfillment hold reason is required.");
      return;
    }
    await postOrderAction("fulfillment-hold", { note, reason: "other" }, "Fulfillment hold placed successfully.");
  };

  const handleFulfillmentRelease = async () => {
    const ok = await confirm({
      title: "Release Fulfillment Hold",
      message: "Release fulfillment hold for this order?",
    });
    if (!ok) return;
    await postOrderAction("fulfillment-release", {}, "Fulfillment hold released successfully.");
  };

  const handleCancel = async () => {
    const ok = await confirm({
      title: "Confirm Cancellation",
      message: "Are you sure you want to cancel this order?",
    });
    if (!ok) return;
    const note = window.prompt("Enter the cancellation reason:");
    if (!note?.trim()) {
      notify("error", "Cancellation reason is required.");
      return;
    }

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/shopify/order/cancel`,
        {
          order_id: order?.shopify_order?.order_id || "",
          shop: order?.shopify_order?.shop || "",
          note,
          message_id: messageId,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const msg =
        response.data?.msg ||
        response.data?.message ||
        "Order cancelled successfully!";
      notify(response.data?.approval_required ? "success" : "success", msg);
      onActionCompleted?.();
    } catch (error: any) {
      let errorMsg = "Order cancellation failed.";

      if (error.response) {
        errorMsg =
          error.response.data?.error ||
          error.response.data?.errors ||
          error.response.data?.message ||
          `Cancellation failed with status ${error.response.status}`;
      } else if (error.request) {
        errorMsg = "No response from server. Please check your connection.";
      } else {
        errorMsg = error.message;
      }

      console.error("Cancel error:", errorMsg, error.response?.data);
      notify("error", errorMsg);
    }
  };

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!order) return <div className="text-gray-500">No order information found.</div>;

  return (
    <>
    <div className="w-[380px] border border-gray-300 bg-white p-4">
        <h2 className="text-lg font-bold mb-5">Customer</h2>
        {order &&
          order.shopify_order &&
          order.shopify_order.customer && (
            <>
              <div className="flex justify-between mb-2">
                <span className="font-semibold">Name:</span>
                <span>{order.shopify_order.customer.name || "-"}</span>
              </div>

              <div className="flex justify-between mb-2">
                <span className="font-semibold">Email:</span>
                <span>{order.shopify_order.customer.email || "-"}</span>
              </div>

              <div className="flex justify-between mb-2">
                <span className="font-semibold">Phone:</span>
                <span>{order.shopify_order.customer.phone || "-"}</span>
              </div>

              <div className="flex justify-between mb-2">
                <span className="font-semibold">Address:</span>
                <span>
                  {order.shopify_order.customer.default_address?.address1 || "-"}
                </span>
              </div>
            </>
        )}
      </div>

      <div className="w-[380px] bg-white border border-gray-300 p-4">
        <h3 className="text-lg font-semibold mb-4">Order</h3>

        {order.shopify_order ? (
          <>
            {/* FORMAT DATE */}
            {(() => {
              const raw = order.shopify_order.created_at;
              var dateFormatted = "-";

              if (raw) {
                try {
                  const dateObj = new Date(raw);
                  dateFormatted = dateObj.toLocaleString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  });
                } catch (e) {
                  dateFormatted = raw;
                }
              }

              return (
                <>
                  {/* FLEX ROWS */}
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">ID:</span>
                    {/* <span>{order.shopify_order.name || "-"}</span> */}
                    <div className="flex gap-1">
                      <Select
                        components={{
                          IndicatorSeparator: null,
                          LoadingIndicator: () => null,
                        }}
                        classNames={{
                          control: () => "w-[110px] border border-gray-300 !rounded-none text-sm",
                          dropdownIndicator: () => "!p-0 !text-black",
                        }}
                        options={orderOptions}
                        value={{
                          value: order.shopify_order.name,
                          label: order.shopify_order.name,
                        }}
                        onChange={(newValue) => {
                          if (newValue?.value) {
                            onOrderNameChanged(newValue.value);
                          }
                        }}
                      />
                      {showConfirmButton && <button 
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm hover:bg-blue-700 transition"
                        onClick={onConfirm}
                      >
                        Confirm
                      </button>}
                    </div>
                  </div>

                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">Shop:</span>
                    <span>{order.shopify_order.shop || "-"}</span>
                  </div>

                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">Created At:</span>
                    <span>{dateFormatted}</span>
                  </div>

                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">Total Price:</span>
                    <span>${order.shopify_order.total_price || "-"}</span>
                  </div>

                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">Shipping:</span>
                    <span>${order.shopify_order.total_shipping_price || "-"}</span>
                  </div>

                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">Payment Status:</span>
                    <span>{order.shopify_order.payment_status || "-"}</span>
                  </div>

                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">Fulfillment Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-sm font-medium
                        ${order.shopify_order.fulfillment_status? "" : "bg-yellow-200 text-yellow-800"}`}
                    >
                      {order.shopify_order.fulfillment_status || "Unfulfilled"}
                    </span>
                  </div>

                  {/* Line Items */}
                  <div className="mt-3">
                    <div className="font-semibold mb-1">Line Items:</div>
                    <div className="ml-2">{renderLineItems(order.shopify_order.line_items)}</div>
                  </div>

                  <div className="mt-4">
                    <div className="font-semibold mb-2">Order Actions:</div>
                    {renderOrderActions(order.shopify_order.order_actions)}
                  </div>

                  {/* Action Buttons */}
                  {!showConfirmButton && <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => setShowRefundModal(true)}
                      className="px-3 py-1.5 bg-green-500 text-white text-sm hover:bg-green-600 transition"
                    >
                      Refund
                    </button>

                    <button
                      onClick={handleCancel}
                      className="px-3 py-1.5 bg-red-500 text-white text-sm hover:bg-red-600 transition"
                    >
                      Cancel
                    </button>
                  </div>}

                  {!showConfirmButton && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleReturnOrExchange("return")}
                        className="px-3 py-1.5 border border-gray-300 bg-white text-sm hover:bg-gray-50 transition"
                      >
                        Return
                      </button>
                      <button
                        onClick={() => handleReturnOrExchange("exchange")}
                        className="px-3 py-1.5 border border-gray-300 bg-white text-sm hover:bg-gray-50 transition"
                      >
                        Exchange
                      </button>
                      <button
                        onClick={handleResendInvoice}
                        className="px-3 py-1.5 border border-gray-300 bg-white text-sm hover:bg-gray-50 transition"
                      >
                        Resend Invoice
                      </button>
                      <button
                        onClick={handleAddNote}
                        className="px-3 py-1.5 border border-gray-300 bg-white text-sm hover:bg-gray-50 transition"
                      >
                        Add Note
                      </button>
                      <button
                        onClick={handleFulfillmentHold}
                        className="px-3 py-1.5 border border-gray-300 bg-white text-sm hover:bg-gray-50 transition"
                      >
                        Hold Fulfillment
                      </button>
                      <button
                        onClick={handleFulfillmentRelease}
                        className="col-span-2 px-3 py-1.5 border border-gray-300 bg-white text-sm hover:bg-gray-50 transition"
                      >
                        Release Fulfillment
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </>
        ) : (
          <div className="mt-4 text-gray-500">{order.msg}</div>
        )}
      </div>

      {showRefundModal && (
        <RefundModal
          order={order}
          messageId={messageId}
          onClose={() => setShowRefundModal(false)}
          onActionCompleted={onActionCompleted}
        />
      )}
    </>
  );
};

export default OrderInfoCard;
