-- ============================================================================
-- ESQUEMA DE BASE DE DATOS PARA "EL NÁUFRAGO" - RESTAURANTE
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (name, description) VALUES
    ('mesero', 'Personal de atención a mesas - toma comandas'),
    ('cocina', 'Personal de cocina - gestiona órdenes de comida'),
    ('barra', 'Personal de barra - gestiona órdenes de bebidas'),
    ('admin', 'Administrador - acceso completo al sistema');

-- Profiles
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id),
    full_name VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Mesas (Sin ubicación ni capacidad)
CREATE TABLE mesas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero INTEGER UNIQUE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'libre' CHECK (estado IN ('libre', 'ocupada', 'reservada', 'mantenimiento')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_mesas_updated_at
    BEFORE UPDATE ON mesas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Categorías
CREATE TABLE categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL, -- 'comida', 'bebida'
    orden INTEGER DEFAULT 0,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categorias (nombre, slug, orden) VALUES
    ('Comidas', 'comida', 1),
    ('Bebidas', 'bebida', 2);

-- Productos (Sin imagen_url ni tiempo_preparacion)
CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    categoria_id UUID NOT NULL REFERENCES categorias(id),
    nombre VARCHAR(100) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL CHECK (precio >= 0),
    disponible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_productos_updated_at
    BEFORE UPDATE ON productos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_disponible ON productos(disponible);

-- Órdenes
CREATE TABLE ordenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mesa_id UUID NOT NULL REFERENCES mesas(id),
    mesero_id UUID NOT NULL REFERENCES profiles(id),
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_preparacion', 'lista', 'entregada', 'cancelada', 'pagada')),
    total DECIMAL(10, 2) DEFAULT 0,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TRIGGER update_ordenes_updated_at
    BEFORE UPDATE ON ordenes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_ordenes_mesa ON ordenes(mesa_id);
CREATE INDEX idx_ordenes_mesero ON ordenes(mesero_id);
CREATE INDEX idx_ordenes_estado ON ordenes(estado);
CREATE INDEX idx_ordenes_created_at ON ordenes(created_at DESC);

-- Orden Items
CREATE TABLE orden_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orden_id UUID NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id),
    cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    precio_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_preparacion', 'lista', 'entregada', 'cancelada')),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_orden_items_updated_at
    BEFORE UPDATE ON orden_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_orden_items_orden ON orden_items(orden_id);
CREATE INDEX idx_orden_items_producto ON orden_items(producto_id);
CREATE INDEX idx_orden_items_estado ON orden_items(estado);

-- Triggers de negocio para totales y estados
CREATE OR REPLACE FUNCTION update_orden_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ordenes
    SET total = (
        SELECT COALESCE(SUM(subtotal), 0)
        FROM orden_items
        WHERE orden_id = NEW.orden_id
    ),
    updated_at = NOW()
    WHERE id = NEW.orden_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_orden_total
    AFTER INSERT OR UPDATE OR DELETE ON orden_items
    FOR EACH ROW
    EXECUTE FUNCTION update_orden_total();

CREATE OR REPLACE FUNCTION update_orden_estado_from_items()
RETURNS TRIGGER AS $$
DECLARE
    v_pendiente INT;
    v_en_preparacion INT;
    v_lista INT;
    v_entregada INT;
    v_cancelada INT;
    v_total_items INT;
BEGIN
    SELECT
        COUNT(*) FILTER (WHERE estado = 'pendiente'),
        COUNT(*) FILTER (WHERE estado = 'en_preparacion'),
        COUNT(*) FILTER (WHERE estado = 'lista'),
        COUNT(*) FILTER (WHERE estado = 'entregada'),
        COUNT(*) FILTER (WHERE estado = 'cancelada'),
        COUNT(*)
    INTO v_pendiente, v_en_preparacion, v_lista, v_entregada, v_cancelada, v_total_items
    FROM orden_items
    WHERE orden_id = NEW.orden_id;

    IF v_total_items = 0 THEN RETURN NEW; END IF;

    IF v_entregada = v_total_items THEN
        UPDATE ordenes SET estado = 'entregada', updated_at = NOW(), completed_at = NOW() WHERE id = NEW.orden_id;
    ELSIF v_cancelada = v_total_items THEN
        UPDATE ordenes SET estado = 'cancelada', updated_at = NOW() WHERE id = NEW.orden_id;
    ELSIF v_en_preparacion > 0 THEN
        UPDATE ordenes SET estado = 'en_preparacion', updated_at = NOW() WHERE id = NEW.orden_id;
    ELSIF v_lista + v_entregada = v_total_items - v_cancelada AND v_lista > 0 THEN
        UPDATE ordenes SET estado = 'lista', updated_at = NOW() WHERE id = NEW.orden_id;
    ELSIF v_pendiente > 0 THEN
        UPDATE ordenes SET estado = 'pendiente', updated_at = NOW() WHERE id = NEW.orden_id;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_orden_estado
    AFTER UPDATE ON orden_items
    FOR EACH ROW
    WHEN (OLD.estado IS DISTINCT FROM NEW.estado)
    EXECUTE FUNCTION update_orden_estado_from_items();

