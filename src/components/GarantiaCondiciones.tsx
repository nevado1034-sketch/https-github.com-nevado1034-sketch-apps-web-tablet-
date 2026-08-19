import React from "react";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import litioLogo from "../assets/litio-logo.png";

const sectionStyle = "text-[11px] text-slate-300 leading-relaxed space-y-2";

export default function GarantiaCondiciones() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="bg-slate-900 border-b border-slate-800 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center overflow-hidden drop-shadow-[0_0_12px_rgba(6,182,212,0.4)] shrink-0">
            <img src={litioLogo} alt="Isotipo Litio Energy" className="w-14 h-14 object-contain" draggable={false} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white">
              LITIO <span className="text-cyan-400">ENERGY</span>
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              Condiciones de Garantía
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-950 border border-slate-700 text-cyan-400">
          CÓDIGO LE-GAR-01 · V1
        </span>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 pb-16 space-y-5">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver</span>
        </button>

        <div className="text-center pt-2">
          <h2 className="text-xl font-black text-white">
            Condiciones de <span className="text-cyan-400">Garantía</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            LITIO ENERGY · GRUPO PERÚ CREARTE S.A.C.
          </p>
        </div>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">

          {/* General */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">Condiciones Generales de Garantía</h3>
            <p className={sectionStyle}>
              Las garantías aplican únicamente sobre defectos de fabricación o fallas directamente atribuibles al producto o servicio brindado por LITIO ENERGY.
            </p>
            <p className={`${sectionStyle} font-semibold text-slate-200`}>No cubren:</p>
            <ul className={`${sectionStyle} list-disc list-inside`}>
              <li>Desgaste por uso</li>
              <li>Mala instalación externa</li>
              <li>Manipulación por terceros</li>
              <li>Golpes, humedad o sobrecarga</li>
              <li>Uso indebido o distinto al recomendado</li>
            </ul>
            <p className={sectionStyle}>
              La evaluación de garantía será realizada exclusivamente por LITIO ENERGY. Todo producto o servicio deberá ser presentado para evaluación, no procediendo cambios inmediatos sin diagnóstico previo.
            </p>
          </div>

          {/* Baterías */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">1. Garantía en Baterías</h3>
            <p className={sectionStyle}>
              La garantía aplicable a baterías cubre únicamente fallas directamente atribuibles al componente vendido, reparado o intervenido por LITIO ENERGY, siempre que el producto haya sido utilizado correctamente, no haya sido manipulado por terceros y no presente señales de mal uso, humedad, golpes, sobrecarga, descarga profunda, cortocircuito, conexión incorrecta o modificación posterior.
            </p>

            <div className="mt-3 space-y-2">
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Batería completamente nueva</p>
              <p className={sectionStyle}>Cobertura: <strong>10 meses</strong> según tipo de batería, marca, configuración, uso declarado y condiciones comerciales pactadas.</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Falla interna del BMS de fábrica</li>
                <li>Desbalance anormal no atribuible al uso</li>
                <li>Pérdida de funcionamiento por defecto interno comprobado</li>
                <li>Falla de celdas atribuible a defecto de fabricación</li>
                <li>Problemas de carga o descarga originados internamente</li>
              </ul>
              <p className={`${sectionStyle} font-semibold text-rose-400`}>No cubre:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Daños por uso de cargador incorrecto</li>
                <li>Sobrecarga o descarga profunda</li>
                <li>Cortocircuitos externos</li>
                <li>Sulfatación, humedad, ingreso de agua o corrosión</li>
                <li>Golpes, caídas, perforaciones o aplastamiento</li>
                <li>Manipulación, apertura o reparación por terceros</li>
                <li>Uso en vehículos con controlador, motor o sistema eléctrico defectuoso</li>
                <li>Disminución natural de autonomía por uso, desgaste o envejecimiento químico</li>
              </ul>
            </div>

            <div className="mt-3 space-y-2">
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Batería armada o ensamblada por LITIO ENERGY</p>
              <p className={sectionStyle}>Cobertura: <strong>3 meses</strong>, salvo que se pacte expresamente un plazo distinto. Aplica sobre trabajo de ensamblaje, soldadura, conexión, configuración del BMS y componentes instalados por LITIO ENERGY.</p>
              <p className={`${sectionStyle} font-semibold text-rose-400`}>No cubre:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Celdas y/o BMS proporcionados por el cliente</li>
                <li>Celdas reutilizadas, usadas o recicladas</li>
                <li>Daños por mala instalación externa, cargador incorrecto o controlador defectuoso</li>
                <li>Apertura posterior o modificación del cableado, conectores o carcasa</li>
              </ul>
            </div>

            <div className="mt-3 space-y-2">
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Cambio de BMS</p>
              <p className={sectionStyle}>Cobertura: <strong>150 días calendario</strong>. Cubre únicamente el BMS instalado y la correcta conexión realizada por LITIO ENERGY.</p>
              <p className={`${sectionStyle} font-semibold text-rose-400`}>No cubre:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Celdas dañadas, desbalanceadas o batería degradada</li>
                <li>Fallas anteriores no intervenidas</li>
                <li>Daños por controlador, motor o cargador</li>
                <li>Humedad, corrosión interna o manipulación posterior</li>
              </ul>
            </div>

            <div className="mt-3 space-y-2">
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Cambio parcial de celdas</p>
              <p className={sectionStyle}>Cobertura: <strong>60 días calendario</strong>. Aplica únicamente sobre las celdas reemplazadas y el trabajo directamente realizado. No convierte la batería en nueva.</p>
            </div>

            <div className="mt-3 space-y-2">
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Cambio de níquel, cableado o componentes menores</p>
              <p className={sectionStyle}>Garantía exclusivamente sobre los elementos reemplazados y la correcta ejecución del trabajo. No se extiende a celdas, BMS ni otros componentes no intervenidos.</p>
            </div>

            <div className="mt-3 space-y-2">
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Baterías usadas, seminuevas o reacondicionadas</p>
              <p className={sectionStyle}>Cobertura: <strong>Sin garantía</strong>.</p>
            </div>

            <div className="mt-3 space-y-2">
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Autonomía</p>
              <p className={sectionStyle}>La autonomía no es fija. Puede variar por peso del usuario, presión de llantas, tipo de terreno, velocidad, pendientes, temperatura, estado del motor, controlador, frenos, carga transportada y hábitos de conducción.</p>
            </div>

            <div className="mt-3 space-y-2">
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Cargadores y compatibilidad</p>
              <p className={sectionStyle}>El uso de cargadores incorrectos puede dañar una batería nueva o reparada. Si el cliente utiliza un cargador distinto al recomendado, la garantía puede quedar sin efecto.</p>
            </div>

            <div className="mt-3 space-y-2">
              <p className={`${sectionStyle} font-semibold text-rose-400`}>Causales de pérdida de garantía en baterías:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Apertura o manipulación por el cliente o terceros</li>
                <li>Uso de cargador incorrecto</li>
                <li>Ingreso de agua, humedad o corrosión</li>
                <li>Golpes, caídas, perforaciones o deformación</li>
                <li>Cortocircuitos externos</li>
                <li>Descarga profunda por dejar la batería descargada mucho tiempo</li>
                <li>Uso en vehículo con motor, controlador o cableado defectuoso</li>
                <li>Modificación de conectores, cables o carcasa</li>
                <li>Señales de recalentamiento por sobreexigencia</li>
                <li>Instalación o reparación externa posterior</li>
              </ul>
            </div>

            <div className="mt-3 space-y-2">
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Recomendaciones de uso</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Utilizar únicamente el cargador adecuado para el voltaje de la batería</li>
                <li>Evitar descargar la batería completamente de forma constante</li>
                <li>No dejar la batería conectada al cargador por periodos prolongados</li>
                <li>No exponer la batería a calor excesivo ni dejarla bajo el sol por largos periodos</li>
                <li>Evitar el contacto con agua o humedad</li>
                <li>Si no se usa, mantener la batería con carga parcial (40% – 70%) y recargar periódicamente</li>
                <li>Evitar sobrecargar el vehículo o exigirlo en condiciones extremas</li>
                <li>No abrir ni manipular la batería; cualquier intervención debe ser realizada por personal técnico</li>
              </ul>
            </div>
          </div>

          {/* Llantas y cámaras */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">2. Garantía en Llantas y Cámaras</h3>
            <p className={sectionStyle}>
              Las llantas y cámaras son componentes de desgaste expuestos a condiciones externas como estado de la vía, presión de aire, peso del usuario, velocidad, frenado y condiciones climáticas.
            </p>
            <div className="mt-2 space-y-2">
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Llantas (neumáticos)</p>
              <p className={sectionStyle}>Son productos de desgaste, no cuentan con garantía por pinchaduras, cortes, desgaste, deformaciones o reventones. Cuentan con <strong>3 meses</strong> únicamente por defectos de fabricación, previa evaluación técnica.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Cámaras</p>
              <p className={sectionStyle}>Cuentan con <strong>7 días de garantía</strong> posterior a la instalación. Cualquier defecto de fabricación suele evidenciarse de forma inmediata.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Garantía por instalación</p>
              <p className={sectionStyle}>Se garantiza únicamente la correcta ejecución del trabajo de instalación. No cubre daños posteriores derivados del uso.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Aros</p>
              <p className={sectionStyle}>Garantía de <strong>7 días calendario</strong> por defectos de fabricación.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Rodajes y Vías de Giro</p>
              <p className={sectionStyle}>Garantía limitada de <strong>7 días calendario</strong>, aplicable únicamente a defectos de fabricación o instalación.</p>
            </div>
          </div>

          {/* Frenos */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">3. Garantía en Frenos, Zapatas y Pastillas</h3>
            <p className={sectionStyle}>
              Los componentes del sistema de frenos están diseñados para generar fricción, por lo que su desgaste es parte normal de su funcionamiento. Pastillas y zapatas son componentes de desgaste y no cuentan con garantía.
            </p>
            <p className={`${sectionStyle} font-semibold text-cyan-300 mt-2`}>Instalación de frenos</p>
            <p className={sectionStyle}>Se garantiza únicamente la correcta instalación, regulación y funcionamiento inicial al momento de la entrega. No cubre el desgaste posterior.</p>
          </div>

          {/* Componentes eléctricos y electrónicos */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">4. Garantía en Componentes Eléctricos y Electrónicos</h3>
            <p className={sectionStyle}>
              Los componentes eléctricos y electrónicos son altamente sensibles a humedad, voltaje incorrecto, sobrecarga, cortocircuitos, mala instalación y manipulación. Su funcionamiento depende del sistema completo del vehículo.
            </p>
            <div className="mt-2 space-y-2">
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li><strong>Controladoras:</strong> <strong>90 días calendario</strong> por defectos de fabricación</li>
                <li><strong>Pantallas:</strong> <strong>30 días calendario</strong> por defectos de fabricación</li>
                <li><strong>Aceleradores:</strong> <strong>30 días calendario</strong> por defectos de fabricación</li>
                <li><strong>Luces y direccionales:</strong> <strong>30 días calendario</strong> por defectos de fabricación</li>
                <li><strong>Claxon:</strong> <strong>30 días calendario</strong> por defectos de fabricación</li>
                <li><strong>Conectores de baja corriente:</strong> <strong>30 días calendario</strong> por defectos de instalación o fabricación</li>
                <li><strong>Conectores de alta descarga:</strong> Sin garantía (expuestos a altas corrientes, vibraciones y condiciones exigentes)</li>
              </ul>
            </div>
          </div>

          {/* Motores y rebobinados */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">5. Garantía en Motores y Rebobinados</h3>
            <div className="space-y-2">
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Motores nuevos</p>
              <p className={sectionStyle}>Garantía de <strong>5 a 6 meses</strong> por defectos de fabricación, previa evaluación técnica.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Motores seminuevos o usados</p>
              <p className={sectionStyle}>No cuentan con garantía, salvo que se indique expresamente. En caso de otorgarse, máximo <strong>30 días calendario</strong> para prueba de funcionamiento.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Rebobinado de motor</p>
              <p className={sectionStyle}>Garantía de <strong>30 días calendario</strong>, aplicable únicamente sobre el trabajo realizado. No convierte el motor en nuevo.</p>
            </div>
          </div>

          {/* Servicios técnicos */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">6. Garantía en Servicios Técnicos</h3>
            <div className="space-y-2">
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Tornería</p>
              <p className={sectionStyle}>Sin garantía estructural. Se garantiza únicamente la correcta ejecución del mecanizado.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Refuerzos</p>
              <p className={sectionStyle}>Garantía de <strong>6 a 12 meses</strong>, aplicable únicamente sobre trabajos específicos mencionados en el recibo de salida.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Mantenimiento</p>
              <p className={sectionStyle}>Es un servicio preventivo, no correctivo. No garantiza la ausencia de fallas futuras.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Reparaciones generales</p>
              <p className={sectionStyle}>Se limitan a la falla detectada y aprobada por el cliente.</p>
            </div>
          </div>

          {/* Accesorios */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">7. Garantía en Accesorios</h3>
            <div className="space-y-2">
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li><strong>Cascos:</strong> <strong>7 días calendario</strong> por defectos de fabricación</li>
                <li><strong>Guantes:</strong> Sin garantía (producto de uso personal)</li>
                <li><strong>Cadenas:</strong> Sin garantía</li>
                <li><strong>Bolsos:</strong> Sin garantía</li>
                <li><strong>Luces recargables:</strong> <strong>7 días calendario</strong> por defectos de fabricación</li>
                <li><strong>Claxon recargable:</strong> <strong>7 días calendario</strong> por defectos de fabricación</li>
                <li><strong>Protectores de pantalla:</strong> Sin garantía</li>
                <li><strong>Fundas de moto:</strong> Sin garantía</li>
              </ul>
            </div>
          </div>

          {/* Partes plásticas y estéticas */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">8. Garantía en Partes Plásticas y Estéticas</h3>
            <div className="space-y-2">
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Embellacedores plásticos</p>
              <p className={sectionStyle}>Sin garantía, al ser piezas estéticas sujetas a desgaste y vibración.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Tapabarros</p>
              <p className={sectionStyle}>Garantía de <strong>7 días calendario</strong> únicamente por defectos de fabricación.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Luces integradas en tapabarros</p>
              <p className={sectionStyle}>Garantía de <strong>7 días</strong> por defectos de fabricación.</p>
            </div>
          </div>

          {/* Vehículos */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">9. Garantía en Vehículos</h3>
            <div className="space-y-2">
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Vehículos nuevos</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li><strong>Motor:</strong> hasta 10 meses</li>
                <li><strong>Batería:</strong> hasta 12 meses</li>
                <li><strong>Controladora:</strong> hasta 6 meses</li>
                <li><strong>Pantalla:</strong> hasta 6 meses</li>
                <li><strong>Acelerador:</strong> hasta 6 meses</li>
              </ul>
              <p className={sectionStyle}>En caso de vehículos Segway / Ninebot, algunos componentes pueden contar con plazos mayores conforme a las condiciones del fabricante, gestionadas directamente por el representante autorizado.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Vehículos seminuevos / usados</p>
              <p className={sectionStyle}>No cuentan con garantía, salvo que se indique expresamente.</p>
            </div>
          </div>

          {/* Condiciones generales */}
          <div className="pt-3 border-t border-slate-800">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-cyan-400 mb-2 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Condiciones Generales</span>
            </h3>
            <ul className={`${sectionStyle} list-disc list-inside`}>
              <li>La garantía cubre exclusivamente lo expresamente indicado. Cualquier situación no contemplada será evaluada bajo criterio técnico.</li>
              <li>La garantía solo será válida si el cliente presenta comprobante de pago, orden de servicio o evidencia de la transacción.</li>
              <li>La recepción del producto o equipo para evaluación no implica la aceptación automática de la garantía.</li>
              <li>LITIO ENERGY se reserva el derecho de determinar, mediante evaluación técnica, si una falla corresponde a un caso cubierto por garantía.</li>
              <li>Los plazos de evaluación y atención podrán variar según la complejidad del caso y disponibilidad de repuestos.</li>
              <li>Las presentes condiciones se complementan con los Términos y Condiciones de LITIO ENERGY, prevaleciendo estos en caso de discrepancia.</li>
            </ul>
          </div>

        </section>

        <footer className="text-center text-[10px] text-slate-600 pt-4 space-y-1">
          <p className="flex items-center justify-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Documento generado por el Sistema Litio Energy</span>
          </p>
          <p>AV. ARENALES 1450, LINCE — SAN BORJA — SURCO — LIMA, PERÚ</p>
        </footer>
      </main>
    </div>
  );
}
