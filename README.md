# Nexor - Sistema de Gestion

Sistema de gestion integral para taller mecanico. Manejo de ordenes de servicio, inventario, ventas, caja, proveedores y mas.

## Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Express.js + Node.js
- **Base de datos:** PostgreSQL
- **Auth:** JWT + bcrypt

## Requisitos

- Node.js 18+
- PostgreSQL 14+

## Instalacion

```bash
# Instalar dependencias (server + client)
npm run install:all

# Copiar variables de entorno
cp .env.example .env
# Editar .env con los datos de tu base de datos
```

## Variables de entorno

| Variable | Descripcion |
|---|---|
| `DATABASE_URL` | URL de conexion a PostgreSQL |
| `JWT_SECRET` | Clave secreta para tokens JWT |
| `PORT` | Puerto del servidor (default: 3001) |

## Ejecucion

```bash
# Desarrollo (server + client concurrentes)
npm run dev

# Produccion
npm run build
npm start
```

## Estructura del proyecto

```
├── server/
│   ├── index.js            # Entry point, Express config
│   ├── db.js               # Pool de conexion PostgreSQL
│   ├── middleware/auth.js   # Middleware JWT
│   ├── routes/
│   │   ├── auth.js         # Login, registro, perfil
│   │   ├── entity.js       # CRUD generico para todas las entidades
│   │   ├── stock.js        # Movimientos de stock atomicos
│   │   └── sequence.js     # Generador de numeros secuenciales
│   └── migrations/
│       └── 001_initial.sql # Schema completo
├── client/
│   └── src/
│       ├── pages/          # Paginas de la app
│       ├── components/     # Componentes reutilizables
│       ├── entities/       # Clases de acceso a datos (API)
│       └── Layout.jsx      # Layout principal con sidebar
```

## Modulos

| Modulo | Descripcion |
|---|---|
| **Tablero del Taller** | Vista kanban de ordenes activas (pendiente/en proceso/listo) |
| **Ordenes de Servicio** | Gestion completa de ordenes con inspeccion de ingreso y salida |
| **Punto de Venta** | POS rapido con lector de codigo de barras |
| **Ventas** | Historial de ventas con detalle y estados |
| **Productos** | Inventario con stock, precios, categorias y descuentos por volumen |
| **Movimientos de Stock** | Registro de entradas, salidas y ajustes de inventario |
| **Caja** | Apertura/cierre de caja, movimientos manuales, doble moneda (UYU/USD) |
| **Proveedores** | Gestion de proveedores |
| **Ordenes de Compra** | Compras a proveedores con seguimiento |
| **Remitos** | Generacion de remitos vinculados a ordenes |
| **Agenda** | Turnos y citas del taller |
| **Vehiculos** | Registro de vehiculos |
| **Categorias** | Categorias de productos |
| **Tipos de Servicio** | Configuracion de servicios ofrecidos |
| **Metodos de Pago** | Configuracion de formas de pago |
| **Usuarios** | Gestion de usuarios y roles (admin/user) |
| **Dashboard** | Metricas y graficos del negocio |
| **Reportes** | Reportes detallados de ventas y rendimiento |

## Roles

- **admin**: Acceso completo, gestion de usuarios, eliminacion de registros
- **user**: Acceso operativo (crear ordenes, ventas, caja)

## Deploy

El proyecto esta configurado para Railway. El script `npm run build` compila el frontend y `npm start` levanta el servidor que sirve tanto la API como los archivos estaticos.