-- RLS y Políticas
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orden_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_select_authenticated" ON roles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'admin'));
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id AND role_id = (SELECT role_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "profiles_all_admin" ON profiles FOR ALL USING (EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'admin'));

CREATE POLICY "mesas_select_authenticated" ON mesas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "mesas_update_mesero_admin" ON mesas FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('mesero', 'admin')));
CREATE POLICY "mesas_write_admin" ON mesas FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'admin'));
CREATE POLICY "mesas_delete_admin" ON mesas FOR DELETE USING (EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'admin'));

CREATE POLICY "categorias_select_authenticated" ON categorias FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "categorias_write_admin" ON categorias FOR ALL USING (EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'admin'));

CREATE POLICY "productos_select_available" ON productos FOR SELECT USING (disponible = true OR auth.role() = 'authenticated');
CREATE POLICY "productos_select_mesero" ON productos FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('mesero', 'admin')));
CREATE POLICY "productos_write_admin" ON productos FOR ALL USING (EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'admin'));

CREATE POLICY "ordenes_select_mesero" ON ordenes FOR SELECT USING (mesero_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('admin', 'cocina', 'barra')));
CREATE POLICY "ordenes_insert_mesero" ON ordenes FOR INSERT WITH CHECK (mesero_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'mesero'));
CREATE POLICY "ordenes_update_mesero_admin" ON ordenes FOR UPDATE USING (mesero_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'admin'));

CREATE POLICY "orden_items_select" ON orden_items FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM ordenes o
        LEFT JOIN productos pr ON orden_items.producto_id = pr.id
        LEFT JOIN categorias c ON pr.categoria_id = c.id
        WHERE o.id = orden_items.orden_id
        AND (
            o.mesero_id = auth.uid() OR
            EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'admin') OR
            (c.slug = 'comida' AND EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'cocina')) OR
            (c.slug = 'bebida' AND EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'barra'))
        )
    )
);

CREATE POLICY "orden_items_insert_mesero" ON orden_items FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM ordenes o
        WHERE o.id = orden_id AND o.mesero_id = auth.uid()
        AND EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'mesero')
    )
);

CREATE POLICY "orden_items_update_cocina_barra" ON orden_items FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM ordenes o
        LEFT JOIN productos pr ON orden_items.producto_id = pr.id
        LEFT JOIN categorias c ON pr.categoria_id = c.id
        WHERE o.id = orden_items.orden_id
        AND (
            EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'admin') OR
            (c.slug = 'comida' AND EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'cocina')) OR
            (c.slug = 'bebida' AND EXISTS (SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'barra'))
        )
    )
) WITH CHECK (estado IN ('pendiente', 'en_preparacion', 'lista', 'entregada', 'cancelada'));

-- Datos de ejemplo - Mesas (Simplificadas)
INSERT INTO mesas (numero, estado) VALUES
    (1, 'libre'),
    (2, 'libre'),
    (3, 'libre'),
    (4, 'libre'),
    (5, 'libre'),
    (6, 'libre'),
    (7, 'libre'),
    (8, 'mantenimiento');

-- Datos de ejemplo - Productos Comida (Sin tiempo de preparación ni imágenes)
INSERT INTO productos (categoria_id, nombre, precio, disponible)
SELECT id, 'tostada ceviche de Pescado', 49, true FROM categorias WHERE slug = 'comida'
UNION ALL SELECT id, 'Tiradito de Pulpo', 22.00, true FROM categorias WHERE slug = 'comida';

-- Datos de ejemplo - Productos Bebida
INSERT INTO productos (categoria_id, nombre, precio, disponible)
SELECT id, 'Pisco Sour', 12.00, true FROM categorias WHERE slug = 'bebida'
UNION ALL SELECT id, 'Chilcano', 10.00, true FROM categorias WHERE slug = 'bebida';