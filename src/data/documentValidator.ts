// Validación centralizada de documentos de identidad peruanos.
// Único punto de verdad para DNI / RUC / Carnet de Extranjería, usado por
// App.tsx, ExpressView.tsx y (regla del id canónico) por el backend.

export type DocType = "DNI" | "RUC" | "CARNET_EXTRANJERIA" | "";

export const DOCUMENT_PATTERNS = {
  DNI: {
    pattern: /^[0-9]{8}$/,
    description: "Exactamente 8 caracteres numéricos.",
  },
  RUC: {
    pattern: /^(10|15|17|20)[0-9]{9}$/,
    description: "Exactamente 11 números. Comienza con 10, 15, 17 o 20.",
  },
  CARNET_EXTRANJERIA: {
    pattern: /^[a-zA-Z0-9]{9,12}$/,
    description: "Alfanumérico de 9 a 12 caracteres (formatos nuevos y legados).",
  },
} as const;

/** Limpia el input antes de validar: quita guiones, espacios y espacios de cortesía. */
export function normalizeDocument(value: string): string {
  return String(value || "").trim().replace(/[-\s]/g, "");
}

/** Valida un documento peruano según su tipo declarado. */
export function validatePeruvianDocument(type: string, value: string): boolean {
  if (!type || !value) return false;
  const clean = normalizeDocument(value);
  const config = DOCUMENT_PATTERNS[type.toUpperCase() as keyof typeof DOCUMENT_PATTERNS];
  if (!config) return false;
  return config.pattern.test(clean);
}

/** Detecta el tipo real del documento a partir del formato (sin depender del declarado). */
export function detectDocumentType(value: string): DocType {
  const clean = normalizeDocument(value);
  if (!clean) return "";
  if (DOCUMENT_PATTERNS.DNI.pattern.test(clean)) return "DNI";
  if (DOCUMENT_PATTERNS.RUC.pattern.test(clean)) return "RUC";
  if (DOCUMENT_PATTERNS.CARNET_EXTRANJERIA.pattern.test(clean)) return "CARNET_EXTRANJERIA";
  return "";
}

/**
 * ¿Puede este documento usarse como id del documento canónico "clientes/{id}"?
 *
 * Reglas:
 *  - DNI (8 dígitos) y RUC (11 dígitos) → sí.
 *  - Carnet de Extranjería → solo si contiene al menos una letra (formatos
 *    legados tipo "E45871239"). Un CE puramente numérico de 9-12 dígitos es
 *    INDISTINGUIBLE de un DNI mal tecleado (p. ej. "103453589") y NO se usa
 *    como id canónico, para no reintroducir duplicados — ese caso cae al id
 *    por teléfono y al dedupe por campo "dni".
 *  - Cualquier otro valor (DNI mal tecleado, texto libre) → false.
 */
export function canUseAsCanonicalDocId(value: string): boolean {
  const clean = normalizeDocument(value);
  if (!clean) return false;
  if (DOCUMENT_PATTERNS.DNI.pattern.test(clean)) return true;
  if (DOCUMENT_PATTERNS.RUC.pattern.test(clean)) return true;
  return /^[a-zA-Z0-9]{9,12}$/.test(clean) && /[a-zA-Z]/.test(clean);
}