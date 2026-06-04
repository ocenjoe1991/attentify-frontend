import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../../layouts/Layout";
import { useNotification } from "../../context/NotificationContext";
import { usePageTitle } from "../../context/PageTitleContext";
import { useCompany } from "../../context/CompanyContext";

interface Customer {
  id?: string;
  email?: string;
  name?: string;
}

interface LineItem {
  product_id?: string;
  name?: string;
  quantity?: number;
  price?: string;
}

interface Order {
  order_id: string;
  name: string;
  shop: string;
  created_at?: string;
  customer?: Customer;
  total_price?: string;
  payment_status?: string;
  fulfillment_status?: string;
  line_items?: LineItem[];
}

interface ShopifyShop {
  _id: string;
  shop: string;
}

const ORDER_PREFERENCES_KEY = "attentify.orderListPreferences";

const defaultOrderPreferences = {
  pageSize: 10,
  selectedShop: "",
};

function loadOrderPreferences() {
  try {
    const stored = localStorage.getItem(ORDER_PREFERENCES_KEY);
    if (!stored) return defaultOrderPreferences;

    return {
      ...defaultOrderPreferences,
      ...JSON.parse(stored),
    };
  } catch {
    return defaultOrderPreferences;
  }
}

export default function OrderPage() {
  const savedPreferences = loadOrderPreferences();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedShop, setSelectedShop] = useState(savedPreferences.selectedShop);
  const [shops, setShops] = useState<ShopifyShop[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(savedPreferences.pageSize);
  const [totalPages, setTotalPages] = useState(1);

  const { notify } = useNotification();
  const { setTitle } = usePageTitle();

  const { currentCompanyId } = useCompany();

  useEffect(() => {
    setTitle("Orders");
    fetchOrders();
    fetchShops();
  }, [currentPage, pageSize, search, selectedShop, currentCompanyId]);

  useEffect(() => {
    localStorage.setItem(
      ORDER_PREFERENCES_KEY,
      JSON.stringify({
        pageSize,
        selectedShop,
      })
    );
  }, [pageSize, selectedShop]);

  // Fetch all orders with search, pagination, and shop filter
  const fetchOrders = async () => {
    if (!currentCompanyId) return;

    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || ""}/shopify/orders`, {
        params: {
          search,
          page: currentPage,
          size: pageSize,
          shop: selectedShop,
          company_id: currentCompanyId, 
        },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      setOrders(res.data.orders);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error("Failed to fetch orders", err);
      notify("error", "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchShops = async () => {
    if (!currentCompanyId) return;

    setLoading(true);
    try {
      // Build base URL
      const baseUrl = import.meta.env.VITE_API_URL || "";
      
      // Add company_id as query param if provided
      const url = `${baseUrl}/shopify/company?company_id=${encodeURIComponent(currentCompanyId)}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      setShops(res.data);
    } catch (err) {
      console.error("Failed to fetch Shopify shops", err);
      notify("error", "Failed to fetch Shopify shops");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncOrders = async () => {
    if (!currentCompanyId) return;
    setLoading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL || ""}/shopify/orders/sync`,
        { company_id: currentCompanyId },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      await fetchOrders();
    } catch (err) {
      console.error("Failed to sync orders", err);
      notify("error", "Failed to sync orders");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-4">
        <div className="bg-white">
          {/* Filters & Sync */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search by order or customer email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border border-gray-300 px-3 py-2 w-full md:w-64 text-sm"
              />
              <select
                value={selectedShop}
                onChange={(e) => {
                  setSelectedShop(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">All Shops</option>
                {shops.map((shop) => (
                  <option key={shop._id} value={shop.shop}>
                    {shop.shop}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSyncOrders}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium"
            >
              + Sync Orders
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <p className="text-gray-500">Loading Orders...</p>
          ) : orders.length === 0 ? (
            <p className="text-gray-500">No Orders.</p>
          ) : (
            <div className="overflow-x-auto border border-gray-300">
              <table className="min-w-full text-sm divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-4 px-3 text-left font-semibold text-gray-600">Order</th>
                    <th className="py-4 px-3 text-left font-semibold text-gray-600">Shop</th>
                    <th className="py-4 px-3 text-left font-semibold text-gray-600">Date</th>
                    <th className="py-4 px-3 text-left font-semibold text-gray-600">Customer</th>
                    <th className="py-4 px-3 text-left font-semibold text-gray-600">Total</th>
                    <th className="py-4 px-3 text-left font-semibold text-gray-600">Payment Status</th>
                    <th className="py-4 px-3 text-left font-semibold text-gray-600">Fulfillment Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {orders.map((order) => (
                    <tr key={order.order_id}>
                      <td className="py-2 px-3">{order.name}</td>
                      <td className="py-2 px-3">{order.shop}</td>
                      <td className="py-2 px-3">
                        {order.created_at ? new Date(order.created_at).toLocaleString() : "-"}
                      </td>
                      <td className="py-2 px-3">
                        {order.customer?.name || "-"}
                        <br />
                        <span className="text-xs text-gray-500">{order.customer?.email}</span>
                      </td>
                      <td className="py-2 px-3">{order.total_price || "-"}</td>
                      <td className="py-2 px-3">
                        {order.payment_status ? (
                          <span
                            className={
                              order.payment_status === "paid"
                                ? "text-green-600 font-semibold"
                                : order.payment_status === "pending"
                                ? "text-yellow-600 font-semibold"
                                : "text-gray-600"
                            }
                          >
                            {order.payment_status}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {order.fulfillment_status ? (
                          <span
                            className={
                              order.fulfillment_status === "fulfilled"
                                ? "text-green-600 font-semibold"
                                : order.fulfillment_status === "partial"
                                ? "text-yellow-600 font-semibold"
                                : "text-gray-600"
                            }
                          >
                            {order.fulfillment_status}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
            <div className="flex justify-between items-center mt-4">
              <div>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 mr-2 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div>
                Page {currentPage} of {totalPages}
              </div>
              <div>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 px-2 py-1"
                >
                  {[5, 10, 20, 50].map((size) => (
                    <option key={size} value={size}>
                      {size} / page
                    </option>
                  ))}
                </select>
              </div>
            </div>
        </div>
      </div>
    </Layout>
  );
}
