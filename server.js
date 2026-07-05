// Conector MCP remoto — API pública de la DGCP (Dirección General de Contrataciones Públicas, RD)
//
// Expone como "tools" de MCP los endpoints públicos y sin autenticación de:
//   https://datosabiertos.dgcp.gob.do/api-dgcp/v1/
//
// Documentación Swagger original:
//   https://datosabiertos.dgcp.gob.do/api-dgcp/docs/index.html
//
// Este servidor es SOLO LECTURA: la API de la DGCP no expone endpoints para
// crear/enviar ofertas ni ejecutar acciones — solo consulta de datos públicos
// de procesos, contratos, ofertas, proveedores, PACC, catálogo y releases OCDS.

import express from "express";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const API_BASE = "https://datosabiertos.dgcp.gob.do/api-dgcp/v1";

// ---- Helper: llama a la API DGCP y devuelve el JSON crudo como texto ----
async function callDgcp(path, params = {}) {
  const url = new URL(API_BASE + path);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`DGCP API respondió ${res.status} para ${url}: ${text.slice(0, 500)}`);
  }
  return text;
}

function textResult(data) {
  return { content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] };
}

function buildServer() {
  const server = new McpServer({ name: "dgcp-compras-publicas", version: "1.0.0" });

  // ---------------- Procesos de compra ----------------
  server.registerTool(
    "buscar_procesos",
    {
      title: "Buscar procesos de compras públicas",
      description:
        "Busca procesos de compras/licitaciones publicados en el Sistema Electrónico de Contrataciones Públicas (SECP). " +
        "Permite filtrar por código de proceso, unidad de compra, modalidad, estado, si está dirigido a MIPYMEs, y rango de fechas de publicación.",
      inputSchema: {
        proceso: z.string().optional().describe("Código exacto del proceso, ej. 'EDESUR-CCC-LPN-2026-0011'"),
        unidad_compra: z.number().int().optional().describe("Código numérico de la unidad de compra (institución)"),
        modalidad: z.string().optional().describe("Modalidad del proceso, ej. 'Licitación Pública Nacional', 'Comparación de Precios'"),
        estado: z.string().optional().describe("Estado del proceso, ej. 'Proceso publicado', 'Adjudicado', 'Cancelado'"),
        mipyme: z.boolean().optional().describe("true para filtrar solo procesos dirigidos a MIPYMEs"),
        mipyme_mujer: z.boolean().optional().describe("true para filtrar solo procesos dirigidos a MIPYMEs de mujeres"),
        startdate: z.string().optional().describe("Fecha inicial de publicación (formato ISO, ej. 2026-01-01)"),
        enddate: z.string().optional().describe("Fecha final de publicación (formato ISO)"),
        page: z.number().int().optional().describe("Número de página (por defecto 1)"),
        limit: z.number().int().optional().describe("Cantidad de registros por página (por defecto 10)"),
      },
    },
    async (args) => textResult(await callDgcp("/procesos", args))
  );

  server.registerTool(
    "obtener_articulos_proceso",
    {
      title: "Obtener artículos de un proceso",
      description: "Lista los artículos/ítems solicitados dentro de un proceso de compra específico.",
      inputSchema: {
        proceso: z.string().describe("Código del proceso, ej. 'EDESUR-CCC-LPN-2026-0011'"),
        page: z.number().int().optional(),
        limit: z.number().int().optional(),
      },
    },
    async (args) => textResult(await callDgcp("/procesos/articulos", args))
  );

  server.registerTool(
    "obtener_documentos_proceso",
    {
      title: "Obtener documentos de un proceso",
      description: "Lista los documentos publicados (pliegos, enmiendas, actas, etc.) de un proceso de compra.",
      inputSchema: {
        proceso: z.string().describe("Código del proceso"),
        page: z.number().int().optional(),
        limit: z.number().int().optional(),
      },
    },
    async (args) => textResult(await callDgcp("/procesos/documentos", args))
  );

  server.registerTool(
    "buscar_procesos_agrupados",
    {
      title: "Procesos agrupados",
      description: "Obtiene procesos agrupados por modalidad, tipo de excepción, unidad de compra, título y descripción (útil para estadísticas y resúmenes).",
      inputSchema: {
        page: z.number().int().optional(),
        limit: z.number().int().optional(),
      },
    },
    async (args) => textResult(await callDgcp("/procesos/agrupados", args))
  );

  // ---------------- Contratos ----------------
  server.registerTool(
    "buscar_contratos",
    {
      title: "Buscar contratos",
      description: "Busca contratos adjudicados. Permite filtrar por proveedor (RPE), proceso, unidad de compra o código de contrato.",
      inputSchema: {
        rpe: z.number().int().optional().describe("Número de Registro de Proveedor del Estado"),
        proceso: z.string().optional().describe("Código del proceso asociado"),
        unidad_compra: z.number().int().optional(),
        contrato: z.string().optional().describe("Código del contrato"),
        page: z.number().int().optional(),
        limit: z.number().int().optional(),
      },
    },
    async (args) => textResult(await callDgcp("/contratos", args))
  );

  server.registerTool(
    "obtener_articulos_contrato",
    {
      title: "Artículos contratados",
      description: "Obtiene el registro de artículos/ítems contratados.",
      inputSchema: {
        page: z.number().int().optional(),
        limit: z.number().int().optional(),
      },
    },
    async (args) => textResult(await callDgcp("/contratos/articulos", args))
  );

  // ---------------- Ofertas ----------------
  server.registerTool(
    "buscar_ofertas",
    {
      title: "Buscar ofertas",
      description: "Obtiene el registro de ofertas presentadas en los procesos de compra.",
      inputSchema: {
        page: z.number().int().optional(),
        limit: z.number().int().optional(),
      },
    },
    async (args) => textResult(await callDgcp("/ofertas", args))
  );

  // ---------------- Proveedores ----------------
  server.registerTool(
    "buscar_proveedores",
    {
      title: "Buscar proveedores del Estado",
      description: "Busca en el Registro de Proveedores del Estado (RPE) por número de RPE, número de documento (RNC/Cédula), estado, país, región, provincia o municipio.",
      inputSchema: {
        rpe: z.number().int().optional().describe("Número de Registro de Proveedor del Estado"),
        numero_documento: z.string().optional().describe("RNC o cédula del proveedor"),
        estado: z.string().optional().describe("Estado del registro, ej. 'Activo', 'Inactivo'"),
        pais: z.string().optional(),
        region: z.string().optional(),
        provincia: z.string().optional(),
        municipio: z.string().optional(),
        page: z.number().int().optional(),
        limit: z.number().int().optional(),
      },
    },
    async (args) => textResult(await callDgcp("/proveedores", args))
  );

  server.registerTool(
    "obtener_rubro_proveedor",
    {
      title: "Rubro de un proveedor",
      description: "Obtiene el/los rubro(s) o actividad comercial de un proveedor específico.",
      inputSchema: {
        page: z.number().int().optional(),
        limit: z.number().int().optional(),
      },
    },
    async (args) => textResult(await callDgcp("/proveedores/rubro", args))
  );

  // ---------------- PACC (Plan Anual de Compras y Contrataciones) ----------------
  server.registerTool(
    "buscar_pacc",
    {
      title: "Buscar registros del PACC",
      description: "Consulta el Plan Anual de Compras y Contrataciones (PACC) de las instituciones públicas.",
      inputSchema: {
        page: z.number().int().optional(),
        limit: z.number().int().optional(),
      },
    },
    async (args) => textResult(await callDgcp("/pacc", args))
  );

  server.registerTool(
    "buscar_pacc_adquisiciones",
    {
      title: "Adquisiciones del PACC",
      description: "Obtiene el registro de adquisiciones planificadas dentro del PACC.",
      inputSchema: {
        page: z.number().int().optional(),
        limit: z.number().int().optional(),
      },
    },
    async (args) => textResult(await callDgcp("/pacc/adquisiciones", args))
  );

  // ---------------- OCDS (Open Contracting Data Standard) ----------------
  server.registerTool(
    "obtener_release_ocds",
    {
      title: "Obtener release OCDS por OCID",
      description:
        "Obtiene el 'release' completo en formato OCDS (Open Contracting Data Standard) de un proceso de compra, " +
        "a partir de su identificador único OCID (ej. 'ocds-6550wx-...'). Incluye planeación, licitación, adjudicación y contrato en un solo objeto estándar.",
      inputSchema: {
        ocid: z.string().describe("OCID del proceso, ej. 'ocds-6550wx-EDESUR-CCC-LPN-2026-0011'"),
      },
    },
    async (args) => textResult(await callDgcp("/ocds/releases", args))
  );

  server.registerTool(
    "buscar_releases_ocds",
    {
      title: "Buscar releases OCDS",
      description: "Lista releases OCDS de todos los procesos, filtrando por rango de fechas, año o unidad de compra.",
      inputSchema: {
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        year: z.number().int().optional(),
        uc: z.number().int().optional().describe("Código de unidad de compra"),
        page: z.number().int().optional(),
        limit: z.number().int().optional(),
      },
    },
    async (args) => textResult(await callDgcp("/ocds/releases/all", args))
  );

  // ---------------- Catálogo y unidades de compra ----------------
  server.registerTool(
    "buscar_catalogo",
    {
      title: "Buscar en el catálogo de bienes y servicios (UNSPSC)",
      description: "Busca en el catálogo de bienes y servicios (clasificación UNSPSC) por segmento, familia o clase.",
      inputSchema: {
        segmento: z.string().optional(),
        familia: z.string().optional(),
        clase: z.string().optional(),
        page: z.number().int().optional(),
        limit: z.number().int().optional(),
      },
    },
    async (args) => textResult(await callDgcp("/catalogo", args))
  );

  server.registerTool(
    "buscar_unidades_compra",
    {
      title: "Buscar unidades de compra (instituciones)",
      description: "Busca instituciones públicas registradas como unidades de compra en el sistema, por código.",
      inputSchema: {
        codigo_unidad_compra: z.number().int().optional(),
        page: z.number().int().optional(),
        limit: z.number().int().optional(),
      },
    },
    async (args) => textResult(await callDgcp("/unidades_compra", args))
  );

  return server;
}

// ---------------- Servidor HTTP (modo stateless, apto para despliegue serverless) ----------------
const app = express();
app.use(express.json());

app.post("/mcp", async (req, res) => {
  try {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("Error manejando solicitud MCP:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Error interno del servidor" },
        id: null,
      });
    }
  }
});

// GET/DELETE no son necesarios en modo stateless, pero respondemos 405 explícito
app.get("/mcp", (_req, res) => res.status(405).send("Método no soportado en modo stateless."));
app.delete("/mcp", (_req, res) => res.status(405).send("Método no soportado en modo stateless."));

app.get("/", (_req, res) => {
  res.send("Conector MCP de la DGCP (Compras Públicas RD) activo. Endpoint MCP: POST /mcp");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor MCP de la DGCP escuchando en el puerto ${PORT}`);
});
