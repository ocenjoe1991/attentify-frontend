import React, { useState } from "react";
import type { ShopifyLineItem, OrderInfo } from "../types";
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

const OrderInfoCard: React.FC<OrderInfoCardProps> = ({ 
  order, 
  loading, 
  error, 
  messageId,
  orderOptions, 
  onOrderNameChanged, 
  showConfirmButton, 
  onConfirm,  
}) => {
  const { notify } = useNotification();
  const { confirm } = useConfirmDialog();
  const [showRefundModal, setShowRefundModal] = useState(false);

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
                </>
              );
            })()}
          </>
        ) : (
          <div className="mt-4 text-gray-500">{order.msg}</div>
        )}
      </div>

      {showRefundModal && (
        <RefundModal order={order} messageId={messageId} onClose={() => setShowRefundModal(false)} />
      )}
    </>
  );
};

export default OrderInfoCard;
