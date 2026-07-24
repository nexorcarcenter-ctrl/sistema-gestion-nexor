import { createContext, useContext } from "react";

const translations = {
  appName: "RetailPOS", subtitle: "Ventas e Inventario",
  // Navigation
  dashboard: "Panel", pos: "Punto de Venta", sales: "Ventas",
  products: "Productos", inventory: "Inventario", purchaseOrders: "Compra Directa",
  suppliers: "Proveedores", movements: "Movimientos", reports: "Reportes",
  categories: "Categorías",
  // Sections
  overview: "General", salesSection: "Ventas", catalogSection: "Catálogo",
  purchasingSection: "Compras", analyticsSection: "Análisis",
  // Dashboard
  todaySales: "Ventas de Hoy", totalProducts: "Total Productos",
  lowStock: "Stock Bajo", pendingOrders: "Órdenes Pendientes",
  recentSales: "Ventas Recientes", lowStockAlerts: "Alertas Stock Bajo",
  topProducts: "Productos Top", salesTrend: "Tendencia de Ventas",
  viewAll: "Ver Todo", noSalesYet: "Sin ventas aún",
  allWellStocked: "Todos los productos bien abastecidos",
  // POS
  searchProducts: "Buscar productos...", cart: "Carrito", emptyCart: "Carrito vacío",
  addItems: "Agrega productos para iniciar", subtotal: "Subtotal", tax: "Impuesto",
  discount: "Descuento", total: "Total", completeSale: "Completar Venta",
  cash: "Efectivo", card: "Tarjeta", amountReceived: "Monto Recibido",
  change: "Cambio", processing: "Procesando...", saleCompleted: "¡Venta Completada!",
  newSale: "Nueva Venta", printReceipt: "Imprimir Recibo",
  confirmPayment: "Confirmar Pago", transactionSuccess: "Transacción procesada exitosamente",
  // Products
  addProduct: "Agregar Producto", editProduct: "Editar Producto", allProducts: "Todos",
  activeProducts: "Activos", inactiveProducts: "Inactivos", name: "Nombre",
  sku: "SKU", category: "Categoría", price: "Precio", cost: "Costo",
  stock: "Stock", minStock: "Stock Mín", supplier: "Proveedor", status: "Estado",
  unit: "Unidad", save: "Guardar", cancel: "Cancelar", delete: "Eliminar",
  sellingPrice: "Precio de Venta", costPrice: "Precio de Costo", stockQty: "Cantidad",
  noProductsFound: "No se encontraron productos",
  // Sales
  allSales: "Todas", completed: "Completadas", pending: "Pendientes",
  cancelled: "Canceladas", saleNumber: "Venta #", date: "Fecha",
  customer: "Cliente", paymentMethod: "Pago", amount: "Monto",
  viewDetails: "Ver Detalles", totalRevenue: "Ingreso Total",
  transactions: "Transacciones", itemsSold: "Artículos Vendidos", allTime: "Todo",
  searchSales: "Buscar ventas...", noSalesFound: "No se encontraron ventas",
  // Sale Detail
  saleNotFound: "Venta no encontrada", product: "Producto", qty: "Cant",
  summary: "Resumen", received: "Recibido", notes: "Notas",
  // Purchase Orders
  allOrders: "Todas", createPO: "Nueva Compra", poNumber: "Compra #",
  orderDate: "Fecha Compra", expectedDate: "Fecha Esperada", items: "Artículos",
  draft: "Borrador", sent: "Enviada", confirmed: "Confirmada",
  partial: "Parcial", addItem: "Agregar", sendOrder: "Enviar",
  receiveOrder: "Recibir", totalValue: "Valor Total",
  searchOrders: "Buscar compras...", noOrdersFound: "No se encontraron compras",
  orderDetails: "Detalle de Compra", markReceived: "Marcar Recibido",
  receiving: "Recibiendo...", orderNotFound: "Compra no encontrada",
  shipping: "Envío", deletePO: "Eliminar",
  // New Purchase Order
  selectSupplier: "Elegir proveedor...", expectedDelivery: "Entrega Esperada",
  orderSummary: "Resumen de Compra", saveAsDraft: "Guardar Borrador",
  sendToSupplier: "Enviar al Proveedor", searchAndAdd: "Busca y agrega productos arriba",
  // Stock
  stockIn: "Entrada", stockOut: "Salida", adjustment: "Ajuste",
  return: "Devolución", transfer: "Transferencia", damage: "Daño",
  reference: "Referencia", reason: "Razón", previousStock: "Anterior",
  newStock: "Nuevo", quantity: "Cantidad", recordMovement: "Registrar Movimiento",
  type: "Tipo", stockChange: "Cambio Stock", selectProduct: "Seleccionar producto...",
  noMovementsFound: "Sin movimientos",
  // Suppliers
  addSupplier: "Agregar Proveedor", editSupplier: "Editar Proveedor",
  companyName: "Nombre de Empresa", contactName: "Nombre de Contacto",
  searchSuppliers: "Buscar proveedores...", noSuppliersFound: "Sin proveedores",
  // Reports
  salesReport: "Reporte Ventas", inventoryReport: "Reporte Inventario",
  purchaseReport: "Reporte Compras", profitMargin: "Margen de Ganancia",
  thisWeek: "Esta Semana", thisMonth: "Este Mes", thisYear: "Este Año",
  grossProfit: "Ganancia Bruta", avgTransaction: "Prom",
  salesByCategory: "Ventas por Categoría", paymentMethods: "Métodos de Pago",
  inventorySummary: "Resumen Inventario", purchasingSummary: "Resumen Compras",
  totalPOs: "Total Compras", pendingPOValue: "Valor Pendiente",
  receivedThisMonth: "Recibidos Este Mes", inventoryValue: "Valor Inventario",
  // Categories
  addCategory: "Agregar Categoría", editCategory: "Editar Categoría",
  description: "Descripción", color: "Color", sortOrder: "Orden",
  // Common
  loading: "Cargando...", noData: "Sin datos", search: "Buscar",
  filter: "Filtrar", export: "Exportar", print: "Imprimir", refresh: "Actualizar",
  actions: "Acciones", edit: "Editar", view: "Ver", active: "Activo",
  inactive: "Inactivo", all: "Todos", today: "Hoy", yesterday: "Ayer",
  // Volume Discounts
  volumeDiscounts: "Descuentos por Volumen", addTier: "Agregar Nivel", noDiscounts: "Sin descuentos por volumen configurados",
  minQty: "Cant Mín", volumeDiscountHint: "Cantidad mín → % descuento. Se aplica automáticamente en el POS.",
  // Sections
  tallerSection: "Taller",
  ventasSection: "Ventas",
  inventarioSection: "Inventario",
  comprasSection: "Compras",
  configSection: "Configuración",
  // Workshop
  workshopSection: "Taller",
  workshopBoard: "Tablero del Taller",
  serviceOrders: "Órdenes de Servicio",
  newServiceOrder: "Nueva Orden",
  newSaleDirect: "Venta Directa",
  remitos: "Remitos",
  serviceTypes: "Tipos de Servicio",
  cashRegister: "Caja",
  agenda: "Agenda",
  adminDashboard: "Rentabilidad",
  adminSection: "Administración", usersPage: "Usuarios",
  // Cars
  cars: "Autos", addCar: "Agregar Auto", editCar: "Editar Auto", carsSubtitle: "Inventario de vehículos",
  carSearch: "Buscar por marca, modelo, patente...", noCarsFound: "No se encontraron vehículos",
  carTotal: "Total Vehículos", carBasicInfo: "Información Básica", carTechnical: "Especificaciones Técnicas",
  carCommercial: "Comercial", carExtras: "Equipamiento y Notas",
  carBrand: "Marca", carModel: "Modelo", carYear: "Año", carColor: "Color",
  carPlate: "Patente", carVin: "VIN / Chasis", carMileage: "Kilometraje (km)",
  carFuelType: "Combustible", carTransmission: "Transmisión", carBodyType: "Carrocería",
  carDoors: "Puertas", carEngine: "Motor (cc)", carCondition: "Condición",
  carStatus: "Estado", carPurchasePrice: "Precio de Compra", carSalePrice: "Precio de Venta",
  carFeatures: "Equipamiento / Accesorios", carEntryDate: "Fecha de Ingreso",
  carNotesPlaceholder: "Notas internas sobre este vehículo...",
  // Car enums
  fuel_gasoline: "Nafta", fuel_diesel: "Diésel", fuel_electric: "Eléctrico",
  fuel_hybrid: "Híbrido", fuel_lpg: "GNC/GLP", fuel_other: "Otro",
  trans_manual: "Manual", trans_automatic: "Automático", trans_cvt: "CVT", "trans_semi-automatic": "Semi-Auto",
  body_sedan: "Sedán", body_suv: "SUV", body_hatchback: "Hatchback", body_pickup: "Pickup",
  body_van: "Van", body_coupe: "Coupé", body_convertible: "Descapotable", body_wagon: "Familiar", body_other: "Otro",
  cond_new: "Nuevo", cond_used: "Usado", cond_certified: "Certificado",
  carStatus_available: "Disponible", carStatus_reserved: "Reservado", carStatus_sold: "Vendido", carStatus_in_repair: "En Reparación",
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const t = (key) => translations[key] || key;
  return (
    <LanguageContext.Provider value={{ t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}