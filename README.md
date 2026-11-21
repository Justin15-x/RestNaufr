# El Náufrago - Sistema de Administración de Restaurante

PWA desarrollada con React + Vite + Tailwind CSS + Supabase para la gestión completa de un restaurante.

## 🚀 Características

- **Multi-rol**: Mesero, Cocina, Barra, Administrador
- **Tiempo real**: Supabase Realtime para sincronización instantánea
- **PWA**: Instalable, funciona offline, service worker
- **Responsive**: Optimizada para móvil, tablet y desktop
- **Arquitectura modular**: Context, Hooks, Services, Components, Pages

## 📋 Requisitos Previos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com)

## ⚙️ Configuración Inicial

### 1. Clonar e instalar dependencias

```bash
cd Rest-Naufr
npm install
```

### 2. Configurar variables de entorno

Copiar `.env.example` a `.env` y completar con tus credenciales de Supabase:

```bash
cp .env.example .env
```

Editar `.env`:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### 3. Configurar Base de Datos en Supabase

#### A. Ejecutar schema SQL
1. Ve a **SQL Editor** en el dashboard de Supabase
2. Copia y ejecuta el contenido de `schema.sql`
3. Esto creará todas las tablas, índices, triggers, RLS policies y datos de ejemplo

#### B. Habilitar Realtime
En **Database → Replication**, habilita realtime para estas tablas:
- `ordenes`
- `orden_items`
- `mesas`
- `productos`

O ejecuta en SQL Editor:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE ordenes;
ALTER PUBLICATION supabase_realtime ADD TABLE orden_items;
ALTER PUBLICATION supabase_realtime ADD TABLE mesas;
ALTER PUBLICATION supabase_realtime ADD TABLE productos;
```

#### C. Crear usuarios de prueba
En **Authentication → Users**, crea estos usuarios (o usa el registro desde la app):

| Email | Contraseña | Rol |
|-------|------------|-----|
| mesero@naufrago.com | mesero123 | mesero |
| cocina@naufrago.com | cocina123 | cocina |
| barrnaufragoa@naufrago.com | barra123 | barra |
| admin@nauf.com | admin123 | admin |

**Nota**: Después de crear cada usuario en Auth, ve a **Table Editor → profiles** y asigna el `role_id` correspondiente consultando la tabla `roles`.

#### D. Configurar proveedores de auth (opcional)
En **Authentication → Providers**, habilita "Email" si no está habilitado.

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

Abre http://localhost:5173

### 5. Build de producción

```bash
npm run build
```

Los archivos se generan en `dist/`. Para probar el build:
```bash
npm run preview
```

## 📱 Instalación como PWA

1. Abre la app en Chrome/Edge (desktop o móvil)
2. Click en el icono de instalar en la barra de direcciones
3. O usa el menú del navegador → "Instalar El Náufrago"

## 🏗️ Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── ui/              # Componentes base (Modal, Toast, Loading)
│   ├── Navbar.jsx       # Navegación principal
│   ├── ProtectedRoute.jsx # Rutas protegidas por rol
│   ├── MesaCard.jsx     # Tarjetas de mesas
│   └── ProductoCard.jsx # Tarjetas de productos
├── context/
│   └── AuthContext.jsx  # Contexto de autenticación y roles
├── hooks/               # Custom hooks para lógica de negocio
│   ├── useMesas.js
│   ├── useProductos.js
│   └── useOrdenes.js
├── pages/               # Vistas principales
│   ├── Login.jsx
│   ├── WaiterDashboard.jsx    # Vista Mesero
│   ├── KitchenDashboard.jsx   # Vista Cocina
│   ├── BarDashboard.jsx       # Vista Barra
│   └── AdminDashboard.jsx     # Vista Admin
├── services/            # Funciones de API Supabase
│   ├── mesas.js
│   ├── productos.js
│   └── ordenes.js
├── config/
│   └── supabase.js      # Cliente Supabase
├── styles/
│   └── index.css        # Estilos globales + Tailwind
├── App.jsx              # Rutas principales
└── main.jsx             # Punto de entrada
```

## 🎨 Roles y Permisos

| Funcionalidad | Mesero | Cocina | Barra | Admin |
|--------------|--------|--------|-------|-------|
| Ver mesas | ✅ | ❌ | ❌ | ✅ |
| Crear comandas | ✅ | ❌ | ❌ | ✅ |
| Ver pedidos comida | ❌ | ✅ | ❌ | ✅ |
| Actualizar estado comida | ❌ | ✅ | ❌ | ✅ |
| Ver pedidos bebida | ❌ | ❌ | ✅ | ✅ |
| Actualizar estado bebida | ❌ | ❌ | ✅ | ✅ |
| Gestión mesas | ❌ | ❌ | ❌ | ✅ |
| Gestión productos | ❌ | ❌ | ❌ | ✅ |
| Ver estadísticas | ❌ | ❌ | ❌ | ✅ |
| Ver todas las órdenes | ❌ | ❌ | ❌ | ✅ |

## 🔐 Row Level Security (RLS)

Todas las tablas tienen RLS habilitado con políticas estrictas:
- **Meseros**: Solo ven/crean sus propias órdenes y mesas
- **Cocina**: Solo ven items de categoría 'comida'
- **Barra**: Solo ven items de categoría 'bebida'
- **Admin**: Acceso completo a todo

## 📦 Scripts Disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run preview  # Preview del build
```

## 🐛 Troubleshooting

### Error: "Missing Supabase environment variables"
- Verifica que `.env` existe y tiene las variables correctas
- Reinicia el servidor de desarrollo tras cambiar `.env`

### Error de conexión a Supabase
- Verifica que la URL y ANON_KEY son correctas
- Comprueba que el proyecto Supabase está activo (no pausado)

### Realtime no funciona
- Verifica que las tablas están en la publicación `supabase_realtime`
- Comprueba que las políticas RLS permiten SELECT en las tablas

### Build falla con errores de Tailwind
- Asegúrate de que `content` en `tailwind.config.js` apunta a `./src/**/*.{js,jsx}`

## 📄 Licencia

Proyecto privado - El Náufrago