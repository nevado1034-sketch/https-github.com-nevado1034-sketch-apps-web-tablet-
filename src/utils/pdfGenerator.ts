import { RepairItem, RepairStatus } from "../types";

export function generateRepairPdf(repair: RepairItem) {
  // Generate friendly names
  const branchNames: Record<string, string> = {
    lince_arenales: "Arenales (Lince)",
    surco: "Surco",
    san_borja: "San Borja",
    lince_leal: "José Leal (Lince)"
  };

  const serviceNames: Record<string, string> = {
    mantenimiento: "Mantenimiento General",
    diagnostico: "Diagnóstico Especializado",
    garantia: "Servicio de Garantía",
    cambio: "Cambio de Componentes"
  };

  const vehicleNames: Record<string, string> = {
    scooter: "Scooter Eléctrico",
    moto: "Moto Eléctrica",
    bici: "Bicicleta Eléctrica",
    otro: "Vehículo Eléctrico Especial"
  };

  const statusLabels: Record<RepairStatus, string> = {
    receptioned: "Ingresado (En Cola)",
    diagnosing: "En Diagnóstico",
    waiting_parts: "Esperando Repuestos",
    repairing: "En Reparación",
    testing: "En Pruebas de Calidad",
    ready: "Listo para Entrega",
    delivered: "Entregado (Servicio Completado)"
  };

  const ticketNumber = `LE-${repair.id.slice(0, 8).toUpperCase()}`;
  const formattedDate = new Date(repair.receptionDate).toLocaleString("es-PE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  // Calculate costs safely
  const estCost = repair.estimatedCost || 0;
  const advPayment = repair.payment?.advancePayment || 0;
  const remBalance = repair.payment?.remainingBalance ?? Math.max(0, estCost - advPayment);
  const finCost = repair.actualCost || estCost;

  // Open printing window
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Por favor habilita las ventanas emergentes (Pop-ups) para generar el PDF de conformidad.");
    return;
  }

  // Build the print layout document
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Orden de Servicio ${ticketNumber} - Litio Energy</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Inter', sans-serif;
          color: #1e293b;
          background-color: #ffffff;
          line-height: 1.4;
          font-size: 11px;
          padding: 30px;
        }

        @media print {
          body {
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-before: always;
          }
        }

        .header-bar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }

        .logo-container h1 {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.5px;
        }

        .logo-container p {
          font-size: 9px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 1px;
          margin-top: 2px;
        }

        .document-title {
          text-align: right;
        }

        .document-title h2 {
          font-size: 14px;
          font-weight: 700;
          color: #0284c7;
        }

        .document-title .ticket-no {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          font-family: monospace;
          margin-top: 2px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }

        .info-card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px;
          background-color: #f8fafc;
        }

        .info-card-title {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          color: #0284c7;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 5px;
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
        }

        .info-row {
          display: flex;
          margin-bottom: 4px;
        }

        .info-label {
          font-weight: 600;
          width: 120px;
          color: #475569;
        }

        .info-val {
          font-weight: 400;
          color: #0f172a;
          flex-1;
        }

        .checklist-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }

        .checklist-item {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px;
          text-align: center;
          font-size: 10px;
        }

        .checklist-item.checked {
          background-color: #f0fdf4;
          border-color: #bbf7d0;
          color: #166534;
          font-weight: 600;
        }

        .checklist-item.unchecked {
          background-color: #fef2f2;
          border-color: #fecaca;
          color: #991b1b;
        }

        .checklist-item.neutral {
          background-color: #f8fafc;
          border-color: #cbd5e1;
        }

        .section-header {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          background-color: #0f172a;
          color: #ffffff;
          padding: 6px 10px;
          border-radius: 4px;
          margin-top: 15px;
          margin-bottom: 10px;
        }

        .ai-diagnostic-box {
          border: 1px solid #bdf0f8;
          background-color: #ecfeff;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 15px;
        }

        .ai-title {
          font-weight: 700;
          color: #0891b2;
          font-size: 10px;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .bullet-list {
          padding-left: 15px;
          margin-top: 5px;
        }

        .bullet-list li {
          margin-bottom: 3px;
        }

        .photos-gallery {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 10px;
          margin-bottom: 20px;
        }

        .photo-wrapper {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          background-color: #f8fafc;
          text-align: center;
          padding: 5px;
        }

        .photo-img {
          width: 100%;
          height: 120px;
          object-fit: contain;
          border-radius: 4px;
        }

        .photo-label {
          font-size: 8px;
          color: #64748b;
          margin-top: 4px;
          font-family: monospace;
        }

        .terms-container {
          border: 1px solid #cbd5e1;
          background-color: #f8fafc;
          border-radius: 8px;
          padding: 12px;
          font-size: 9px;
          color: #475569;
          text-align: justify;
          line-height: 1.5;
          margin-top: 15px;
          margin-bottom: 20px;
        }

        .signatures-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-top: 25px;
        }

        .signature-box {
          border: 1px dashed #cbd5e1;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
          height: 140px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          background-color: #fafafa;
        }

        .signature-img {
          max-height: 80px;
          max-width: 100%;
          object-fit: contain;
        }

        .signature-line {
          width: 80%;
          border-top: 1px solid #64748b;
          margin-top: 10px;
          padding-top: 4px;
        }

        .signature-name {
          font-weight: 700;
          font-size: 10px;
          color: #0f172a;
        }

        .signature-role {
          font-size: 8px;
          color: #64748b;
          text-transform: uppercase;
          margin-top: 1px;
        }

        .print-btn {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background-color: #0284c7;
          color: #ffffff;
          border: none;
          padding: 12px 20px;
          font-size: 12px;
          font-weight: 700;
          border-radius: 50px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: background-color 0.2s;
        }

        .print-btn:hover {
          background-color: #0369a1;
        }
      </style>
    </head>
    <body>

      <!-- Floating Print Button (not printed) -->
      <button class="print-btn no-print" onclick="window.print()">
        🖨️ Imprimir / Guardar PDF
      </button>

      <!-- HEADER BAR -->
      <div class="header-bar">
        <div class="logo-container">
          <h1>LITIO ENERGY</h1>
          <p>Especialistas en Vehículos Eléctricos y Micromovilidad</p>
        </div>
        <div class="document-title">
          <h2>CERTIFICADO DE CONFORMIDAD Y ORDEN DE SERVICIO</h2>
          <div class="ticket-no">${ticketNumber}</div>
        </div>
      </div>

      <!-- GENERAL INFO GRID -->
      <div class="info-grid">
        <!-- Client Info -->
        <div class="info-card">
          <div class="info-card-title">
            <span>1. INFORMACIÓN DEL CLIENTE Y RECEPCIÓN</span>
            <span style="color:#64748b; font-family: monospace;">REGISTRO DIGITAL</span>
          </div>
          <div class="info-row">
            <div class="info-label">Nombre Cliente:</div>
            <div class="info-val" style="font-weight:600;">${repair.client.name}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Teléfono:</div>
            <div class="info-val">${repair.client.phone}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Correo Electrónico:</div>
            <div class="info-val">${repair.client.email || "No registrado"}</div>
          </div>
          <div class="info-row">
            <div class="info-label">DNI / RUC:</div>
            <div class="info-val">${repair.client.dni || "No registrado"}</div>
          </div>
          <div class="info-row" style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
            <div class="info-label">Sede de Atención:</div>
            <div class="info-val" style="font-weight:600; color:#0284c7;">${branchNames[repair.workshopBranch] || repair.workshopBranch}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Fecha de Ingreso:</div>
            <div class="info-val">${formattedDate}</div>
          </div>
        </div>

        <!-- Vehicle Info -->
        <div class="info-card">
          <div class="info-card-title">
            <span>2. DETALLE DEL VEHÍCULO ELÉCTRICO</span>
            <span style="color:#64748b; font-family: monospace;">EV SPECS</span>
          </div>
          <div class="info-row">
            <div class="info-label">Tipo de Equipo:</div>
            <div class="info-val" style="font-weight:600;">${vehicleNames[repair.vehicle.type] || repair.vehicle.type}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Marca / Modelo:</div>
            <div class="info-val">${repair.vehicle.brand} ${repair.vehicle.model}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Voltaje Nominal:</div>
            <div class="info-val font-mono">${repair.vehicle.voltage}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Estado Batería:</div>
            <div class="info-val uppercase font-mono text-[9px]">${repair.vehicle.batteryCondition}</div>
          </div>
          <div class="info-row" style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
            <div class="info-label">Tipo de Servicio:</div>
            <div class="info-val" style="font-weight:600; color:#0284c7;">${serviceNames[repair.serviceType] || repair.serviceType} ${repair.serviceTypeDetail ? `(${repair.serviceTypeDetail})` : ""}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Estado Actual:</div>
            <div class="info-val font-bold" style="color: #16a34a;">${statusLabels[repair.status] || repair.status}</div>
          </div>
        </div>
      </div>

      <!-- DETALLE DE FALLA REPORTADA -->
      <div class="info-card" style="margin-bottom: 20px;">
        <div class="info-card-title">3. DIAGNÓSTICO INICIAL Y FALLA REPORTADA POR EL CLIENTE</div>
        <div style="font-style: italic; color: #475569; font-size: 11px; padding: 4px 0;">
          "${repair.vehicle.reportedFailure}"
        </div>
      </div>

      <!-- INVENTARIO Y ESTADO ESTÉTICO -->
      <div class="section-header">4. INVENTARIO DE ACCESORIOS Y ESTADO ESTÉTICO / MECÁNICO</div>
      <div class="checklist-grid">
        <div class="checklist-item ${repair.accessories.charger ? "checked" : "neutral"}">
          ⚡ Cargador: ${repair.accessories.charger ? "SÍ" : "NO"}
        </div>
        <div class="checklist-item ${repair.accessories.key ? "checked" : "neutral"}">
          🔑 Llave: ${repair.accessories.key ? "SÍ" : "NO"}
        </div>
        <div class="checklist-item ${repair.accessories.battery ? "checked" : "neutral"}">
          🔋 Batería Extra: ${repair.accessories.battery ? "SÍ" : "NO"}
        </div>
        <div class="checklist-item ${repair.accessories.helmet ? "checked" : "neutral"}">
          🪖 Casco: ${repair.accessories.helmet ? "SÍ" : "NO"}
        </div>
        <div class="checklist-item ${repair.accessories.padlock ? "checked" : "neutral"}">
          🔒 Candado/Traba: ${repair.accessories.padlock ? "SÍ" : "NO"}
        </div>
        <div class="checklist-item ${repair.visualState.brakesOk ? "checked" : "unchecked"}">
          🛑 Frenos: ${repair.visualState.brakesOk ? "OK" : "REVISAR"}
        </div>
        <div class="checklist-item ${repair.visualState.lightsOk ? "checked" : "unchecked"}">
          💡 Luces/Faros: ${repair.visualState.lightsOk ? "OK" : "REVISAR"}
        </div>
        <div class="checklist-item ${repair.visualState.screenOk ? "checked" : "unchecked"}">
          📺 Display/Pantalla: ${repair.visualState.screenOk ? "OK" : "REVISAR"}
        </div>
      </div>

      ${repair.visualState.notes ? `
        <div class="info-card" style="margin-bottom: 20px; font-size: 10px;">
          <strong>Observaciones de Ingreso / Daños Reportados:</strong> ${repair.visualState.notes}
        </div>
      ` : ""}

      <!-- AI ASSISTANCE & PROCEDURES -->
      ${repair.aiDiagnostic ? `
        <div class="ai-diagnostic-box">
          <div class="ai-title">🤖 Pautas Técnicas y Diagnóstico Predictivo (Gemini AI)</div>
          <div style="font-size: 10px; color: #0891b2; margin-bottom: 6px;">
            <strong>Nota de Diagnóstico Predictivo:</strong> ${repair.aiDiagnostic.aiNote}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 9.5px; margin-top: 8px;">
            <div>
              <strong>Procedimientos Recomendados de Seguridad EV:</strong>
              <ul class="bullet-list" style="color:#0f172a;">
                ${repair.aiDiagnostic.testProcedures.map(p => `<li>${p}</li>`).join("")}
              </ul>
            </div>
            <div>
              <strong>Repuestos / Componentes Sugeridos:</strong>
              <div style="margin-top: 5px;">
                ${repair.aiDiagnostic.suggestedParts.map(sp => `
                  <span style="display: inline-block; background-color: #0891b2; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 700; margin-right: 4px; margin-bottom: 4px;">
                    ${sp}
                  </span>
                `).join("")}
              </div>
            </div>
          </div>
        </div>
      ` : ""}

      <!-- WORKSHOP INTERVENTION LOGS -->
      <div class="section-header">5. BITÁCORA TÉCNICA E INTERVENCIÓN DE TALLER</div>
      <div class="info-card" style="margin-bottom: 20px;">
        <div class="info-row">
          <div class="info-label" style="width: 150px;">Comentarios del Técnico / Trabajo Realizado:</div>
          <div class="info-val" style="font-family: monospace; line-height: 1.5; font-size: 10px; background: #ffffff; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px;">
            ${repair.technicianNotes || "En proceso de diagnóstico por parte del mecánico de guardia."}
          </div>
        </div>
      </div>

      <!-- COSTA Y PAGOS -->
      <div class="info-grid">
        <div class="info-card">
          <div class="info-card-title">6. DESGLOSE ECONÓMICO Y FINANCIERO (S/.)</div>
          <div class="info-row">
            <div class="info-label">Presupuesto Estimado:</div>
            <div class="info-val font-mono" style="font-weight: 600;">S/. ${estCost.toFixed(2)}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Costo Final de Reparación:</div>
            <div class="info-val font-mono" style="font-weight: 800; color: #0284c7; font-size: 12px;">S/. ${finCost.toFixed(2)}</div>
          </div>
        </div>

        <div class="info-card">
          <div class="info-card-title">ESTADO DE PAGOS</div>
          <div class="info-row">
            <div class="info-label">Adelanto Recibido:</div>
            <div class="info-val font-mono">S/. ${advPayment.toFixed(2)} (${repair.payment?.paymentMethod === "yape_plin" ? "YAPE/PLIN" : repair.payment?.paymentMethod?.toUpperCase() || "EFECTIVO"})</div>
          </div>
          <div class="info-row">
            <div class="info-label">Saldo Pendiente por Cobrar:</div>
            <div class="info-val font-mono" style="font-weight: 700; color: #dc2626;">S/. ${remBalance.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <!-- EVIDENCE PHOTOS SECTION -->
      ${repair.visualState.photos && repair.visualState.photos.length > 0 ? `
        <div class="page-break"></div>
        <div class="section-header" style="margin-top: 10px;">7. REGISTRO FOTOGRÁFICO DE EVIDENCIA EN TABLET</div>
        <div class="photos-gallery">
          ${repair.visualState.photos.map((photo, index) => `
            <div class="photo-wrapper">
              <img src="${photo}" class="photo-img" alt="Evidencia ${index + 1}" />
              <div class="photo-label">Captura #${index + 1} - Memoria Tablet</div>
            </div>
          `).join("")}
        </div>
      ` : ""}

      <!-- TERMS AND CONDITIONS -->
      <div class="terms-container">
        <strong>TÉRMINOS DE CONFORMIDAD DEL SERVICIO DE DIAGNÓSTICO Y REPARACIÓN:</strong><br/>
        El cliente declara conformidad del ingreso de su vehículo con las características físicas especificadas en este informe técnico. Toda reparación realizada goza de garantía de acuerdo a la ley siempre que no existan sellos vulnerados o daños por líquidos posteriores. Litio Energy no asume custodia de elementos de valor que no hayan sido declarados explícitamente en la sección "Inventario de Accesorios". El plazo de retiro corre desde el envío del aviso oficial vía WhatsApp, pudiendo incurrir en costos de almacén según normativas vigentes transcurrido el tiempo límite.
      </div>

      <!-- SIGNATURES SECTION -->
      <div class="signatures-grid">
        <!-- Client Signature Box -->
        <div class="signature-box">
          <span style="font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700;">Firma del Cliente</span>
          ${repair.clientSignature ? `
            <img src="${repair.clientSignature}" class="signature-img" alt="Firma del Cliente" />
          ` : `
            <div style="font-size: 9px; color: #94a3b8; font-style: italic; margin-top: 20px;">Firma Digital Pendiente</div>
          `}
          <div class="signature-line">
            <div class="signature-name">${repair.clientSignatureName || repair.client.name}</div>
            <div class="signature-role">Firma Digital de Conformidad</div>
          </div>
        </div>

        <!-- Receptionist Signature Box -->
        <div class="signature-box">
          <span style="font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700;">Firma de la Recepcionista</span>
          ${repair.tallerSignature ? `
            <img src="${repair.tallerSignature}" class="signature-img" alt="Firma de la Recepcionista" />
          ` : `
            <div style="font-size: 9px; color: #94a3b8; font-style: italic; margin-top: 20px;">Firma Digital de Recepción</div>
          `}
          <div class="signature-line">
            <div class="signature-name">${repair.tallerSignatureName || "Recepcionista Autorizada"}</div>
            <div class="signature-role">Operador de Recepción</div>
          </div>
        </div>

        <!-- Technician Signature Box -->
        <div class="signature-box">
          <span style="font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700;">Firma de Técnico Responsable</span>
          ${repair.technicianSignature ? `
            <img src="${repair.technicianSignature}" class="signature-img" alt="Firma de Técnico" />
          ` : `
            <div style="font-size: 9px; color: #94a3b8; font-style: italic; margin-top: 20px;">Firma de Taller Pendiente</div>
          `}
          <div class="signature-line">
            <div class="signature-name">${repair.technicianSignatureName || (repair.technicianNotes ? "Mecánico Asignado" : "Técnico Especialista")}</div>
            <div class="signature-role">Técnico de Servicio Certificado</div>
          </div>
        </div>
      </div>

      <div style="text-align: center; font-size: 8px; color: #94a3b8; margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 10px;">
        Este documento es un comprobante técnico emitido digitalmente por el Sistema Integrado de Litio Energy en tabletas portátiles de taller.<br/>
        LITIO ENERGY CO. — AV. ARENALES 1450, LINCE — SAN BORJA — SURCO — LIMA, PERÚ.
      </div>

    </body>
    </html>
  `);

  printWindow.document.close();
}
