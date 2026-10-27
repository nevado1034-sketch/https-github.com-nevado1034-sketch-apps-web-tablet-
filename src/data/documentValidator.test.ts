import { describe, it, expect } from "vitest";
import {
  normalizeDocument,
  validatePeruvianDocument,
  detectDocumentType,
  canUseAsCanonicalDocId
} from "./documentValidator";

describe("normalizeDocument", () => {
  it("quita espacios y guiones", () => {
    expect(normalizeDocument(" 12-345 678 ")).toBe("12345678");
    expect(normalizeDocument("1 0 3 4 5")).toBe("10345");
  });

  it("maneja valores vacíos o nulos", () => {
    expect(normalizeDocument("")).toBe("");
    expect(normalizeDocument(undefined as unknown as string)).toBe("");
  });
});

describe("validatePeruvianDocument", () => {
  it("acepta un DNI válido de 8 dígitos", () => {
    expect(validatePeruvianDocument("DNI", "12345678")).toBe(true);
  });

  it("rechaza un DNI con letras o longitud incorrecta", () => {
    expect(validatePeruvianDocument("DNI", "1234567")).toBe(false);
    expect(validatePeruvianDocument("DNI", "123456789")).toBe(false);
    expect(validatePeruvianDocument("DNI", "1234567a")).toBe(false);
  });

  it("acepta un RUC que empieza con 10, 15, 17 o 20", () => {
    expect(validatePeruvianDocument("RUC", "10123456789")).toBe(true);
    expect(validatePeruvianDocument("RUC", "20123456789")).toBe(true);
  });

  it("rechaza un RUC con prefijo inválido", () => {
    expect(validatePeruvianDocument("RUC", "30123456789")).toBe(false);
  });

  it("rechaza tipo o valor vacío", () => {
    expect(validatePeruvianDocument("", "12345678")).toBe(false);
    expect(validatePeruvianDocument("DNI", "")).toBe(false);
  });
});

describe("detectDocumentType", () => {
  it("detecta DNI de 8 dígitos", () => {
    expect(detectDocumentType("12345678")).toBe("DNI");
  });

  it("detecta RUC de 11 dígitos con prefijo válido", () => {
    expect(detectDocumentType("20123456789")).toBe("RUC");
  });

  it("detecta carnet de extranjería con letras", () => {
    expect(detectDocumentType("E45871239")).toBe("CARNET_EXTRANJERIA");
  });

  it("devuelve vacío para texto libre corto o vacío", () => {
    expect(detectDocumentType("abc")).toBe("");
    expect(detectDocumentType("")).toBe("");
  });

  it("trata alfanuméricos de 9-12 caracteres como carnet de extranjería (comportamiento actual)", () => {
    expect(detectDocumentType("sindocumento")).toBe("CARNET_EXTRANJERIA");
  });
});

describe("canUseAsCanonicalDocId", () => {
  it("acepta DNI y RUC como id canónico", () => {
    expect(canUseAsCanonicalDocId("12345678")).toBe(true);
    expect(canUseAsCanonicalDocId("20123456789")).toBe(true);
  });

  it("acepta CE con al menos una letra", () => {
    expect(canUseAsCanonicalDocId("E45871239")).toBe(true);
    expect(canUseAsCanonicalDocId("pe1234567")).toBe(true);
  });

  it("rechaza un CE puramente numérico (indistinguible de DNI mal tecleado)", () => {
    expect(canUseAsCanonicalDocId("103453589")).toBe(false);
  });

  it("rechaza valores vacíos o texto libre", () => {
    expect(canUseAsCanonicalDocId("")).toBe(false);
    expect(canUseAsCanonicalDocId("abc")).toBe(false);
  });
});
