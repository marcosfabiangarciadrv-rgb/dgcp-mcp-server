# Conector MCP — DGCP (Compras y Contrataciones Públicas, RD)

Este es un servidor MCP (Model Context Protocol) remoto que conecta a Claude con la
**API pública y sin autenticación** de la Dirección General de Contrataciones Públicas
(datosabiertos.dgcp.gob.do). Permite que tu proyecto "Experto en Compras y Contrataciones"
consulte en vivo procesos de compra, contratos, ofertas, proveedores, el PACC, el catálogo
de bienes/servicios y los releases en formato OCDS.

**Importante:** la API de la DGCP es de solo lectura (no existen endpoints para enviar
ofertas ni ejecutar acciones). Este conector, por lo tanto, permite *consultar y responder
preguntas* con datos reales y actualizados, pero no puede "ejecutar solicitudes" dentro del
portal transaccional (eso requiere autenticarse como proveedor en comunidad.comprasdominicana.gob.do,
algo que la DGCP no expone como API pública).

## Herramientas incluidas

- `buscar_procesos` — busca procesos de compra por código, unidad de compra, modalidad, estado, fechas, MIPYME
- `obtener_articulos_proceso`, `obtener_documentos_proceso`, `buscar_procesos_agrupados`
- `buscar_contratos`, `obtener_articulos_contrato`
- `buscar_ofertas`
- `buscar_proveedores`, `obtener_rubro_proveedor`
- `buscar_pacc`, `buscar_pacc_adquisiciones`
- `obtener_release_ocds` (por OCID), `buscar_releases_ocds`
- `buscar_catalogo` (UNSPSC), `buscar_unidades_compra`

## 1. Probar localmente (opcional)

```bash
npm install
npm start
```

El servidor queda escuchando en `http://localhost:3000`, con el endpoint MCP en `POST /mcp`.

## 2. Desplegarlo para que tenga una URL pública

Claude se conecta a conectores remotos desde la nube de Anthropic, así que el servidor debe
estar accesible públicamente por HTTPS. La forma más simple es usar un servicio gratuito
tipo **Render**:

1. Sube esta carpeta a un repositorio de GitHub (puede ser privado).
2. Entra a https://render.com → **New +** → **Web Service** → conecta el repositorio.
3. Configuración:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
4. Despliega. Render te da una URL pública, ej. `https://dgcp-mcp-server.onrender.com`.
5. Tu endpoint MCP completo será: `https://dgcp-mcp-server.onrender.com/mcp`

(Alternativas equivalentes: Railway, Fly.io, o un VPS propio con PM2/Docker detrás de HTTPS.)

## 3. Conectarlo en Claude

1. En claude.ai, ve a **Settings → Connectors → Add custom connector**.
2. Pega la URL del paso anterior terminada en `/mcp` (ej. `https://dgcp-mcp-server.onrender.com/mcp`).
3. Dale un nombre, por ejemplo "DGCP — Compras Públicas RD".
4. Guarda. No requiere autenticación (la API de la DGCP es pública).
5. Entra a tu proyecto **Experto en Compras y Contrataciones** → **Project settings** →
   habilita este conector para el proyecto (o actívalo en la conversación desde el menú de herramientas).

A partir de ahí, Claude podrá invocar estas herramientas dentro del proyecto para responder
con datos en vivo de procesos, contratos, proveedores, etc.

## Notas técnicas

- El servidor usa el SDK oficial `@modelcontextprotocol/sdk` (v1.29.0) en modo *stateless*
  con transporte Streamable HTTP — no requiere gestión de sesiones ni base de datos.
- Las versiones de `zod` (^4.4.3) y del SDK están fijadas porque el compat-layer de zod v3/v4
  del SDK 1.29.0 requiere zod 4.
- Documentación Swagger original de la API: https://datosabiertos.dgcp.gob.do/api-dgcp/docs/index.html
