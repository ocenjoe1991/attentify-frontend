import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Layout from "../../layouts/Layout";
import OrderInfoCard from "../../components/OrderInfoCard";
import type { OrderInfo, ShopifyOrder } from "../../types";
import { useCompany } from "../../context/CompanyContext";
import { useNotification } from "../../context/NotificationContext";
import { usePageTitle } from "../../context/PageTitleContext";

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { currentCompanyId } = useCompany();
  const { notify } = useNotification();
  const { setTitle } = usePageTitle();
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId || !currentCompanyId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || ""}/shopify/orders`, {
        params: {
          search: orderId,
          page: 1,
          size: 1,
          shop: "",
          company_id: currentCompanyId,
          include_actions: true,
        },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      const order = response.data.orders?.[0] as ShopifyOrder | undefined;
      if (!order) {
        setOrderInfo(null);
        setError("Order not found.");
        return;
      }

      setTitle(`Order ${order.name || orderId}`);
      setOrderInfo({
        order_id: String(order.name || order.order_id || orderId),
        type: "order",
        status: 1,
        msg: "",
        confirmed: true,
        shopify_order: order,
      });
    } catch (err) {
      console.error("Failed to fetch order", err);
      setError("Failed to fetch order.");
      notify("error", "Failed to fetch order");
    } finally {
      setLoading(false);
    }
  }, [currentCompanyId, notify, orderId, setTitle]);

  useEffect(() => {
    setTitle("Order Detail");
  }, [setTitle]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const orderOptions = orderInfo?.shopify_order
    ? [{ value: orderInfo.shopify_order.name, label: orderInfo.shopify_order.name }]
    : [];

  return (
    <Layout>
      <div className="flex h-[calc(100vh-5rem)] flex-col overflow-hidden p-4">
        <div className="mb-4 shrink-0">
          <Link
            to="/order"
            className="inline-flex items-center gap-2 border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Orders
          </Link>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid max-w-6xl grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
            <OrderInfoCard
              order={orderInfo}
              loading={loading}
              error={error}
              orderOptions={orderOptions}
              readOnlyOrderSelection
              layout="detail"
              onOrderNameChanged={() => {}}
              showConfirmButton={false}
              isOrderConfirmed={false}
              onConfirm={() => {}}
              onActionCompleted={fetchOrder}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
