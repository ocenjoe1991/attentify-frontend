import React, { useEffect, useState } from "react";
import type { OrderInfo, ShopifyLineItem } from "../types";
import { useNotification } from "../context/NotificationContext";
import axios from "axios";

interface RefundModalProps {
  order: OrderInfo | null;
  messageId?: string;
  onClose: () => void;
  onActionCompleted?: () => void;
}

const RefundModal: React.FC<RefundModalProps> = ({ order, messageId, onClose, onActionCompleted }) => {
  const { notify } = useNotification();

  const items = order?.shopify_order?.line_items || [];
  const shippingPrice = Number(order?.shopify_order?.total_shipping_price || 0);

  const [selectedItems, setSelectedItems] = useState<ShopifyLineItem[]>([]);
  const [refundQuantities, setRefundQuantities] = useState<Record<string, number>>({});
  const [refundAmount, setRefundAmount] = useState("");
  const [refundShipping, setRefundShipping] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const [includeShipping, setIncludeShipping] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  const [maxItemRefund, setMaxItemRefund] = useState(0);

  // ------------------------------------------------
  // Calculate max refundable item amount
  // ------------------------------------------------
  useEffect(() => {
    const total = selectedItems.reduce((sum, item) => {
      const key = String(item.id);
      return sum + Number(item.price) * Number(refundQuantities[key] || 1);
    }, 0);
    setMaxItemRefund(total);
  }, [selectedItems, refundQuantities]);

  useEffect(() => {
    setSelectAll(selectedItems.length === items.length && items.length > 0);
  }, [selectedItems, items]);

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
      setRefundQuantities({});
    } else {
      setSelectedItems(items);
      setRefundQuantities(
        Object.fromEntries(items.map((item) => [String(item.id), Number(item.quantity || 1)]))
      );
    }
    setSelectAll(!selectAll);
  };

  const handleItemToggle = (item: ShopifyLineItem) => {
    const exists = selectedItems.find((i) => i.id === item.id);
    if (exists) {
      setSelectedItems(selectedItems.filter((i) => i.id !== item.id));
      setRefundQuantities((prev) => {
        const next = { ...prev };
        delete next[String(item.id)];
        return next;
      });
    } else {
      setSelectedItems([...selectedItems, item]);
      setRefundQuantities((prev) => ({
        ...prev,
        [String(item.id)]: 1,
      }));
    }
  };

  const updateRefundQuantity = (item: ShopifyLineItem, quantity: number) => {
    const maxQuantity = Number(item.quantity || 1);
    const clamped = Math.max(1, Math.min(maxQuantity, quantity || 1));
    setRefundQuantities((prev) => ({
      ...prev,
      [String(item.id)]: clamped,
    }));
  };

  // ------------------------------------------------
  // Validate refund amount (items)
  // ------------------------------------------------
  const onRefundAmountChange = (value: string) => {
    const num = Number(value);
    if (num > maxItemRefund) {
      setRefundAmount(maxItemRefund.toFixed(2));
    } else if (num < 0) {
      setRefundAmount("0");
    } else {
      setRefundAmount(value);
    }
  };

  // ------------------------------------------------
  // Validate shipping refund
  // ------------------------------------------------
  const onShippingRefundChange = (value: string) => {
    const num = Number(value);
    if (num > shippingPrice) {
      setRefundShipping(shippingPrice.toFixed(2));
    } else if (num < 0) {
      setRefundShipping("0");
    } else {
      setRefundShipping(value);
    }
  };

  // ------------------------------------------------
  // Refund Handler
  // ------------------------------------------------
  const handleRefund = async () => {
    if (!refundNote.trim()) {
      notify("error", "Refund note is required.");
      return;
    }

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/shopify/order/refund`,
        {
          order_id: order?.shopify_order?.order_id,
          shop: order?.shopify_order?.shop,
          selected_items: selectedItems.map((i) => ({
            line_item_id: i.id,
            quantity: refundQuantities[String(i.id)] || 1,
          })),

          // Allow item refund OR shipping refund OR both
          refund_amount: refundAmount ? Number(refundAmount) : null,

          refund_shipping: includeShipping
            ? refundShipping
              ? Number(refundShipping)
              : shippingPrice
            : null,

          note: refundNote,
          message_id: messageId,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      notify("success", response.data?.msg || "Refund processed successfully!");
      onActionCompleted?.();
      onClose();
    } catch (err) {
      console.error(err);
      notify("error", "Refund failed. Please try again.");
    }
  };

  // --------------------------------------
  // Disable submit ONLY if both are empty
  // --------------------------------------
  const isRefundDisabled =
    (selectedItems.length === 0 && !includeShipping) || !refundNote.trim();

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-100">
      <div className="bg-white p-6 w-full max-w-2xl rounded shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Process Refund</h2>

        {/* Summary */}
        <div className="mb-4 p-3 border border-gray-300 rounded bg-gray-50">
          <p className="text-sm">
            <strong>Selected items total:</strong> ${maxItemRefund.toFixed(2)}
          </p>
          <p className="text-sm">
            <strong>Shipping paid:</strong> ${shippingPrice.toFixed(2)}
          </p>
          <p className="text-sm text-green-700 mt-1">
            <strong>Max refundable:</strong>{" "}
            ${(maxItemRefund + shippingPrice).toFixed(2)}
          </p>
        </div>

        {/* ITEM SELECTION */}
        <div className="mb-4 border border-gray-300 p-4 rounded">
          <label className="flex items-center mb-2 cursor-pointer space-x-2">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={toggleSelectAll}
              className="w-4 h-4 accent-green-600"
            />
            <span className="font-medium">Select All Items</span>
          </label>

          <div className="max-h-48 overflow-y-auto space-y-2 mt-2">
            {items.map((item, idx) => {
              const selected = selectedItems.some((i) => i.id === item.id);
              const key = String(item.id);
              return (
              <label
                key={idx}
                className="flex justify-between items-center gap-3 border-b border-gray-200 pb-2 cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => handleItemToggle(item)}
                    className="w-4 h-4 accent-green-600"
                  />
                  <span>
                    {item.name} (x{item.quantity})
                  </span>
                </div>
                {selected && (
                  <input
                    type="number"
                    min={1}
                    max={Number(item.quantity || 1)}
                    value={refundQuantities[key] || 1}
                    onChange={(e) => updateRefundQuantity(item, Number(e.target.value))}
                    className="w-20 border border-gray-300 px-2 py-1 text-sm"
                    aria-label={`Refund quantity for ${item.name}`}
                  />
                )}
                <span className="text-gray-600">
                  ${Number(item.price).toFixed(2)}
                </span>
              </label>
            )})}
          </div>
        </div>

        {/* Refund Details */}
        <div className="space-y-3">
          {/* Refund amount */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Refund Amount ($)
            </label>
            <input
              type="number"
              value={refundAmount}
              onChange={(e) => onRefundAmountChange(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="Enter refund amount"
              max={maxItemRefund}
              disabled={selectedItems.length === 0}
            />
          </div>

          {/* Shipping Refund */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={includeShipping}
              onChange={(e) => setIncludeShipping(e.target.checked)}
              className="w-4 h-4 accent-green-600"
            />
            <label className="font-medium">Include Shipping Refund</label>
          </div>

          {includeShipping && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Shipping Refund Amount ($)
              </label>
              <input
                type="number"
                value={refundShipping}
                onChange={(e) => onShippingRefundChange(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                placeholder={`Max: $${shippingPrice.toFixed(2)}`}
                max={shippingPrice}
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Refund Note *
            </label>
            <textarea
              value={refundNote}
              onChange={(e) => setRefundNote(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none rounded"
              rows={3}
              placeholder="Enter reason or note for refund"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 hover:bg-gray-100 transition rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleRefund}
            disabled={isRefundDisabled}
            className={`px-4 py-2 text-white rounded transition ${
              isRefundDisabled
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            Submit Refund
          </button>
        </div>
      </div>
    </div>
  );
};

export default RefundModal;
