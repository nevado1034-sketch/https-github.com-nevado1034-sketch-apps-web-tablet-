import React from "react";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import litioLogo from "../assets/litio-logo.png";

const sectionStyle = "text-[11px] text-slate-300 leading-relaxed space-y-2";

export default function TerminosCondiciones() {
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
              Términos y Condiciones
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-950 border border-slate-700 text-cyan-400">
          CÓDIGO GQ-LE-03 · V1
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
            Términos y <span className="text-cyan-400">Condiciones</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            GRUPO PERÚ CREARTE S.A.C. · RUC N° 20611007419 · Nombre comercial: LITIO ENERGY
          </p>
        </div>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <p className={sectionStyle}>
            GRUPO PERÚ CREARTE S.A.C., identificado con el RUC N° 20611007419, bajo el nombre comercial LITIO ENERGY, presta sus servicios técnicos de acuerdo con los presentes Términos y Condiciones. Su aceptación podrá constar mediante firma física o digital, orden de servicio, WhatsApp, correo electrónico u otro medio que permita acreditar la conformidad del cliente. Estas condiciones no limitan los derechos reconocidos al consumidor por la normativa vigente.
          </p>

          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">1. Diagnóstico y Presupuesto</h3>
            <ul className={`${sectionStyle} list-disc list-inside`}>
              <li>El diagnóstico técnico comprende la revisión inicial y las pruebas razonablemente necesarias para identificar las fallas reportadas o detectadas en el vehículo.</li>
              <li>El costo del diagnóstico será informado previamente al cliente y deberá ser pagado una vez realizado, incluso si posteriormente no se aprueba la reparación. No será reembolsable, salvo que el diagnóstico no haya sido efectuado, exista un incumplimiento atribuible a LITIO ENERGY o corresponda su devolución conforme a ley.</li>
              <li>El diagnóstico podrá requerir la apertura, desmontaje, carga, encendido o prueba de determinados componentes. Cuando sea necesario realizar un procedimiento adicional que genere un costo o riesgo no informado inicialmente, se solicitará previamente la autorización del cliente.</li>
              <li>El diagnóstico se realiza sobre la base de las pruebas posibles al momento de la evaluación. Por ello, pueden presentarse fallas ocultas, intermitentes o adicionales que solo sean detectables durante el desmontaje, reparación o prueba del vehículo.</li>
              <li>El presupuesto inicial detallará los trabajos, repuestos y costos identificados durante el diagnóstico. Cualquier modificación o trabajo adicional será comunicado al cliente y requerirá su autorización expresa antes de ser ejecutado.</li>
              <li>La falta de respuesta del cliente no constituye autorización. Mientras no exista aprobación, el servicio quedará suspendido y los plazos de entrega se ampliarán por el tiempo de espera correspondiente.</li>
              <li>Si el cliente no aprueba la reparación, deberá cancelar el diagnóstico y los trabajos de desmontaje, pruebas, materiales o armado que hayan sido previamente informados y autorizados.</li>
              <li>Cuando el vehículo no pueda ser rearmado en las mismas condiciones sin reemplazar piezas quebradas, deterioradas, oxidadas, pegadas o previamente manipuladas, LITIO ENERGY comunicará dicha situación al cliente antes de continuar.</li>
              <li>El presupuesto tendrá una vigencia de diez (10) días calendario desde su emisión y estará sujeto a la disponibilidad de repuestos. Una vez aprobado, el precio solo podrá modificarse por trabajos adicionales expresamente autorizados por el cliente.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">2. Autorización y Alcance del Servicio</h3>
            <ul className={`${sectionStyle} list-disc list-inside`}>
              <li>El servicio comprende exclusivamente los trabajos y repuestos detallados en la cotización u orden de servicio aceptada por el cliente.</li>
              <li>El cliente autoriza a LITIO ENERGY a realizar la revisión, desmontaje, manipulación técnica, mediciones, encendido, carga y pruebas necesarias para ejecutar el servicio aprobado.</li>
              <li>Esta autorización no comprende modificaciones, reparaciones o reemplazos ajenos al alcance contratado.</li>
              <li>El servicio podrá limitarse a la falla reportada, diagnosticada y aprobada.</li>
              <li>El cliente reconoce que determinadas intervenciones técnicas pueden afectar, limitar o anular garantías otorgadas por fabricantes, distribuidores o terceros.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">3. Aprobaciones y Medios de Comunicación</h3>
            <ul className={`${sectionStyle} list-disc list-inside`}>
              <li>Las aprobaciones, instrucciones y comunicaciones relacionadas con el servicio podrán realizarse mediante firma física o digital, WhatsApp, correo electrónico u otro canal previamente acordado.</li>
              <li>Las coordinaciones realizadas únicamente mediante llamada telefónica deberán ser confirmadas posteriormente por WhatsApp, correo electrónico u otro medio escrito.</li>
              <li>Cuando durante la ejecución del servicio se detecte la necesidad de realizar un trabajo o reemplazo adicional, LITIO ENERGY lo comunicará al cliente para su aprobación.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">4. Tiempos de Entrega</h3>
            <ul className={`${sectionStyle} list-disc list-inside`}>
              <li>El plazo estimado para realizar el servicio será informado en la cotización u orden de servicio. Salvo que se acuerde expresamente una fecha fija, dicho plazo tendrá carácter referencial.</li>
              <li>El plazo podrá modificarse por circunstancias que afecten razonablemente la ejecución del servicio.</li>
              <li>Los periodos durante los cuales el servicio permanezca detenido por falta de respuesta del cliente no serán contabilizados dentro del plazo estimado.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">5. Responsabilidad del Cliente</h3>
            <ul className={`${sectionStyle} list-disc list-inside`}>
              <li>Antes del ingreso del vehículo, el cliente deberá retirar dinero, documentos, dispositivos, herramientas y demás objetos personales que no sean necesarios para la prestación del servicio.</li>
              <li>El cliente deberá informar y verificar que las llaves, cargadores, candados, cascos, accesorios y demás bienes entregados junto con el vehículo hayan quedado registrados en la orden de servicio.</li>
              <li>El cliente se compromete a proporcionar información completa y veraz sobre la falla reportada.</li>
              <li>El cliente declara ser propietario del vehículo o estar debidamente autorizado por su titular.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">6. Fallas Preexistentes y Manipulaciones</h3>
            <ul className={`${sectionStyle} list-disc list-inside`}>
              <li>No serán atribuibles a LITIO ENERGY las fallas, daños, desgaste o irregularidades que se determine que existían antes del ingreso del vehículo.</li>
              <li>Cuando se determine que la rotura, desprendimiento o falla de un componente se produjo como consecuencia de su deterioro previo, dicha situación no será atribuible a LITIO ENERGY.</li>
              <li>La corrección de estas condiciones no forma parte del servicio inicialmente contratado y podrá generar costos adicionales.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">7. Garantía del Servicio</h3>
            <ul className={`${sectionStyle} list-disc list-inside`}>
              <li>La evaluación de una solicitud de garantía tendrá un plazo mínimo de cuarenta y ocho (48) horas.</li>
              <li>La garantía no cubre fallas o daños ocasionados por uso inadecuado, accidentes, golpes, ingreso de agua, uso de cargadores incompatibles, desgaste natural, manipulación por terceros, entre otros.</li>
              <li>La intervención del cliente o de terceros no autorizados dejará sin garantía el componente manipulado.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">8. Almacenamiento y Abandono</h3>
            <ul className={`${sectionStyle} list-disc list-inside`}>
              <li>El cliente deberá recoger el vehículo dentro de los diez (10) días calendario siguientes a la comunicación de que el servicio ha finalizado.</li>
              <li>Vencido dicho plazo, se aplicará un cobro de S/10.00 por cada día calendario de almacenamiento.</li>
              <li>Transcurridos sesenta (60) días calendario sin recojo, se considerará el bien en estado de abandono y LITIO ENERGY podrá disponer del equipo.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">9. Pagos y Recargos</h3>
            <ul className={`${sectionStyle} list-disc list-inside`}>
              <li>Los pagos podrán realizarse mediante efectivo, transferencia bancaria, Yape, Plin, tarjeta de débito o crédito.</li>
              <li>Los pagos con tarjeta de débito o crédito tendrán un recargo adicional de 4.5%.</li>
              <li>El cliente deberá cancelar la totalidad del saldo pendiente antes de la entrega del vehículo.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">10. Condiciones Operativas, Conducta y Seguridad</h3>
            <ul className={`${sectionStyle} list-disc list-inside`}>
              <li>El cliente y sus acompañantes deberán respetar las instrucciones de seguridad y las disposiciones operativas de LITIO ENERGY.</li>
              <li>Queda prohibido ingresar sin autorización a las áreas técnicas, manipular vehículos, baterías, herramientas o equipos del taller.</li>
              <li>No se permitirán insultos, amenazas, agresiones, hostigamiento, acoso ni cualquier conducta que afecte la dignidad del personal.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">11. Conformidad del Servicio</h3>
            <ul className={`${sectionStyle} list-disc list-inside`}>
              <li>Al momento de la entrega, el cliente deberá verificar el servicio realizado, el estado físico visible y los accesorios entregados.</li>
              <li>La ausencia de observaciones al momento de la entrega constituirá conformidad respecto del servicio realizado.</li>
              <li>La entrega del vehículo estará sujeta a la cancelación de los montos vencidos.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">12. Repuestos y Pedidos</h3>
            <ul className={`${sectionStyle} list-disc list-inside`}>
              <li>Los repuestos serán adquiridos o solicitados únicamente después de la aprobación del cliente.</li>
              <li>Los pedidos especiales podrán requerir el pago parcial o total por adelantado.</li>
              <li>LITIO ENERGY no sustituirá el repuesto aprobado por otro sin informar previamente al cliente.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">13. Disposiciones Finales</h3>
            <ul className={`${sectionStyle} list-disc list-inside`}>
              <li>El cliente declara haber recibido acceso a los presentes Términos y Condiciones.</li>
              <li>El cliente autoriza a LITIO ENERGY a registrar, editar y utilizar fotografías y videos del vehículo con fines informativos, educativos, comerciales y publicitarios.</li>
              <li>LITIO ENERGY no mostrará datos personales del cliente sin autorización expresa.</li>
              <li>Ninguna disposición limita el derecho del cliente a presentar una queja o reclamo.</li>
            </ul>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-cyan-400 mb-2 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Constancia de Aceptación</span>
            </h3>
            <p className={sectionStyle}>
              Antes del inicio del servicio, el cliente declara haber tenido acceso a los presentes Términos y Condiciones mediante enlace digital y haber contado con la posibilidad de leerlos y formular consultas. La aceptación quedará acreditada mediante la firma de la orden de servicio, aceptación digital, marcación de la casilla correspondiente o mensaje expreso enviado desde el número de WhatsApp o correo electrónico registrado por el cliente.
            </p>
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
