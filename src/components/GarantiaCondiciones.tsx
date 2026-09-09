import React from "react";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import litioLogo from "../assets/litio-logo.png";
import CopyProtected from "./CopyProtected";

const sectionStyle = "text-[11px] text-slate-300 leading-relaxed space-y-2";

export default function GarantiaCondiciones() {
  return (
    <CopyProtected>
      <div className="min-h-screen bg-transparent">
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
          <div>
            <div className="space-y-2">
              <p className={sectionStyle}>Las garantías aplican únicamente sobre defectos de fabricación o fallas directamente atribuibles al producto o servicio brindado por LITIO ENERGY.</p>
              <p className={`${sectionStyle} font-semibold text-rose-400`}>No cubren:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>desgaste por uso</li>
                <li>mala instalación externa</li>
                <li>manipulación por terceros</li>
                <li>golpes, humedad o sobrecarga</li>
                <li>uso indebido o distinto al recomendado</li>
              </ul>
              <p className={sectionStyle}>La evaluación de garantía será realizada exclusivamente por LITIO ENERGY. Todo producto o servicio deberá ser presentado para evaluación, no procediendo cambios inmediatos sin diagnóstico previo.</p>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
              <span>CONDICIONES DE GARANTÍA – BATERÍAS</span>
            </h3>
            <div className="space-y-2">
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>1. Alcance general de la garantía en baterías</p>
              <p className={sectionStyle}>La garantía aplicable a baterías cubre únicamente fallas directamente atribuibles al componente vendido, reparado o intervenido por LITIO ENERGY, siempre que el producto haya sido utilizado correctamente, no haya sido manipulado por terceros y no presente señales de mal uso, humedad, golpes, sobrecarga, descarga profunda, cortocircuito, conexión incorrecta o modificación posterior. Las baterías son componentes eléctricos sensibles y de alto riesgo técnico. Su funcionamiento depende no solo de las celdas internas, sino también del BMS, cargador, controlador, motor, conectores, cableado, hábitos de carga, condiciones de uso, almacenamiento y consumo del vehículo. Por ello, la garantía no implica que toda falla posterior en la batería sea automáticamente responsabilidad de LITIO ENERGY. Toda solicitud de garantía deberá pasar primero por evaluación técnica.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>2. Batería completamente nueva</p>
              <p className={sectionStyle}>Cuando LITIO ENERGY vende o instala una batería completamente nueva, la garantía cubre defectos de fabricación o fallas internas atribuibles a la batería dentro del plazo indicado en el comprobante, recibo, cotización o enlace de garantías vigente.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Cobertura recomendada:</p>
              <p className={sectionStyle}>10 meses, según tipo de batería, marca, configuración, uso declarado y condiciones comerciales pactadas.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>La garantía puede cubrir:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Falla interna del BMS de fábrica.</li>
                <li>Desbalance anormal no atribuible al uso.</li>
                <li>Pérdida de funcionamiento por defecto interno comprobado.</li>
                <li>Falla de celdas atribuible a defecto de fabricación.</li>
                <li>Problemas de carga o descarga originados internamente en la batería.</li>
              </ul>
              <p className={`${sectionStyle} font-semibold text-rose-400`}>La garantía no cubre:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Daños por uso de cargador incorrecto.</li>
                <li>Sobrecarga o descarga profunda.</li>
                <li>Cortocircuitos externos.</li>
                <li>Sulfatación, humedad, ingreso de agua o corrosión.</li>
                <li>Golpes, caídas, perforaciones o aplastamiento.</li>
                <li>Manipulación, apertura o reparación por terceros.</li>
                <li>Uso en vehículos con controlador, motor o sistema eléctrico defectuoso.</li>
                <li>Exigencia de corriente superior a la capacidad de la batería.</li>
                <li>Alteración de conectores, cables o sistema de carga.</li>
                <li>Disminución natural de autonomía por uso, desgaste o envejecimiento químico.</li>
              </ul>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>3. Batería armada o ensamblada por LITIO ENERGY</p>
              <p className={sectionStyle}>Cuando LITIO ENERGY realiza el armado o ensamblaje de una batería, la garantía aplica únicamente sobre el trabajo de ensamblaje, soldadura, conexión, configuración del BMS y componentes instalados por LITIO ENERGY.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Cobertura recomendada:</p>
              <p className={sectionStyle}>3 meses, salvo que se pacte expresamente un plazo distinto.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>La garantía puede cubrir:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Fallas en puntos de soldadura realizados por LITIO ENERGY.</li>
                <li>Error de conexión interna atribuible al armado.</li>
                <li>Falla del BMS instalado por LITIO ENERGY.</li>
                <li>Defecto de aislamiento interno atribuible al ensamblaje.</li>
                <li>Problemas de funcionamiento directamente vinculados al trabajo realizado.</li>
              </ul>
              <p className={`${sectionStyle} font-semibold text-rose-400`}>No cubre:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Celdas y/o bms proporcionadas por el cliente.</li>
                <li>Celdas reutilizadas, usadas o recicladas.</li>
                <li>Daños por mala instalación externa.</li>
                <li>Daños por cargador incorrecto.</li>
                <li>Daños por controlador defectuoso.</li>
                <li>Uso fuera de la capacidad recomendada.</li>
                <li>Apertura posterior de la batería.</li>
                <li>Modificación del cableado, conectores o carcasa.</li>
              </ul>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>4. Cambio de BMS</p>
              <p className={sectionStyle}>Cuando el servicio consiste únicamente en el cambio de BMS, la garantía cubre exclusivamente el BMS instalado y la correcta conexión realizada por LITIO ENERGY.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Cobertura recomendada:</p>
              <p className={sectionStyle}>150 días calendario</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>La garantía puede cubrir:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Falla del BMS instalado.</li>
                <li>Error de conexión atribuible al servicio.</li>
                <li>Problema de corte, carga o descarga directamente relacionado con el BMS reemplazado.</li>
              </ul>
              <p className={`${sectionStyle} font-semibold text-rose-400`}>No cubre:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Celdas dañadas.</li>
                <li>Celdas desbalanceadas.</li>
                <li>Batería degradada.</li>
                <li>Fallas anteriores no intervenidas.</li>
                <li>Daños por controlador, motor o cargador.</li>
                <li>Daños por sobreconsumo.</li>
                <li>Humedad o corrosión interna.</li>
                <li>Manipulación posterior.</li>
              </ul>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>5. Cambio parcial de celdas</p>
              <p className={sectionStyle}>Cuando solo se reemplazan algunas celdas de una batería, la garantía aplica únicamente sobre las celdas reemplazadas por LITIO ENERGY y sobre el trabajo directamente realizado. Este tipo de reparación es parcial y no convierte la batería en una batería nueva.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Cobertura recomendada:</p>
              <p className={sectionStyle}>60 días calendario</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>La garantía puede cubrir:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Falla de una celda reemplazada.</li>
                <li>Error de conexión en la zona intervenida.</li>
                <li>Problema localizado en el grupo de celdas reemplazado.</li>
              </ul>
              <p className={`${sectionStyle} font-semibold text-rose-400`}>No cubre:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Fallas en celdas antiguas no reemplazadas.</li>
                <li>Desbalance generado por celdas viejas.</li>
                <li>Pérdida de autonomía por desgaste general.</li>
                <li>Fallas posteriores en otros grupos de celdas.</li>
                <li>Problemas del BMS no reemplazado.</li>
                <li>Daños por uso exigente o descarga profunda.</li>
              </ul>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>6. Cambio de níquel, cableado o componentes menores</p>
              <p className={sectionStyle}>En los casos en que el servicio consista únicamente en el cambio de tiras de níquel, cableado, conectores, portafusibles u otros componentes menores, la garantía cubrirá exclusivamente los elementos reemplazados y la correcta ejecución del trabajo realizado por LITIO ENERGY. Esta garantía no se extiende a las celdas internas de la batería, al BMS ni a otros componentes no intervenidos, los cuales pueden presentar fallas posteriores debido a desgaste, corrosión, sulfatación, desbalance o deterioro previo. El cliente reconoce que este tipo de servicio es puntual y no constituye una reparación integral de la batería, por lo que no garantiza el funcionamiento total del sistema ni la ausencia de fallas futuras en partes no intervenidas.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>7. Baterías usadas, seminuevas o reacondicionadas</p>
              <p className={sectionStyle}>Las baterías usadas, seminuevas o reacondicionadas tienen una condición distinta a una batería nueva, ya que pueden presentar desgaste químico, menor autonomía, menor capacidad real o riesgo de fallas futuras.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>Cobertura recomendada:</p>
              <p className={sectionStyle}>Sin garantía</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>8. Autonomía de la batería</p>
              <p className={sectionStyle}>La autonomía de una batería no es fija. Puede variar por peso del usuario, presión de llantas, tipo de terreno, velocidad, pendientes, temperatura, estado del motor, controlador, frenos, carga transportada y hábitos de conducción.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>9. Cargadores y compatibilidad</p>
              <p className={sectionStyle}>El uso de cargadores incorrectos puede dañar una batería nueva o reparada. Por ello, si el cliente utiliza un cargador distinto al recomendado, la garantía puede quedar sin efecto.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>10. Causales de pérdida de garantía en baterías</p>
              <p className={`${sectionStyle} font-semibold text-rose-400`}>La garantía de batería quedará sin efecto en los siguientes casos:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Apertura o manipulación de la batería por el cliente o terceros.</li>
                <li>Uso de cargador incorrecto.</li>
                <li>Ingreso de agua, humedad o corrosión.</li>
                <li>Golpes, caídas, perforaciones o deformación.</li>
                <li>Cortocircuitos externos.</li>
                <li>Conectores quemados por mala conexión o sobrecorriente.</li>
                <li>Descarga profunda por dejar la batería descargada durante mucho tiempo.</li>
                <li>Uso en vehículo con motor, controlador o cableado defectuoso.</li>
                <li>Modificación de conectores, cables o carcasa.</li>
                <li>Uso fuera de las especificaciones recomendadas.</li>
                <li>Señales de recalentamiento por sobreexigencia.</li>
                <li>Instalación o reparación externa posterior.</li>
              </ul>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
              <span>RECOMENDACIONES DE USO – BATERÍAS DE LITIO</span>
            </h3>
            <div className="space-y-2">
              <p className={sectionStyle}>Las baterías de litio requieren un uso adecuado para prolongar su vida útil y evitar daños prematuros. El cliente declara haber sido informado de las siguientes recomendaciones:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Utilizar únicamente el cargador adecuado para el voltaje de la batería.</li>
                <li>Evitar descargar la batería completamente de forma constante.</li>
                <li>No dejar la batería conectada al cargador por periodos prolongados.</li>
                <li>No exponer la batería a calor excesivo ni dejarla bajo el sol por largos periodos.</li>
                <li>Evitar el contacto con agua o humedad.</li>
                <li>Si no se usa, mantener la batería con carga parcial (40% – 70%) y recargar periódicamente.</li>
                <li>Evitar sobrecargar el vehículo o exigirlo en condiciones extremas.</li>
                <li>No abrir ni manipular la batería; cualquier intervención debe ser realizada por personal técnico.</li>
              </ul>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
              <span>CONDICIONES DE GARANTÍA – LLANTAS Y CÁMARAS</span>
            </h3>
            <div className="space-y-2">
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>1. Alcance general</p>
              <p className={sectionStyle}>Las llantas y cámaras son componentes de desgaste y están expuestos constantemente a condiciones externas como:</p>
              <ul className={`${sectionStyle} list-disc list-inside ml-4`}>
                <li>estado de la vía (huecos, piedras, vidrios, clavos)</li>
                <li>presión de aire</li>
                <li>peso del usuario</li>
                <li>velocidad y forma de conducción</li>
                <li>frenado</li>
                <li>condiciones climáticas</li>
              </ul>
              <p className={sectionStyle}>Por ello, su durabilidad depende directamente del uso y no únicamente del producto.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>2. Garantía de llantas (neumáticos)</p>
              <p className={sectionStyle}>Las llantas (neumáticos) son productos de desgaste, por lo que no cuentan con garantía por pinchaduras, cortes, desgaste, deformaciones, reventones o daños ocasionados por el uso normal del vehículo. No obstante, las llantas cuentan con una garantía de tres (3) meses únicamente por defectos de fabricación, previa evaluación técnica de LITIO ENERGY. Esta garantía no cubre daños ocasionados por el uso, tales como baja presión, sobrecarga, golpes, conducción en superficies irregulares, frenado brusco o cualquier condición externa.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>3. Garantía de cámaras</p>
              <p className={sectionStyle}>Las cámaras están aún más expuestas que las llantas y son altamente sensibles a:</p>
              <ul className={`${sectionStyle} list-disc list-inside ml-4`}>
                <li>pinchaduras</li>
                <li>instalación</li>
                <li>presión</li>
                <li>estado del aro</li>
                <li>fricción interna</li>
              </ul>
              <p className={sectionStyle}>En el caso de cámaras, cualquier defecto de fabricación suele evidenciarse de forma inmediata al momento de su instalación o en los primeros usos, por lo que cuentan con 7 días de garantía posterior, al estar expuestas a pinchaduras, presión incorrecta, instalación inadecuada, fricción interna o condiciones externas que escapan al control del taller. Transcurrido dicho plazo sin observaciones, se entenderá que el producto fue recibido y utilizado conforme.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>4. Garantía por instalación</p>
              <p className={sectionStyle}>Cuando la instalación de llantas, cámaras o componentes de rodaje es realizada por LITIO ENERGY, se garantiza únicamente la correcta ejecución del trabajo de instalación. Esta garantía no cubre daños posteriores derivados del uso, presión inadecuada, estado del aro, conducción, impacto o condiciones externas. En caso el cliente sea informado de que la llanta se encuentra deteriorada, deformada o en mal estado, y aun así decida no reemplazarla y optar únicamente por la instalación de una cámara, LITIO ENERGY no se responsabiliza por fallas posteriores, tales como pinchaduras recurrentes, reventones o daños en la cámara. En estos casos, la cámara instalada no contará con garantía, al estar siendo utilizada en una llanta en condiciones no óptimas.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>5. Responsabilidad del cliente sobre presión de aire</p>
              <p className={sectionStyle}>El cliente es responsable de mantener la presión adecuada de las llantas. El uso con presión incorrecta puede generar daños en llantas, cámaras o aro, lo cual no será cubierto por garantía.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>6. Estado del aro</p>
              <p className={sectionStyle}>LITIO ENERGY no se responsabiliza por daños en llantas o cámaras derivados del mal estado del aro, tales como deformaciones, bordes filosos, desgaste o golpes previos.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>7. Daños por conducción o uso</p>
              <p className={sectionStyle}>No se consideran fallas de producto los daños ocasionados por conducción en terrenos irregulares, impacto contra objetos, sobrepeso, frenado brusco o uso exigente del vehículo.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>8. Instalación de productos proporcionados por el cliente</p>
              <p className={sectionStyle}>En caso el cliente proporcione la llanta, cámara o componente a instalar, LITIO ENERGY no se responsabiliza por la calidad, compatibilidad o estado del producto. La garantía en estos casos se limita únicamente a la mano de obra de instalación.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>9. Aros</p>
              <p className={sectionStyle}>Los aros cuentan con garantía únicamente por defectos de fabricación, la cual deberá ser reportada dentro de un plazo máximo de 7 días calendario. No cubre daños por golpes, caídas, deformaciones, sobrecarga o uso indebido.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>10. Rodajes (rodamientos de rueda) y Vías de Giro</p>
              <p className={sectionStyle}>Los rodamientos (rodajes) y componentes de giro cuentan con una garantía limitada de siete (7) días calendario, aplicable únicamente a defectos de fabricación o instalación. Debido a la naturaleza de estos componentes, cualquier falla de fábrica suele manifestarse de manera inmediata mediante ruidos, fricción, dureza en el giro o dificultad en el manejo, por lo que el cliente deberá reportar cualquier observación dentro del plazo indicado. Transcurrido dicho plazo sin observaciones, se entenderá que el producto fue recibido y utilizado conforme. No se considerarán fallas de fábrica los daños derivados del uso, ingreso de agua, suciedad, falta de mantenimiento, golpes o condiciones externas.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>11. Desgaste natural</p>
              <p className={sectionStyle}>El desgaste progresivo de llantas, cámaras y componentes de rodaje es un proceso normal derivado del uso del vehículo y no constituye falla cubierta por garantía.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>12. Causales de pérdida de garantía</p>
              <p className={`${sectionStyle} font-semibold text-rose-400`}>La garantía quedará sin efecto en caso de:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>presión incorrecta de aire</li>
                <li>manipulación o instalación por terceros</li>
                <li>golpes, caídas o impactos</li>
                <li>uso en condiciones extremas</li>
                <li>sobrepeso</li>
                <li>modificación del aro o estructura</li>
                <li>señales de uso indebido</li>
              </ul>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>13. Evaluación previa</p>
              <p className={sectionStyle}>Toda solicitud de garantía deberá ser evaluada previamente por LITIO ENERGY. La recepción del producto no implica aceptación automática del reclamo.</p>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
              <span>CONDICIONES DE GARANTÍA – FRENOS, ZAPATAS Y PASTILLAS</span>
            </h3>
            <div className="space-y-2">
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>1. Naturaleza del sistema de frenos</p>
              <p className={sectionStyle}>Los componentes del sistema de frenos están diseñados para generar fricción, por lo que su desgaste es parte normal de su funcionamiento. Su duración depende directamente de:</p>
              <ul className={`${sectionStyle} list-disc list-inside ml-4`}>
                <li>uso del vehículo</li>
                <li>tipo de conducción</li>
                <li>peso del usuario</li>
                <li>terreno (pendientes, bajadas)</li>
                <li>frecuencia de frenado</li>
                <li>condiciones externas</li>
              </ul>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>2. Pastillas de freno</p>
              <p className={sectionStyle}>Las pastillas de freno son componentes de desgaste, por lo que no cuentan con garantía, al estar diseñadas para deteriorarse con el uso normal del vehículo. Su duración dependerá de factores como el tipo de conducción, peso del usuario, frecuencia de frenado y condiciones del terreno.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>3. Zapatas de freno</p>
              <p className={sectionStyle}>Las zapatas de freno son componentes de desgaste y no cuentan con garantía, debido a que su función implica fricción constante y deterioro progresivo durante el uso.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>4. Instalación de frenos</p>
              <p className={sectionStyle}>Cuando la instalación o ajuste del sistema de frenos es realizado por LITIO ENERGY, se garantiza únicamente la correcta instalación, regulación y funcionamiento inicial del sistema al momento de la entrega. Esta garantía no cubre el desgaste posterior ni la pérdida de eficacia derivada del uso normal.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>5. Regulación y ajuste</p>
              <p className={sectionStyle}>Los sistemas de freno pueden requerir ajustes periódicos debido al uso, desgaste o asentamiento de componentes, lo cual no constituye falla ni defecto cubierto por garantía.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>6. Factores externos (CLAVE)</p>
              <p className={sectionStyle}>No se consideran fallas de producto o instalación los problemas derivados de:</p>
              <ul className={`${sectionStyle} list-disc list-inside ml-4`}>
                <li>uso intensivo o deportivo</li>
                <li>pendientes pronunciadas</li>
                <li>sobrepeso</li>
                <li>humedad o ingreso de agua</li>
                <li>contaminación de pastillas o zapatas (aceite, grasa, polvo)</li>
                <li>deformación de discos o superficies de frenado</li>
              </ul>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>7. Contaminación de frenos</p>
              <p className={sectionStyle}>La pérdida de eficacia del frenado por contaminación (aceite, grasa, suciedad u otros agentes externos) no será considerada falla cubierta por garantía.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>8. Ruido en frenos</p>
              <p className={sectionStyle}>Los ruidos en el sistema de frenos pueden presentarse de forma ocasional debido al tipo de material, condiciones climáticas o uso, y no constituyen necesariamente una falla del producto.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>9. Responsabilidad del cliente</p>
              <p className={sectionStyle}>El cliente es responsable de realizar mantenimiento periódico del sistema de frenos, así como de revisar su estado de forma regular para garantizar un uso seguro.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>10. Pérdida de garantía</p>
              <p className={`${sectionStyle} font-semibold text-rose-400`}>La garantía quedará sin efecto en caso de:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>manipulación por terceros</li>
                <li>uso indebido o exigente</li>
                <li>modificación del sistema de frenos</li>
                <li>instalación externa posterior</li>
                <li>señales de desgaste extremo</li>
              </ul>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>11. Evaluación previa</p>
              <p className={sectionStyle}>Toda solicitud de garantía será evaluada previamente por LITIO ENERGY. La recepción del equipo no implica aceptación automática del reclamo.</p>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
              <span>CONDICIONES DE GARANTÍA – COMPONENTES ELÉCTRICOS Y ELECTRÓNICOS</span>
            </h3>
            <div className="space-y-2">
              <p className={sectionStyle}>Los componentes eléctricos y electrónicos del vehículo (controladoras, pantallas, aceleradores, luces, conectores, etc.) son altamente sensibles a factores externos como:</p>
              <ul className={`${sectionStyle} list-disc list-inside ml-4`}>
                <li>humedad</li>
                <li>voltaje incorrecto</li>
                <li>sobrecarga</li>
                <li>cortocircuitos</li>
                <li>mala instalación</li>
                <li>manipulación</li>
                <li>compatibilidad entre componentes</li>
              </ul>
              <p className={sectionStyle}>Por ello, su funcionamiento depende no solo del producto, sino del sistema completo del vehículo.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>2. Alcance general de la garantía</p>
              <p className={sectionStyle}>La garantía de componentes eléctricos cubre únicamente fallas atribuibles a defectos de fabricación o instalación realizada por LITIO ENERGY, previa evaluación técnica. No cubre daños derivados de factores externos, uso inadecuado, incompatibilidad de componentes o condiciones del sistema eléctrico del vehículo.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>3. CONTROLADORAS</p>
              <p className={sectionStyle}>Las controladoras cuentan con una garantía limitada de 90 días calendario por defectos de fabricación o fallas internas atribuibles al producto.</p>
              <p className={`${sectionStyle} font-semibold text-rose-400`}>No cubre daños por:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>cortocircuitos</li>
                <li>sobrecarga eléctrica</li>
                <li>conexión incorrecta</li>
                <li>incompatibilidad con batería o motor</li>
                <li>ingreso de agua o humedad</li>
                <li>manipulación por terceros</li>
              </ul>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>4. PANTALLAS</p>
              <p className={sectionStyle}>Las pantallas cuentan con una garantía de 30 días calendario por defectos de fabricación.</p>
              <p className={`${sectionStyle} font-semibold text-rose-400`}>No cubre:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>daño por golpes</li>
                <li>humedad</li>
                <li>manipulación</li>
                <li>fallas por cableado externo</li>
                <li>problemas de configuración</li>
              </ul>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>5. ACELERADORES</p>
              <p className={sectionStyle}>Los aceleradores cuentan con una garantía de 30 días calendario por defectos de fabricación o falla inicial.</p>
              <p className={`${sectionStyle} font-semibold text-rose-400`}>No cubre:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>desgaste por uso</li>
                <li>humedad</li>
                <li>manipulación</li>
                <li>fallas por instalación incorrecta</li>
                <li>problemas en controlador o cableado</li>
                <li>golpes</li>
              </ul>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>6. LUCES Y DIRECCIONALES</p>
              <p className={sectionStyle}>Las luces, direccionales y sistemas de iluminación cuentan con una garantía de 30 días calendario por defectos de fabricación.</p>
              <p className={`${sectionStyle} font-semibold text-rose-400`}>No cubre daños por:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>humedad</li>
                <li>golpes</li>
                <li>mala instalación</li>
                <li>modificaciones</li>
                <li>fallas del sistema eléctrico del vehículo</li>
                <li>golpes</li>
              </ul>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>7. CLAXON / CLAXON RECARGABLE</p>
              <p className={sectionStyle}>Los dispositivos de sonido (claxon o similares) cuentan con garantía de 30 días calendario por defectos de fabricación. No cubre daños por agua, golpes, sobrecarga o manipulación.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>8. CONECTORES DE BAJA CORRIENTE</p>
              <p className={sectionStyle}>Los conectores de baja corriente cuentan con garantía de 30 días calendario por defectos de instalación o fabricación. No cubre fallas derivadas de uso, manipulación, sulfatación, humedad o conexiones incorrectas.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>9. CONECTORES DE ALTA DESCARGA</p>
              <p className={sectionStyle}>Los conectores y cableado de alta descarga no cuentan con garantía, debido a que están expuestos a altas corrientes eléctricas, sobrecalentamiento, vibraciones constantes del vehículo y condiciones variables del terreno. Asimismo, estos componentes pueden presentar fallas derivadas de falsos contactos, aflojamiento de conexiones, desgaste por vibración o irregularidades del terreno durante el uso. Cualquier daño posterior, como calentamiento, derretimiento, sulfatación o pérdida de contacto, se considera derivado del uso y no de defecto de producto o instalación. El cliente reconoce que el sistema eléctrico de alta corriente está sujeto a condiciones exigentes de operación, por lo que requiere revisiones periódicas para asegurar su correcto funcionamiento.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>10. COMPATIBILIDAD DEL SISTEMA</p>
              <p className={sectionStyle}>LITIO ENERGY no garantiza la compatibilidad total de los componentes eléctricos con sistemas previamente instalados por terceros o modificados por el cliente.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>11. INSTALACIÓN DE PRODUCTOS DEL CLIENTE</p>
              <p className={sectionStyle}>En caso el cliente proporcione componentes eléctricos para su instalación, LITIO ENERGY no se responsabiliza por la calidad, compatibilidad o funcionamiento del producto. La garantía se limita únicamente a la correcta ejecución de la instalación.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>12. CAUSALES DE PÉRDIDA DE GARANTÍA</p>
              <p className={`${sectionStyle} font-semibold text-rose-400`}>La garantía quedará sin efecto en caso de:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>manipulación por terceros</li>
                <li>ingreso de agua o humedad</li>
                <li>cortocircuitos</li>
                <li>conexiones incorrectas</li>
                <li>uso de batería o cargador inadecuado</li>
                <li>sobrecarga del sistema</li>
                <li>modificaciones posteriores</li>
                <li>fallas por falsos contactos generados por vibración</li>
                <li>aflojamiento de conexiones por uso</li>
                <li>desgaste por condiciones del terreno</li>
              </ul>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>13. EVALUACIÓN TÉCNICA</p>
              <p className={sectionStyle}>Toda solicitud de garantía será evaluada previamente por LITIO ENERGY. La recepción del componente no implica aceptación automática del reclamo.</p>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
              <span>CONDICIONES DE GARANTÍA – MOTORES Y REBOBINADOS</span>
            </h3>
            <div className="space-y-2">
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>1. Naturaleza del motor</p>
              <p className={sectionStyle}>Los motores eléctricos están sometidos a condiciones exigentes de operación, tales como:</p>
              <ul className={`${sectionStyle} list-disc list-inside ml-4`}>
                <li>carga constante</li>
                <li>temperatura</li>
                <li>consumo eléctrico</li>
                <li>tipo de terreno</li>
                <li>peso del usuario</li>
                <li>uso prolongado</li>
              </ul>
              <p className={sectionStyle}>Además, su funcionamiento depende de otros componentes como:</p>
              <ul className={`${sectionStyle} list-disc list-inside ml-4`}>
                <li>batería</li>
                <li>controladora</li>
                <li>cableado</li>
                <li>conectores</li>
              </ul>
              <p className={sectionStyle}>Por lo tanto, una falla en el sistema no siempre es atribuible directamente al motor.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>2. RAMAL Y CABLES DE FASE</p>
              <p className={sectionStyle}>El cliente reconoce que el correcto funcionamiento del motor depende también del estado del ramal eléctrico, incluyendo cables de fase, sensores y conexiones. En caso el vehículo ingrese con cables de fase dañados, pelados, sulfatados o con falso contacto, existe el riesgo de generar cortocircuitos, cruces eléctricos o sobrecargas que pueden afectar otros componentes del sistema, tales como la controladora, batería u otros elementos eléctricos. En estos casos, LITIO ENERGY no será responsable por daños adicionales que puedan evidenciarse durante o después del servicio, cuando estos se deriven de dichas condiciones preexistentes.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>3. Motores nuevos</p>
              <p className={sectionStyle}>Los motores nuevos cuentan con una garantía limitada de 5 a 6 meses por defectos de fabricación, previa evaluación técnica de LITIO ENERGY.</p>
              <p className={`${sectionStyle} font-semibold text-rose-400`}>Esta garantía no cubre daños derivados de:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>sobrecarga del sistema</li>
                <li>uso en pendientes exigentes</li>
                <li>sobrepeso</li>
                <li>ingreso de agua o humedad</li>
                <li>manipulación por terceros</li>
                <li>fallas en batería, controladora o cableado</li>
                <li>modificaciones del sistema</li>
              </ul>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>4. Motores seminuevos o usados</p>
              <p className={sectionStyle}>Los motores seminuevos o usados se venden en el estado en que se encuentran, pudiendo presentar desgaste o vida útil reducida. No cuentan con garantía, salvo que se indique expresamente lo contrario. En caso de otorgarse, esta se limitará a un plazo máximo de 30 días calendario para prueba de funcionamiento.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>5. Rebobinado de motor</p>
              <p className={sectionStyle}>El servicio de rebobinado de motor cuenta con una garantía limitada de 30 días calendario, aplicable únicamente sobre el trabajo realizado por LITIO ENERGY. Esta garantía cubre fallas relacionadas con el rebobinado, siempre que no existan factores externos que afecten el funcionamiento del motor. El rebobinado no convierte el motor en un producto nuevo, por lo que pueden presentarse fallas en otras partes del motor no intervenidas, tales como rodamientos, eje, imanes o carcasa. La garantía no cubre daños derivados de:</p>
              <ul className={`${sectionStyle} list-disc list-inside ml-4`}>
                <li>sobrecalentamiento por sobrecarga</li>
                <li>uso continuo en condiciones exigentes</li>
                <li>fallas en la controladora o batería</li>
                <li>ingreso de agua o suciedad</li>
                <li>manipulación posterior</li>
                <li>instalación incorrecta</li>
              </ul>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>6. Compatibilidad del sistema</p>
              <p className={sectionStyle}>LITIO ENERGY no garantiza el correcto funcionamiento del motor si este es utilizado con componentes incompatibles o en condiciones distintas a las recomendadas.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>7. Instalación de motores</p>
              <p className={sectionStyle}>Cuando la instalación del motor es realizada por LITIO ENERGY, se garantiza únicamente la correcta instalación y funcionamiento inicial al momento de la entrega. No cubre daños posteriores derivados del uso o condiciones externas.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>8. Vibraciones y uso del vehículo</p>
              <p className={sectionStyle}>El funcionamiento del motor puede verse afectado por vibraciones, terreno irregular, carga excesiva o condiciones de uso exigentes, lo cual no constituye falla cubierta por garantía.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>9. Causales de pérdida de garantía</p>
              <p className={`${sectionStyle} font-semibold text-rose-400`}>La garantía quedará sin efecto en caso de:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>manipulación por terceros</li>
                <li>ingreso de agua o humedad</li>
                <li>sobrecarga o uso extremo</li>
                <li>modificación del sistema eléctrico</li>
                <li>instalación externa posterior</li>
                <li>signos de recalentamiento</li>
                <li>daños derivados de cables de fase deteriorados o en mal estado</li>
                <li>cortocircuitos por ramal defectuoso</li>
                <li>fallas originadas por falso contacto o conexiones inestables</li>
              </ul>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>10. Evaluación previa</p>
              <p className={sectionStyle}>Toda solicitud de garantía será evaluada previamente por LITIO ENERGY. La recepción del motor no implica aceptación automática del reclamo.</p>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
              <span>CONDICIONES DE GARANTÍA – SERVICIOS TÉCNICOS</span>
            </h3>
            <div className="space-y-2">
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>1. Naturaleza de los servicios</p>
              <p className={sectionStyle}>Los servicios técnicos (tornería, refuerzos, mantenimiento, adaptaciones, reparaciones, etc.) no son productos nuevos, sino intervenciones sobre componentes existentes que pueden presentar desgaste, fatiga, daño previo o condiciones no visibles. Por ello, el resultado del servicio depende del estado inicial del componente y del uso posterior del vehículo.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>2. Alcance general de la garantía</p>
              <p className={sectionStyle}>La garantía en servicios técnicos cubre únicamente la correcta ejecución del trabajo realizado por LITIO ENERGY. No garantiza la durabilidad indefinida del componente intervenido ni su comportamiento en condiciones de uso exigentes.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>3. TORNERÍA</p>
              <p className={sectionStyle}>Los trabajos de tornería no cuentan con garantía estructural, debido a que se realizan sobre piezas previamente usadas o desgastadas. Se garantiza únicamente la correcta ejecución del mecanizado o adaptación realizada, no cubriendo fallas posteriores derivadas del estado del material, uso o esfuerzo al que sea sometido.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>4. REFUERZOS</p>
              <p className={sectionStyle}>Los trabajos de refuerzo estructural realizados por LITIO ENERGY cuentan con una garantía de (6) hasta un (12) meses, aplicable únicamente sobre trabajos específicos mencionados previamente en el recibo de salida. Esta garantía no cubre daños ocasionados por golpes, caídas, sobrepeso, uso extremo o modificaciones posteriores.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>5. MANTENIMIENTO</p>
              <p className={sectionStyle}>El mantenimiento es un servicio preventivo y no correctivo, por lo que no garantiza la ausencia de fallas futuras en el equipo. El objetivo del mantenimiento es mejorar el funcionamiento del vehículo en el momento del servicio, sin asegurar el estado de todos los componentes a futuro.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>6. REPARACIONES GENERALES</p>
              <p className={sectionStyle}>Las reparaciones realizadas por LITIO ENERGY se limitan a la falla detectada y aprobada por el cliente. No implican una revisión integral del equipo ni garantizan el funcionamiento total del sistema en el tiempo.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>7. TRABAJOS PARCIALES</p>
              <p className={sectionStyle}>El cliente acepta que el servicio puede ser parcial, limitado a la intervención específica solicitada o aprobada, pudiendo existir fallas posteriores en partes no intervenidas.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>8. CONDICIÓN DEL EQUIPO</p>
              <p className={sectionStyle}>LITIO ENERGY no se responsabiliza por fallas derivadas del estado previo del equipo, tales como desgaste, daño estructural, corrosión o fatiga de materiales.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>9. RESPONSABILIDAD DEL CLIENTE</p>
              <p className={sectionStyle}>El cliente es responsable del uso adecuado del vehículo después del servicio, así como de realizar mantenimiento periódico y evitar condiciones de uso extremas.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>10. CAUSALES DE PÉRDIDA DE GARANTÍA</p>
              <p className={sectionStyle}>La garantía de servicios quedará sin efecto en caso de:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>manipulación por terceros</li>
                <li>uso indebido o exigente</li>
                <li>modificaciones posteriores</li>
                <li>golpes o caídas</li>
                <li>sobrepeso</li>
                <li>uso fuera de condiciones normales</li>
              </ul>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>11. EVALUACIÓN DE GARANTÍA</p>
              <p className={sectionStyle}>Toda solicitud de garantía será evaluada por LITIO ENERGY. La recepción del equipo no implica aceptación automática del reclamo.</p>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
              <span>CONDICIONES DE GARANTÍA – ACCESORIOS</span>
            </h3>
            <div className="space-y-2">
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>1. Naturaleza de los accesorios</p>
              <p className={sectionStyle}>Los accesorios (cascos, luces, bolsos, guantes, cadenas, protectores, etc.) son productos complementarios cuyo desempeño depende del uso, cuidado y condiciones externas. Muchos de estos productos no forman parte del sistema mecánico o eléctrico del vehículo, por lo que su garantía es limitada.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>2. Alcance general de la garantía</p>
              <p className={sectionStyle}>Los accesorios cuentan con garantía únicamente por defectos de fabricación, la cual deberá ser reportada dentro de los primero 15 días, previa evaluación de LITIO ENERGY. No cubre daños por uso, desgaste, manipulación, golpes o condiciones externas.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>3. CASCOS</p>
              <p className={sectionStyle}>Los cascos cuentan con garantía únicamente por defectos de fabricación dentro de un plazo máximo de 7 días calendario. No cubre daños por golpes, caídas, uso, desgaste interno o manipulación.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>4. GUANTES</p>
              <p className={sectionStyle}>Los guantes no cuentan con garantía, al ser productos de uso personal sujetos a desgaste por fricción, sudor y uso continuo.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>5. CADENAS</p>
              <p className={sectionStyle}>Las cadenas de seguridad no cuentan con garantía por desgaste, cortes, manipulación o uso indebido.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>6. BOLSOS</p>
              <p className={sectionStyle}>Los bolsos no cuentan con garantía por desgaste, roturas, deformaciones o daños derivados del uso, carga excesiva o condiciones externas.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>7. LUCES RECARGABLES</p>
              <p className={sectionStyle}>Las luces recargables cuentan con garantía de 7 días calendario por defectos de fabricación. No cubre daños por humedad, golpes, sobrecarga o mal uso.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>8. CLAXON RECARGABLE</p>
              <p className={sectionStyle}>Los dispositivos recargables cuentan con garantía de 7 días calendario por defectos de fabricación. No cubre daños por agua, sobrecarga, golpes o manipulación.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>9. PROTECTOR DE PANTALLA</p>
              <p className={sectionStyle}>Los protectores de pantalla no cuentan con garantía, debido a que están diseñados para absorber impactos y deteriorarse con el uso.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>10. FUNDAS DE MOTO</p>
              <p className={sectionStyle}>Las fundas de moto no cuentan con garantía por desgaste, exposición al sol, lluvia o condiciones externas.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>11. PRODUCTOS DE USO PERSONAL</p>
              <p className={sectionStyle}>Los productos de uso personal no cuentan con garantía una vez utilizados, salvo defectos de fabricación evidentes reportados inmediatamente.</p>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
              <span>CONDICIONES DE GARANTÍA – PARTES PLÁSTICAS Y ESTÉTICAS</span>
            </h3>
            <div className="space-y-2">
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>1. Naturaleza de los componentes</p>
              <p className={sectionStyle}>Las partes plásticas, embellecedores, tapabarros y elementos estéticos están expuestos a:</p>
              <ul className={`${sectionStyle} list-disc list-inside ml-4`}>
                <li>vibraciones</li>
                <li>golpes</li>
                <li>condiciones del terreno</li>
                <li>exposición al sol</li>
                <li>desgaste</li>
              </ul>
              <p className={sectionStyle}>Por lo que su durabilidad depende del uso.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>2. Embellecedores plásticos</p>
              <p className={sectionStyle}>Los embellecedores plásticos no cuentan con garantía, al ser piezas estéticas sujetas a desgaste, vibración y condiciones externas.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>3. Tapabarros</p>
              <p className={sectionStyle}>Los tapabarros cuentan con una garantía de 7 días calendario únicamente por defectos de fabricación. No cubre daños por vibración, golpes, uso en terrenos irregulares o manipulación.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>4. Luces en tapabarros o integradas</p>
              <p className={sectionStyle}>Las luces integradas en tapabarros o partes plásticas cuentan con garantía de 7 días por defectos de fabricación, no cubriendo fallas derivadas de vibración, humedad o uso.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>5. Vibración del vehículo</p>
              <p className={sectionStyle}>El cliente reconoce que las partes plásticas y estéticas están expuestas a vibraciones constantes del vehículo, lo cual puede generar aflojamiento, fisuras o desgaste, sin que ello constituya falla de producto.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>6. Instalación</p>
              <p className={sectionStyle}>Cuando la instalación es realizada por LITIO ENERGY, se garantiza únicamente la correcta colocación inicial del componente.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>7. Causales de pérdida de garantía</p>
              <p className={`${sectionStyle} font-semibold text-rose-400`}>La garantía quedará sin efecto en caso de:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>golpes</li>
                <li>caídas</li>
                <li>vibración excesiva</li>
                <li>manipulación</li>
                <li>modificaciones</li>
                <li>uso en condiciones extremas</li>
              </ul>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
              <span>CONDICIONES DE GARANTÍA – VEHÍCULOS</span>
            </h3>
            <div className="space-y-2">
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>1. Alcance general</p>
              <p className={sectionStyle}>Los vehículos eléctricos están compuestos por múltiples sistemas (batería, motor, controladora, estructura, sistema de frenos, entre otros), cuyo funcionamiento depende del uso, mantenimiento y condiciones de operación. Por ello, la garantía aplica únicamente bajo condiciones normales de uso y previa evaluación técnica.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>2. VEHÍCULOS NUEVOS</p>
              <p className={sectionStyle}>Los vehículos nuevos comercializados por LITIO ENERGY cuentan con garantía en componentes eléctricos principales, conforme a los siguientes plazos:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Motor: hasta diez (10) meses</li>
                <li>Batería: hasta doce (12) meses</li>
                <li>Controladora: hasta seis (6) meses</li>
                <li>Pantalla: hasta seis (6) meses</li>
                <li>Acelerador: hasta seis (6) meses</li>
              </ul>
              <p className={sectionStyle}>Estas garantías cubren únicamente fallas atribuibles a defectos de fabricación, previa evaluación técnica de LITIO ENERGY, y no incluyen daños derivados de uso, manipulación, factores externos o condiciones del sistema del vehículo.</p>
              <p className={`${sectionStyle} font-semibold text-rose-400`}>Lo que no cubre:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>desgaste por uso</li>
                <li>mala manipulación</li>
                <li>sobrecarga del vehículo</li>
                <li>uso en condiciones extremas</li>
                <li>ingreso de agua o humedad</li>
                <li>golpes o caídas</li>
                <li>modificaciones o intervenciones por terceros</li>
                <li>uso distinto al recomendado</li>
              </ul>
              <p className={sectionStyle}>En el caso de vehículos nuevos de la marca Segway / Ninebot, algunos componentes pueden contar con plazos de garantía mayores, conforme a las condiciones del fabricante. En estos casos, la garantía será gestionada directamente por el representante autorizado de la marca en el país, siendo este el encargado de su validación, evaluación y atención. Cada componente se rige por su propio plazo de garantía, no siendo acumulables ni extensibles entre sí.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>3. VEHÍCULOS SEMINUEVOS / USADOS</p>
              <p className={sectionStyle}>Los vehículos seminuevos o usados se venden en el estado en que se encuentran, pudiendo presentar desgaste, uso previo o vida útil reducida. No cuentan con garantía, salvo que se indique expresamente lo contrario en el documento de venta. En caso de otorgarse garantía, esta será limitada y únicamente aplicable a la verificación de funcionamiento inicial dentro del plazo indicado.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>4. USO DEL VEHÍCULO</p>
              <p className={sectionStyle}>El cliente reconoce que el desempeño y durabilidad del vehículo dependen directamente del uso, incluyendo factores como peso, terreno, velocidad, carga, mantenimiento y condiciones externas</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>5. MANTENIMIENTO</p>
              <p className={sectionStyle}>El correcto funcionamiento del vehículo requiere mantenimiento periódico. La falta de mantenimiento puede generar fallas que no serán cubiertas por garantía.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>6. RELACIÓN CON COMPONENTES</p>
              <p className={sectionStyle}>La garantía del vehículo no implica cobertura total de todos sus componentes, los cuales se rigen por sus propias condiciones específicas de garantía.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>7. CONDICIÓN DE ENTREGA</p>
              <p className={sectionStyle}>El cliente declara recibir el vehículo en estado operativo al momento de la entrega, salvo observaciones registradas.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>8. PRUEBA Y RECEPCIÓN</p>
              <p className={sectionStyle}>Se recomienda al cliente verificar el funcionamiento del vehículo al momento de la entrega. Cualquier observación deberá ser comunicada de inmediato.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>9. CAUSALES DE PÉRDIDA DE GARANTÍA</p>
              <p className={`${sectionStyle} font-semibold text-rose-400`}>La garantía del vehículo quedará sin efecto en caso de:</p>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>manipulación por terceros</li>
                <li>modificaciones</li>
                <li>uso indebido o extremo</li>
                <li>sobrepeso</li>
                <li>ingreso de agua o humedad</li>
                <li>falta de mantenimiento</li>
                <li>alteración del sistema eléctrico</li>
              </ul>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>10. EVALUACIÓN DE GARANTÍA</p>
              <p className={sectionStyle}>Toda solicitud de garantía será evaluada previamente por LITIO ENERGY. La recepción del vehículo no implica aceptación automática del reclamo.</p>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-800">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-cyan-400 mb-2 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Condiciones Generales</span>
            </h3>
            <div className="space-y-2">
              <p className={sectionStyle}>El cliente declara haber leído, comprendido y aceptado las presentes condiciones de garantía, las cuales han sido puestas a su disposición antes de la contratación del servicio o adquisición del producto. Asimismo, reconoce que estas condiciones forman parte integral de la relación comercial con LITIO ENERGY. Para cualquier solicitud de garantía, será obligatoria la presentación del comprobante de pago o documento que acredite la compra o servicio. Las presentes condiciones de garantía se complementan con los Términos y Condiciones de LITIO ENERGY, prevaleciendo estos en caso de discrepancia o vacíos interpretativos.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>1. PRUEBA DE COMPRA</p>
              <p className={sectionStyle}>La garantía solo será válida si el cliente presenta comprobante de pago, orden de servicio o evidencia de la transacción.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>2. NO ACEPTACIÓN AUTOMÁTICA</p>
              <p className={sectionStyle}>La recepción del producto o equipo para evaluación no implica la aceptación automática de la garantía ni la obligación de cambio, reparación o devolución.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>3. DERECHO DE EVALUACIÓN</p>
              <p className={sectionStyle}>LITIO ENERGY se reserva el derecho de determinar, mediante evaluación técnica, si una falla corresponde o no a un caso cubierto por garantía.</p>
              <p className={`${sectionStyle} font-semibold text-cyan-300`}>4. PLAZOS DE ATENCIÓN</p>
              <p className={sectionStyle}>Los plazos de evaluación y atención de garantías podrán variar según la complejidad del caso y disponibilidad de repuestos, sin que ello genere responsabilidad para el taller. La garantía cubre exclusivamente lo expresamente indicado. Cualquier situación no contemplada será evaluada bajo criterio técnico.</p>
            </div>
          </div>

        </section>

        <footer className="text-center text-[10px] text-slate-600 pt-4 space-y-1">
          <p className="flex items-center justify-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Documento generado por el Sistema Litio Energy</span>
          </p>
          <p>AV. ARENALES 1450, LINCE — SAN BORJA — SURCO — LIMA, PERÚ</p>
          <p className="text-slate-700">© 2026 Litio Energy · GRUPO PERÚ CREARTE S.A.C. · RUC 20611007419 · Documento de uso exclusivo del taller</p>
        </footer>
      </main>
      </div>
    </CopyProtected>
  );
}
