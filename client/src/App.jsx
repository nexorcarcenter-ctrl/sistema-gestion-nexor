import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import Layout from "./Layout";
import Login from "./pages/Login";
import { CashRegisterProvider, useCashRegister } from "./context/CashRegisterContext";
import { Wallet } from "lucide-react";

// Pages
import Dashboard from "./pages/Dashboard";
import WorkshopBoard from "./pages/WorkshopBoard";
import ServiceOrders from "./pages/ServiceOrders";
import NewServiceOrder from "./pages/NewServiceOrder";
import ServiceOrderDetail from "./pages/ServiceOrderDetail";
import PointOfSale from "./pages/PointOfSale";
import NewSale from "./pages/NewSale";
import Sales from "./pages/Sales";
import SaleDetail from "./pages/SaleDetail";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import StockMovements from "./pages/StockMovements";
import Remitos from "./pages/Remitos";
import NewRemito from "./pages/NewRemito";
import PurchaseOrders from "./pages/PurchaseOrders";
import PurchaseOrderDetail from "./pages/PurchaseOrderDetail";
import NewPurchaseOrder from "./pages/NewPurchaseOrder";
import Suppliers from "./pages/Suppliers";
import ServiceTypes from "./pages/ServiceTypes";
import PaymentMethods from "./pages/PaymentMethods";
import CashRegister from "./pages/CashRegister";
import Reports from "./pages/Reports";
import AdminDashboard from "./pages/AdminDashboard";
import Cars from "./pages/Cars";
import ServiceOrdersList from "./pages/ServiceOrders";
import InspectionPage from "./pages/InspectionPage";
import ExitInspectionPage from "./pages/ExitInspectionPage";
import UsersPage from "./pages/UsersPage";
import Agenda from "./pages/Agenda";
import ComingSoonGuard from "./components/ComingSoonGuard";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

// Rutas que requieren caja abierta para operar
const REQUIRES_CAJA = [
  "/new-sale",
  "/point-of-sale",
  "/new-service-order",
  "/service-order-detail",
  "/workshop-board",
];

function AuthGuard({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function CashGuard({ children }) {
  const { openRegister, loading } = useCashRegister();
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const needsCaja = REQUIRES_CAJA.some(r => location.pathname.startsWith(r));

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setIsAdmin(payload.role === "admin");
      } catch {}
    }
  }, []);

  if (loading || !needsCaja || openRegister || isAdmin) return children;

  return (
    <>
      {children}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 text-center">
          <div className="w-16 h-16 bg-[#E8461E]/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Wallet className="h-8 w-8 text-[#E8461E]" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Caja no abierta</h2>
          <p className="text-slate-500 text-sm mb-6">
            Debés abrir la caja del día para poder continuar con esta operación.
          </p>
          <button
            onClick={() => navigate("/cash-register")}
            className="w-full bg-[#E8461E] hover:bg-[#c73a15] text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
          >
            Ir a Caja
          </button>
        </div>
      </div>
    </>
  );
}

function AppRoutes() {
  const location = useLocation();
  const pageName = location.pathname.replace(/^\//, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <AuthGuard>
            <CashRegisterProvider>
              <CashGuard>
            <Layout currentPageName={pageName || "Dashboard"}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/workshop-board" element={<WorkshopBoard />} />
                <Route path="/service-orders" element={<ServiceOrders />} />
                <Route path="/new-service-order" element={<NewServiceOrder />} />
                <Route path="/service-order-detail" element={<ServiceOrderDetail />} />
                <Route path="/inspection-page" element={<InspectionPage />} />
                <Route path="/exit-inspection-page" element={<ExitInspectionPage />} />
                <Route path="/users-page" element={<UsersPage />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/point-of-sale" element={<PointOfSale />} />
                <Route path="/new-sale" element={<NewSale />} />
                <Route path="/sales" element={<Sales />} />
                <Route path="/sale-detail" element={<SaleDetail />} />
                <Route path="/products" element={<Products />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/stock-movements" element={<StockMovements />} />
                <Route path="/remitos" element={<Remitos />} />
                <Route path="/new-remito" element={<NewRemito />} />
                <Route path="/purchase-orders" element={<PurchaseOrders />} />
                <Route path="/purchase-order-detail" element={<PurchaseOrderDetail />} />
                <Route path="/new-purchase-order" element={<NewPurchaseOrder />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/service-types" element={<ServiceTypes />} />
                <Route path="/payment-methods" element={<PaymentMethods />} />
                <Route path="/cash-register" element={<CashRegister />} />
                <Route path="/reports" element={<ComingSoonGuard><Reports /></ComingSoonGuard>} />
                <Route path="/admin-dashboard" element={<ComingSoonGuard><AdminDashboard /></ComingSoonGuard>} />
                <Route path="/cars" element={<Cars />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
              </CashGuard>
            </CashRegisterProvider>
          </AuthGuard>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
