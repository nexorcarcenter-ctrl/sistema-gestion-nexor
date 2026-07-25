import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";
import User from "@/entities/User";
import {
  LayoutDashboard, ShoppingCart, Receipt, Package, Truck,
  BarChart3, TrendingUp, Users, ArrowLeftRight, FolderOpen, Wrench, ClipboardList, Wallet,
  LayoutGrid, FileText, CreditCard, Menu, X, LogOut, PlusCircle, Plus, CalendarDays
} from "lucide-react";


const DETAIL_PAGES = ["SaleDetail", "ProductForm", "PurchaseOrderDetail", "NewPurchaseOrder", "ServiceOrderDetail", "NewServiceOrder", "CashRegister", "NewRemito", "InspectionPage", "NewSale"];

const CARGO_LABELS = {
  mecanico: "Mecánico",
  recepcionista: "Recepcionista",
  admin: "Administrador",
  otro: "Otro",
};

function buildNavSections(isAdmin) {
  return [
    { label: "overview", items: [{ key: "dashboard", icon: LayoutDashboard, page: "Dashboard" }] },
    { label: "tallerSection", items: [{ key: "workshopBoard", icon: LayoutGrid, page: "WorkshopBoard" }, { key: "serviceOrders", icon: ClipboardList, page: "ServiceOrders" }, { key: "newServiceOrder", icon: PlusCircle, page: "NewServiceOrder" }, { key: "agenda", icon: CalendarDays, page: "Agenda" }] },
    { label: "ventasSection", items: [{ key: "pos", icon: ShoppingCart, page: "PointOfSale" }, { key: "newSaleDirect", icon: Plus, page: "NewSale" }, { key: "sales", icon: Receipt, page: "Sales" }] },
    { label: "inventarioSection", items: [{ key: "products", icon: Package, page: "Products" }, { key: "categories", icon: FolderOpen, page: "Categories" }, { key: "movements", icon: ArrowLeftRight, page: "StockMovements" }, { key: "remitos", icon: FileText, page: "Remitos" }] },
    { label: "comprasSection", items: [{ key: "purchaseOrders", icon: Truck, page: "PurchaseOrders" }, { key: "suppliers", icon: Users, page: "Suppliers" }] },
    { label: "configSection", items: [{ key: "serviceTypes", icon: Wrench, page: "ServiceTypes" }, { key: "paymentMethods", icon: CreditCard, page: "PaymentMethods" }, { key: "cashRegister", icon: Wallet, page: "CashRegister" }] },
    { label: "analyticsSection", items: [{ key: "reports", icon: BarChart3, page: "Reports" }, ...(isAdmin ? [{ key: "adminDashboard", icon: TrendingUp, page: "AdminDashboard" }] : [])] },
    ...(isAdmin ? [{ label: "adminSection", items: [{ key: "usersPage", icon: Users, page: "UsersPage" }] }] : []),
  ];
}

function UserFooter({ user, onLogout }) {
  const initials = user?.fullName ? user.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "?";
  return (
    <div className="border-t border-white/10 p-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#E8461E] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate">{user?.fullName || user?.username || "Usuario"}</p>
          <p className="text-[10px] text-slate-400 truncate">{CARGO_LABELS[user?.cargo] || user?.username || ""}</p>
        </div>
        <button
          onClick={onLogout}
          title="Cerrar sesión"
          className="text-slate-400 hover:text-red-400 transition-colors p-1 flex-shrink-0"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SidebarContent({ currentPageName, onLinkClick, t, isAdmin, user, onLogout }) {
  const isActive = (page) => currentPageName === page || (DETAIL_PAGES.includes(currentPageName) && page === "Dashboard");
  const navSections = buildNavSections(isAdmin);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div>
            <img src="/nexor-logo.svg" alt="Nexor" className="h-5 w-auto mb-0.5" />
            <p className="text-[10px] text-slate-400">Sistema de gestión</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navSections.map((section) => (
          section.items.length > 0 && (
            <div key={section.label}>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 px-2 mb-1.5">{t(section.label)}</p>
              {section.items.map(({ key, icon: Icon, page }) => (
                <Link key={key} to={createPageUrl(page)}
                  onClick={onLinkClick}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors mb-0.5 ${
                    isActive(page) ? "bg-[#E8461E]/20 text-[#E8461E]" : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}>
                  <Icon className={`h-4 w-4 ${isActive(page) ? "text-[#E8461E]" : ""}`} />
                  {t(key)}
                </Link>
              ))}
            </div>
          )
        ))}
      </nav>
      <UserFooter user={user} onLogout={onLogout} />
    </div>
  );
}

function LayoutContent({ children, currentPageName }) {
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    User.me().then(user => {
      setCurrentUser(user);
      if (user?.role === "admin") setIsAdmin(true);
    }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await User.logout();
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="w-56 fixed inset-y-0 left-0 bg-[#0D0D0F] text-white z-30 hidden md:flex flex-col print:hidden">
        <SidebarContent
          currentPageName={currentPageName}
          onLinkClick={() => {}}
          t={t}
          isAdmin={isAdmin}
          user={currentUser}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-[#0D0D0F] text-white z-50 flex flex-col md:hidden transition-transform duration-300 print:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <img src="/nexor-logo.svg" alt="Nexor" className="h-5 w-auto" />
          </div>
          <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white p-1">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {buildNavSections(isAdmin).map((section) => {
            if (section.items.length === 0) return null;
            return (
              <div key={section.label}>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 px-2 mb-1.5">{t(section.label)}</p>
                {section.items.map(({ key, icon: Icon, page }) => {
                  const active = currentPageName === page || (DETAIL_PAGES.includes(currentPageName) && page === "Dashboard");
                  return (
                    <Link key={key} to={createPageUrl(page)}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors mb-0.5 ${
                        active ? "bg-[#E8461E]/20 text-[#E8461E]" : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}>
                      <Icon className={`h-4 w-4 ${active ? "text-[#E8461E]" : ""}`} />
                      {t(key)}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <UserFooter user={currentUser} onLogout={handleLogout} />
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-56 print:ml-0 min-h-screen">
        <div className="md:hidden print:hidden flex items-center gap-3 px-4 py-3 bg-[#0D0D0F] text-white sticky top-0 z-20">
          <button onClick={() => setMobileOpen(true)} className="text-slate-300 hover:text-white">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <img src="/nexor-logo.svg" alt="Nexor" className="h-5 w-auto" />
          </div>
          <button onClick={handleLogout} title="Cerrar sesión" className="text-slate-400 hover:text-red-400 transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">{children}</div>
      </main>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <LanguageProvider>
      <LayoutContent currentPageName={currentPageName}>{children}</LayoutContent>
    </LanguageProvider>
  );
}