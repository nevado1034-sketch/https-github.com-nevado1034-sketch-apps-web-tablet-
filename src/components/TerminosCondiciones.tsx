import React from "react";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import litioLogo from "../assets/litio-logo.png";
import CopyProtected from "./CopyProtected";

const sectionStyle = "text-[11px] text-slate-300 leading-relaxed space-y-2";

export default function TerminosCondiciones() {
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

        <div className="bg-gradient-to-r from-cyan-500/10 to-transparent border border-cyan-500/30 rounded-2xl px-5 py-4 text-center">
          <p className="text-sm font-bold text-white">
            Bienvenido a la familia <span className="text-cyan-400">LITIO ENERGY</span>, te recomendamos revisar nuestros Términos y Condiciones del servicio.
          </p>
        </div>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div>
            <div className="space-y-2">
              <p className={sectionStyle}>GRUPO PERÚ CREARTE S.A.C., identificado con el RUC N° 20611007419, bajo el nombre comercial LITIO ENERGY, presta sus servicios técnicos de acuerdo con los presentes Términos y Condiciones. Su aceptación podrá constar mediante firma física o digital, orden de servicio, WhatsApp, correo electrónico u otro medio que permita acreditar la conformidad del cliente. Estas condiciones no limitan los derechos reconocidos al consumidor por la normativa vigente.</p>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
              <span>1. Diagnóstico y Presupuesto</span>
            </h3>
            <div className="space-y-2">
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
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
              <span>2. Autorización y Alcance del Servicio</span>
            </h3>
            <div className="space-y-2">
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>El servicio comprende exclusivamente los trabajos y repuestos detallados en la cotización u orden de servicio aceptada por el cliente.</li>
                <li>El cliente autoriza a LITIO ENERGY a realizar la revisión, desmontaje, manipulación técnica, mediciones, encendido, carga y pruebas necesarias para ejecutar el servicio aprobado.</li>
                <li>Esta autorización no comprende modificaciones, reparaciones o reemplazos ajenos al alcance contratado. Cualquier ampliación del servicio se sujetará al procedimiento establecido en el numeral 1.</li>
                <li>El servicio podrá limitarse a la falla reportada, diagnosticada y aprobada. Salvo contratación expresa de una revisión integral, LITIO ENERGY no estará obligada a inspeccionar, reparar ni garantizar componentes ajenos al servicio contratado.</li>
                <li>El cliente reconoce que determinadas intervenciones técnicas pueden afectar, limitar o anular garantías otorgadas por fabricantes, distribuidores o terceros. LITIO ENERGY no será responsable por las decisiones adoptadas por dichos terceros cuando el riesgo haya sido informado y la intervención autorizada, sin perjuicio de su responsabilidad por la correcta ejecución del servicio realizado.</li>
              </ul>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
              <span>3. Aprobaciones y Medios de Comunicación</span>
            </h3>
            <div className="space-y-2">
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>El cliente deberá registrar en la orden de servicio su número de teléfono, WhatsApp y, cuando corresponda, correo electrónico. Las comunicaciones enviadas desde dichos canales se considerarán realizadas por el cliente mientras este no informe por escrito su modificación.</li>
                <li>Las aprobaciones, instrucciones y comunicaciones relacionadas con el servicio podrán realizarse mediante firma física o digital, WhatsApp, correo electrónico u otro canal previamente acordado que permita identificar al remitente y conservar el contenido de la comunicación.</li>
                <li>Las aprobaciones deberán permitir identificar claramente el servicio, repuesto, importe o condición aceptada. Los mensajes, cotizaciones y respuestas relacionados con la orden de servicio podrán conservarse como constancia de lo acordado.</li>
                <li>Las coordinaciones realizadas únicamente mediante llamada telefónica deberán ser confirmadas posteriormente por WhatsApp, correo electrónico u otro medio escrito. La llamada por sí sola no autoriza trabajos o cobros adicionales.</li>
                <li>El cliente podrá designar a otra persona para recibir información o aprobar decisiones relacionadas con el servicio, indicando previamente su nombre, documento de identidad, teléfono y alcance de la autorización. En ausencia de dicha designación, solo el titular de la orden podrá otorgar aprobaciones.</li>
                <li>Las comunicaciones de LITIO ENERGY serán remitidas a los datos proporcionados por el cliente. Será responsabilidad del cliente informar oportunamente cualquier cambio o dificultad para acceder a dichos medios.</li>
                <li>La suspensión del servicio por falta de respuesta del cliente se regirá por lo establecido en el numeral 1 de los presentes Términos y Condiciones.</li>
                <li>Cuando durante la ejecución del servicio se detecte la necesidad de realizar un trabajo o reemplazo adicional, LITIO ENERGY lo comunicará al cliente para su aprobación. Si no se recibe respuesta dentro de los veinte (20) minutos siguientes, podrá continuarse únicamente con el servicio originalmente aprobado, omitiéndose el trabajo adicional, siempre que ello sea técnicamente posible y seguro.</li>
                <li>Si el cliente aprueba el trabajo adicional posteriormente, su ejecución estará sujeta a disponibilidad y reprogramación. Cuando el avance del servicio haga necesario desmontar nuevamente el vehículo o componente, podrán generarse costos adicionales por desmontaje, armado y nuevas pruebas, los cuales serán informados y deberán ser aprobados antes de ejecutarse.</li>
                <li>Cuando el trabajo adicional resulte indispensable para continuar de manera técnica o segura, LITIO ENERGY podrá suspender temporalmente el servicio hasta recibir la decisión del cliente.</li>
              </ul>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
              <span>4. Tiempos de Entrega</span>
            </h3>
            <div className="space-y-2">
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>El plazo estimado para realizar el servicio será informado en la cotización u orden de servicio. Salvo que se acuerde expresamente una fecha fija, dicho plazo tendrá carácter referencial.</li>
                <li>El plazo comenzará a computarse desde que se cumplan las condiciones necesarias para iniciar el trabajo, incluyendo la aprobación correspondiente, la disponibilidad del vehículo, los repuestos requeridos y, cuando corresponda, el pago acordado.</li>
                <li>El plazo podrá modificarse por circunstancias que afecten razonablemente la ejecución del servicio, tales como:</li>
              </ul>
              <ul className={`${sectionStyle} list-disc list-inside ml-4`}>
                <li>complejidad técnica no identificable durante la revisión inicial;</li>
                <li>detección de fallas ocultas o adicionales;</li>
                <li>falta de disponibilidad, demora de proveedores o importación de repuestos;</li>
                <li>necesidad de fabricar, adaptar o solicitar componentes especiales;</li>
                <li>espera de información, accesorios, llaves, cargadores o decisiones del cliente;</li>
                <li>retrasos de empresas de transporte o terceros indispensables para el servicio;</li>
                <li>caso fortuito, fuerza mayor u otra circunstancia objetiva ajena al control de LITIO ENERGY.</li>
              </ul>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Cuando se produzca una variación relevante, LITIO ENERGY informará al cliente la causa y proporcionará un nuevo plazo estimado tan pronto como sea razonablemente posible.</li>
                <li>Los periodos durante los cuales el servicio permanezca detenido por falta de respuesta, información, entrega de componentes o cumplimiento de una obligación del cliente no serán contabilizados dentro del plazo estimado.</li>
                <li>LITIO ENERGY no será responsable por retrasos originados en circunstancias objetivas, justificadas y ajenas a su control que puedan ser acreditadas. Esta disposición no comprende retrasos directamente atribuibles a una actuación negligente o injustificada de LITIO ENERGY.</li>
              </ul>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
              <span>5. Responsabilidad del Cliente</span>
            </h3>
            <div className="space-y-2">
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Antes del ingreso del vehículo, el cliente deberá retirar dinero, documentos, dispositivos, herramientas y demás objetos personales que no sean necesarios para la prestación del servicio.</li>
                <li>El cliente deberá informar y verificar que las llaves, cargadores, candados, cascos, accesorios y demás bienes entregados junto con el vehículo hayan quedado registrados en la orden de servicio. LITIO ENERGY no será responsable por objetos no declarados ni consignados en dicho documento, salvo evidencia objetiva de su entrega.</li>
                <li>El cliente deberá revisar que el estado físico visible, los accesorios y las observaciones consignadas al momento de la recepción coincidan con las condiciones en las que entrega el vehículo, comunicando cualquier discrepancia antes de aceptar la orden de servicio.</li>
                <li>El cliente se compromete a proporcionar información completa y veraz sobre la falla reportada, síntomas, antecedentes, accidentes, exposición al agua, reparaciones anteriores, modificaciones, manipulación por terceros y cualquier otra circunstancia relevante para el diagnóstico o la seguridad del servicio.</li>
                <li>Cuando resulte necesario, el cliente deberá proporcionar las llaves, cargador, contraseñas, códigos de acceso, aplicaciones, controles u otros elementos indispensables para realizar las pruebas autorizadas. La falta de estos elementos podrá limitar el diagnóstico o suspender el cómputo del plazo de ejecución.</li>
                <li>El cliente declara ser propietario del vehículo o estar debidamente autorizado por su titular para entregarlo, aprobar el servicio y disponer de sus componentes. LITIO ENERGY podrá solicitar documentación o confirmación adicional cuando existan dudas razonables sobre dicha autorización.</li>
                <li>El cliente deberá advertir antes de la intervención si el vehículo o la batería presenta calentamiento anormal, olor, humo, fuga, hinchamiento, cortocircuito, ingreso de agua u otra condición que pueda representar un riesgo para las personas o las instalaciones.</li>
              </ul>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
              <span>6. Fallas Preexistentes y Manipulaciones</span>
            </h3>
            <div className="space-y-2">
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>El estado previo del vehículo y de sus componentes se determinará considerando la orden de servicio, las observaciones registradas, las fotografías, videos, pruebas funcionales y demás evidencia obtenida durante su recepción y evaluación.</li>
                <li>No serán atribuibles a LITIO ENERGY las fallas, daños, desgaste o irregularidades que se determine que existían antes del ingreso del vehículo o que fueron ocasionados por accidentes, golpes, ingreso de agua, humedad, corrosión, sobrecarga, falta de mantenimiento, uso inadecuado, componentes incompatibles, modificaciones o intervenciones realizadas previamente por el cliente o por terceros.</li>
                <li>El cliente reconoce que algunas fallas internas, ocultas o intermitentes pueden no ser visibles ni razonablemente detectables durante la recepción o revisión inicial, y manifestarse recién durante el desmontaje, reparación, armado, carga o pruebas de funcionamiento.</li>
                <li>Determinados componentes pueden encontrarse debilitados, deteriorados, alterados o instalados inadecuadamente antes del ingreso del vehículo y, debido a dicha condición previa, podrían quebrarse, desprenderse, deformarse, barrerse o dejar de funcionar durante una manipulación o desmontaje técnicamente necesario. Entre estas situaciones se encuentran:</li>
              </ul>
              <ul className={`${sectionStyle} list-disc list-inside ml-4`}>
                <li>pernos, tornillos, tuercas y roscas oxidadas, trabadas, desgastadas o barridas;</li>
                <li>piezas plásticas resecas, quebradizas, fisuradas o fatigadas;</li>
                <li>cables, terminales, conectores y soldaduras deteriorados internamente;</li>
                <li>componentes fijados con pegamentos, siliconas, adhesivos o materiales no originales;</li>
                <li>piezas soldadas, modificadas, mal instaladas o reparadas previamente;</li>
                <li>sellos, seguros, empaques, tapas o sujetadores faltantes o deteriorados;</li>
                <li>baterías, celdas, BMS, controladoras, motores o circuitos con humedad, corrosión, desbalance, recalentamiento o deterioro interno;</li>
                <li>cableado, firmware, controladoras, baterías o sistemas de seguridad alterados por terceros.</li>
              </ul>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Cuando se determine mediante evidencia técnica que la rotura, desprendimiento o falla de un componente se produjo como consecuencia de su deterioro, desgaste, corrosión, manipulación o instalación previa, y no por una ejecución incorrecta del servicio, dicha situación no será atribuible a LITIO ENERGY.</li>
                <li>La corrección de estas condiciones no forma parte del servicio inicialmente contratado y podrá generar costos adicionales por diagnóstico, extracción, reparación, fabricación, adaptación, repuestos, materiales, mano de obra, desmontaje, armado o nuevas pruebas.</li>
                <li>Los costos adicionales podrán comprender, entre otros:</li>
              </ul>
              <ul className={`${sectionStyle} list-disc list-inside ml-4`}>
                <li>extracción de pernos, tornillos o piezas trabadas;</li>
                <li>perforación, reconstrucción o reparación de roscas;</li>
                <li>reemplazo de tapas, seguros, empaques, conectores, terminales o cableado;</li>
                <li>retiro de pegamentos, siliconas, adhesivos o instalaciones no originales;</li>
                <li>limpieza y tratamiento de humedad, óxido o corrosión;</li>
                <li>reparación de soldaduras o conexiones anteriores;</li>
                <li>fabricación o adaptación de componentes;</li>
                <li>desmontaje y armado adicional;</li>
                <li>repetición de pruebas técnicas o funcionales.</li>
              </ul>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Cuando la condición sea identificable antes de la intervención, LITIO ENERGY la comunicará al cliente antes de continuar. Cuando se descubra durante el desmontaje o ejecución del servicio, se procurará dejar constancia mediante fotografías, videos u otra evidencia técnica y se aplicará el procedimiento de aprobación previsto en los numerales 1 y 3.</li>
                <li>Si el cliente no aprueba la reparación o reemplazo adicional, LITIO ENERGY podrá continuar únicamente con el servicio originalmente contratado cuando ello sea técnica y operativamente posible. Si la condición detectada impide continuar, rearmar o probar el vehículo de manera segura, el servicio podrá quedar suspendido hasta recibir la decisión del cliente.</li>
                <li>Cuando el cliente apruebe el trabajo adicional después de que el vehículo haya sido rearmado o cuando la intervención inicial ya hubiera avanzado, podrán generarse nuevos costos por desmontaje, armado y pruebas. Estos costos serán informados y requerirán aprobación antes de su ejecución.</li>
                <li>Si el vehículo ingresa apagado, inoperativo, bloqueado, sin batería, cargador, llave, contraseña o en condiciones que impidan efectuar una prueba completa, dicha limitación será registrada. En estos casos no será posible verificar integralmente su funcionamiento previo y las fallas detectadas posteriormente no podrán atribuirse automáticamente al servicio realizado.</li>
                <li>La aparición de una falla durante o después del servicio no determina por sí sola que haya sido ocasionada por LITIO ENERGY. Su origen se evaluará considerando el alcance contratado, el estado de ingreso, los componentes intervenidos, las pruebas realizadas y la evidencia técnica disponible.</li>
                <li>Las disposiciones de este numeral no excluyen la responsabilidad de LITIO ENERGY cuando exista evidencia objetiva de que el daño fue ocasionado directamente por una ejecución incorrecta, imprudente o negligente del servicio contratado.</li>
              </ul>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
              <span>7. Garantía del Servicio</span>
            </h3>
            <div className="space-y-2">
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>La evaluación de una solicitud de garantía tendrá un plazo mínimo de cuarenta y ocho (48) horas, contadas dentro de los días y horarios de atención de LITIO ENERGY, desde la recepción del vehículo o componente junto con la información necesaria para su revisión.</li>
                <li>Las cuarenta y ocho (48) horas corresponden únicamente al plazo mínimo de evaluación y diagnóstico, no necesariamente al plazo de reparación o solución definitiva.</li>
                <li>El plazo de evaluación podrá ampliarse según la complejidad de la falla, las pruebas necesarias, los procesos de carga o descarga de la batería, el desmontaje requerido, la revisión de proveedores o fabricantes, la disponibilidad de repuestos u otras condiciones técnicas justificadas. Cuando ello ocurra, LITIO ENERGY informará al cliente el motivo y el nuevo plazo estimado.</li>
                <li>La presentación de una solicitud de garantía no implica su aprobación automática. LITIO ENERGY realizará una evaluación técnica para determinar el origen de la falla y su relación con el servicio, repuesto o producto reclamado.</li>
                <li>Cuando se determine que la falla se encuentra cubierta por la garantía, LITIO ENERGY realizará sin costo la solución técnica correspondiente, la cual podrá consistir en ajuste, reinstalación, reparación o reemplazo del componente afectado, según el diagnóstico y las condiciones específicas aplicables.</li>
                <li>Una vez aprobada la garantía, el plazo de solución será informado de acuerdo con la complejidad del trabajo, las pruebas requeridas y la disponibilidad de los componentes necesarios.</li>
                <li>La garantía no cubre fallas o daños ocasionados por:</li>
              </ul>
              <ul className={`${sectionStyle} list-disc list-inside ml-4`}>
                <li>uso inadecuado o contrario a las recomendaciones brindadas;</li>
                <li>accidentes, golpes, caídas, sobrecarga o exposición a condiciones no adecuadas;</li>
                <li>ingreso de agua, humedad, corrosión, contaminación o agentes externos;</li>
                <li>uso de cargadores, repuestos, accesorios o componentes incompatibles;</li>
                <li>desgaste natural, falta de mantenimiento o deterioro propio del uso;</li>
                <li>modificaciones de cableado, firmware, controladora, batería o sistemas electrónicos;</li>
                <li>manipulación, apertura, reparación o intervención posterior realizada por el cliente o por terceros;</li>
                <li>fallas preexistentes, daños ocultos o componentes ajenos al servicio contratado;</li>
                <li>causas externas que no guarden relación con el trabajo realizado por LITIO ENERGY.</li>
              </ul>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>La intervención del cliente o de terceros no autorizados dejará sin garantía el componente manipulado, los sistemas relacionados y cualquier daño derivado de dicha intervención. LITIO ENERGY no asumirá costos de diagnóstico, reparación o reemplazo originados por dichas manipulaciones.</li>
                <li>Cuando el cliente proporcione el repuesto, batería, cargador, accesorio o componente, la garantía de LITIO ENERGY se limitará a la correcta ejecución de la instalación. La calidad, procedencia, compatibilidad, funcionamiento y duración del producto entregado por el cliente serán responsabilidad de este o de su proveedor.</li>
                <li>La garantía no comprende componentes, sistemas o fallas que no hayan formado parte del servicio contratado, conforme al alcance indicado en la cotización u orden de servicio.</li>
                <li>En caso de discrepancia, prevalecerán las condiciones específicas informadas y aceptadas para el servicio o producto contratado, sin perjuicio de las garantías legales que correspondan.</li>
              </ul>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
              <span>8. Almacenamiento y Abandono</span>
            </h3>
            <div className="space-y-2">
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>El cliente deberá recoger el vehículo, batería, repuesto o componente dentro de los diez (10) días calendario siguientes a la primera comunicación documentada mediante la cual LITIO ENERGY informe que:</li>
              </ul>
              <ul className={`${sectionStyle} list-disc list-inside ml-4`}>
                <li>el servicio ha finalizado;</li>
                <li>el diagnóstico o evaluación ha concluido;</li>
                <li>el presupuesto ha sido rechazado;</li>
                <li>el trabajo ha sido suspendido o cerrado por falta de aprobación;</li>
                <li>el equipo se encuentra disponible para su devolución.</li>
              </ul>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Vencido dicho plazo, se aplicará un cobro de S/10.00 por cada día calendario de almacenamiento, contado desde el día once hasta la fecha efectiva de recojo.</li>
                <li>El cobro de almacenamiento se aplicará independientemente de que el vehículo se encuentre reparado, parcialmente intervenido, desarmado o sin reparación, siempre que LITIO ENERGY haya comunicado que está disponible para su recojo.</li>
                <li>Para retirar el equipo, el cliente deberá cancelar los montos vencidos y exigibles correspondientes al diagnóstico, servicio, repuestos, almacenamiento, traslado y demás conceptos previamente informados y relacionados con la orden de servicio.</li>
                <li>LITIO ENERGY podrá ejercer el derecho de retención sobre el equipo mientras existan montos vencidos vinculados directamente con el diagnóstico, reparación, custodia o almacenamiento del mismo, conforme a la legislación aplicable.</li>
                <li>Transcurridos treinta (30) días calendario sin que el cliente realice el recojo, LITIO ENERGY podrá trasladar el equipo a otra sede o a un almacén seguro, dejando constancia de su estado. Los costos extraordinarios de traslado o custodia serán informados y podrán ser cargados al cliente cuando resulten razonables y acreditables.</li>
                <li>El almacenamiento prolongado puede ocasionar descarga natural de la batería, pérdida de presión en los neumáticos, deterioro por inactividad, oxidación, desbalance de celdas u otras variaciones propias del paso del tiempo. LITIO ENERGY no será responsable por dichos efectos cuando no hayan sido ocasionados por una manipulación negligente o por condiciones inadecuadas de almacenamiento atribuibles al taller.</li>
                <li>Si el vehículo o la batería presenta riesgo de incendio, sobrecalentamiento, cortocircuito, fuga, hinchamiento u otra condición peligrosa, LITIO ENERGY podrá desconectarlo, aislarlo, reubicarlo o adoptar las medidas urgentes necesarias para proteger a las personas y las instalaciones. Los costos razonables derivados de estas medidas podrán ser asumidos por el cliente cuando el riesgo provenga del estado previo del equipo.</li>
                <li>Transcurridos treinta (60) días calendario sin que el cliente realice el recojo del equipo, se considerará el bien en estado de abandono. En tal caso, el cliente autoriza expresamente a LITIO ENERGY a disponer del equipo, incluyendo su venta, remate o cualquier otra forma de realización, con la finalidad de recuperar los costos incurridos por diagnóstico, reparación, almacenamiento y gastos asociados. En caso de existir un excedente luego de deducidos los costos, este podrá ser puesto a disposición del cliente.</li>
              </ul>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
              <span>9. Pagos y Recargos</span>
            </h3>
            <div className="space-y-2">
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Los pagos podrán realizarse mediante efectivo, transferencia bancaria, Yape, Plin, tarjeta de débito, tarjeta de crédito u otro medio expresamente autorizado por LITIO ENERGY.</li>
                <li>Los precios corresponden a pagos realizados en efectivo, transferencia bancaria, Yape o Plin.</li>
                <li>Los pagos efectuados con tarjeta de débito o crédito tendrán un recargo adicional de cuatro punto cinco por ciento (4.5 %).</li>
                <li>El pago se considerará realizado únicamente cuando el dinero haya sido recibido y verificado en las cuentas o medios oficiales de LITIO ENERGY. Las capturas de pantalla, constancias de operación o mensajes no acreditan por sí solos el pago mientras la transacción no figure como abonada.</li>
                <li>El cliente deberá realizar los pagos únicamente a las cuentas, números o medios comunicados oficialmente por LITIO ENERGY. Los pagos efectuados a terceros o cuentas no autorizadas no serán reconocidos, salvo confirmación expresa de la empresa.</li>
                <li>Cuando se haya pactado un adelanto, este será aplicado al costo del diagnóstico, servicio, repuestos o pedido correspondiente. Las condiciones de cancelación de pedidos especiales o repuestos solicitados se regirán por el numeral 12.</li>
                <li>El cliente deberá cancelar la totalidad del saldo pendiente antes de la entrega o retiro del vehículo, batería, repuesto o componente.</li>
                <li>Si un pago es rechazado, anulado, desconocido, revertido o sujeto a contracargo por la entidad financiera, se considerará pendiente hasta que el importe sea efectivamente abonado y confirmado.</li>
              </ul>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
              <span>10. Condiciones Operativas, Conducta y Seguridad</span>
            </h3>
            <div className="space-y-2">
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>El cliente y sus acompañantes deberán respetar las instrucciones de seguridad, las áreas de acceso restringido y las disposiciones operativas de LITIO ENERGY durante su permanencia en las instalaciones.</li>
                <li>Queda prohibido ingresar sin autorización a las áreas técnicas, manipular vehículos, baterías, herramientas o equipos del taller, interferir con los trabajos del personal o realizar cualquier conducta que pueda generar daños, accidentes o interrupciones en las operaciones.</li>
                <li>No se permitirán insultos, amenazas, agresiones, hostigamiento, acoso, comentarios racistas, xenófobos, sexistas, discriminatorios ni cualquier conducta que afecte la dignidad, integridad o seguridad del personal, clientes o terceros.</li>
                <li>Tampoco se permitirá el ingreso o permanencia de personas bajo efectos evidentes del alcohol o sustancias que alteren su conducta, portando armas o realizando actos que representen un riesgo para las personas, los vehículos o las instalaciones.</li>
                <li>Ante una conducta inadecuada, LITIO ENERGY podrá exigir su cese inmediato. Si la conducta persiste, se repite o reviste gravedad, podrá rechazar el ingreso del vehículo, suspender la atención, solicitar el retiro de la persona o dar por finalizado el servicio. En casos de agresión, amenaza, acoso o riesgo grave, estas medidas podrán adoptarse inmediatamente y sin advertencia previa.</li>
                <li>La suspensión o finalización del servicio por estas causas no libera al cliente del pago del diagnóstico, trabajos realizados, repuestos utilizados o solicitados y demás gastos previamente autorizados. El vehículo quedará disponible para su entrega conforme a las condiciones de pago y recojo establecidas en estos términos.</li>
                <li>Estas disposiciones serán también aplicables a familiares, acompañantes, conductores, representantes o personas autorizadas por el cliente.</li>
                <li>LITIO ENERGY podrá registrar la incidencia, conservar mensajes, grabaciones, videos y demás evidencias, así como comunicar los hechos a las autoridades cuando corresponda.</li>
                <li>La aplicación de estas medidas no impedirá que el cliente formule observaciones, solicite el Libro de Reclamaciones o ejerza sus derechos de manera respetuosa y conforme a ley.</li>
              </ul>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
              <span>11. Conformidad del Servicio</span>
            </h3>
            <div className="space-y-2">
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Al momento de la entrega, el cliente o la persona autorizada para recibir el vehículo deberá verificar, en la medida de lo posible, el servicio realizado, el estado físico visible y los accesorios entregados.</li>
                <li>La entrega podrá realizarse en las instalaciones de LITIO ENERGY, en otra sede, mediante taxi, motorizado, courier, empresa de transporte o cualquier otro medio previamente coordinado con el cliente.</li>
                <li>Cuando el vehículo sea recibido por un familiar, trabajador, conductor, conserje u otra persona designada por el cliente, la entrega se considerará válidamente realizada en su representación. La falta de conocimientos técnicos de quien recibe no invalida la recepción del vehículo ni la verificación de su estado físico visible.</li>
                <li>La entrega podrá acreditarse mediante firma, constancia de entrega, mensaje de confirmación, fotografía, video, guía, comprobante de envío o registro proporcionado por el transportista.</li>
                <li>Antes de la entrega o despacho, LITIO ENERGY podrá registrar mediante fotografías o videos el estado físico del vehículo, sus accesorios y las pruebas de funcionamiento realizadas.</li>
                <li>Cuando la entrega sea presencial, cualquier observación por rayaduras, golpes, deformaciones, accesorios faltantes u otras condiciones visibles deberá comunicarse antes de retirar el vehículo de las instalaciones.</li>
                <li>Cuando la entrega se realice mediante movilidad o transporte, el cliente deberá revisar el vehículo inmediatamente después de recibirlo y comunicar cualquier daño visible o faltante dentro de las veinticuatro (24) horas siguientes, adjuntando fotografías, videos u otra evidencia que permita verificar lo ocurrido.</li>
                <li>Si la movilidad o empresa de transporte fue elegida o contratada directamente por el cliente, LITIO ENERGY no será responsable por daños, pérdidas o incidentes producidos durante el traslado que sean atribuibles al transportista, siempre que exista evidencia del estado del vehículo antes del despacho.</li>
                <li>La ausencia de observaciones al momento de la entrega constituirá conformidad respecto del servicio realizado y del estado físico visible del vehículo, sin perjuicio de las fallas técnicas cubiertas por la garantía ni de situaciones que puedan acreditarse posteriormente mediante evidencia objetiva.</li>
                <li>No serán atribuibles a LITIO ENERGY los daños, faltantes o alteraciones ocurridos después de la entrega, salvo que exista evidencia objetiva que demuestre que se originaron antes de ella o fueron consecuencia directa del servicio realizado.</li>
                <li>La recepción del vehículo no implica conformidad con fallas ocultas que no podían ser razonablemente advertidas al momento de la entrega. Estas serán evaluadas conforme al numeral 7 y a las Condiciones Específicas de Garantía.</li>
                <li>La entrega del vehículo estará sujeta a la cancelación de los montos vencidos correspondientes al servicio, repuestos y demás conceptos aplicables, salvo acuerdo escrito distinto con LITIO ENERGY.</li>
              </ul>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
              <span>12. Repuestos y Pedidos</span>
            </h3>
            <div className="space-y-2">
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Los repuestos, accesorios o componentes serán adquiridos o solicitados únicamente después de la aprobación del cliente y, cuando corresponda, del pago del adelanto indicado en la cotización.</li>
                <li>La selección del repuesto se realizará considerando la marca, modelo, versión, número de serie, medidas, conexiones y demás características verificables del vehículo. En algunos casos será necesario desmontar o revisar físicamente el componente antes de confirmar su compatibilidad.</li>
                <li>Los pedidos especiales, importados, fabricados, modificados o solicitados exclusivamente para un cliente podrán requerir el pago parcial o total por adelantado.</li>
                <li>Una vez que un pedido especial haya sido confirmado al proveedor, importado, fabricado o modificado, su cancelación estará sujeta a las condiciones del proveedor y a los costos efectivamente generados.</li>
                <li>Si el cliente cancela el pedido después de iniciada su gestión, LITIO ENERGY podrá descontar del adelanto los gastos no recuperables y debidamente sustentables, tales como compra del repuesto, fabricación, importación, transporte, comisiones, adaptación o penalidades del proveedor. Si existiera un saldo a favor del cliente, este será devuelto.</li>
                <li>Cuando el proveedor permita anular o devolver el pedido, LITIO ENERGY gestionará la devolución y descontará únicamente los costos efectivamente generados por dicha operación.</li>
                <li>Si el repuesto resulta incompatible debido a información incorrecta o incompleta proporcionada por el cliente, los costos de devolución, cambio, transporte o nuevo pedido podrán ser asumidos por este. Esta disposición no será aplicable cuando la incompatibilidad sea consecuencia de un error atribuible a LITIO ENERGY.</li>
                <li>LITIO ENERGY no sustituirá el repuesto aprobado por otro de diferente marca, modelo, capacidad, condición o especificación sin informar previamente al cliente y obtener su conformidad.</li>
                <li>La disponibilidad y el plazo de llegada de los repuestos dependen del stock propio, proveedores, fabricantes, transporte e importación, y se sujetan a lo establecido en el numeral 4.</li>
                <li>Los componentes retirados podrán ser entregados al cliente si los solicita antes de la entrega del vehículo, excepto cuando:</li>
                <li>deban devolverse al proveedor para aplicar una garantía;</li>
                <li>formen parte de un sistema de intercambio;</li>
                <li>su manipulación o entrega represente un riesgo;</li>
                <li>constituyan residuos peligrosos que deban gestionarse de manera especializada; o</li>
                <li>el cliente haya autorizado previamente su descarte.</li>
              </ul>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
              <span>13. Disposiciones Finales</span>
            </h3>
            <div className="space-y-2">
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>El cliente declara haber recibido acceso a los presentes Términos y Condiciones, así como haber tenido la posibilidad de leerlos y realizar consultas antes de aceptar el servicio.</li>
                <li>La aceptación podrá constar mediante firma física o digital, marcación de una casilla de aceptación, mensaje de WhatsApp, correo electrónico u otro medio que permita identificar al cliente y acreditar su conformidad.</li>
                <li>Forman parte del servicio contratado:</li>
              </ul>
              <ul className={`${sectionStyle} list-disc list-inside ml-4`}>
                <li>la cotización aprobada;</li>
                <li>la orden de servicio;</li>
                <li>el comprobante de pago;</li>
                <li>la constancia de entrega;</li>
                <li>las Condiciones Específicas de Garantía;</li>
                <li>las autorizaciones adicionales; y</li>
                <li>las comunicaciones verificables relacionadas con el servicio.</li>
              </ul>
              <ul className={`${sectionStyle} list-disc list-inside`}>
                <li>Cuando exista una diferencia entre estos Términos y Condiciones y una condición específica expresamente consignada en la cotización u orden de servicio, prevalecerá esta última únicamente respecto del servicio particular contratado, sin afectar los derechos reconocidos por la normativa vigente.</li>
                <li>Se aplicará la versión de los Términos y Condiciones vigente e informada en la fecha de aceptación del servicio. Las modificaciones posteriores se aplicarán únicamente a nuevas contrataciones, salvo aceptación expresa del cliente.</li>
                <li>Si alguna disposición fuera declarada inválida, abusiva o inaplicable, ello no afectará la validez de las demás cláusulas, que continuarán vigentes en todo aquello que resulte legalmente exigible.</li>
                <li>Los datos personales, fotografías, videos y registros técnicos recopilados durante la recepción, diagnóstico, reparación, entrega o atención de garantías podrán utilizarse para identificar al cliente, ejecutar el servicio, documentar el estado del vehículo, mantener la seguridad, realizar control de calidad y atender reclamos o controversias.</li>
                <li>El cliente autoriza a LITIO ENERGY a registrar, editar y utilizar fotografías y videos del vehículo y de los trabajos realizados con fines informativos, educativos, comerciales y publicitarios, incluyendo su publicación en redes sociales, página web, anuncios y material promocional.</li>
                <li>LITIO ENERGY no mostrará el nombre, rostro, voz, teléfono, documentos, conversaciones ni otros datos personales del cliente. Asimismo, ocultará la placa, número de serie, chasis, códigos QR, direcciones y cualquier elemento que permita identificar al propietario, salvo que exista un acuerdo distinto y el cliente autorice expresamente la aparición de su imagen y/o voz en una publicación.</li>
                <li>Cuando el cliente acepte aparecer, dicha autorización será gratuita y no exclusiva. Su participación no implica que el contenido será necesariamente monetizado y, en caso de que genere ingresos, no dará lugar al pago de remuneraciones, regalías, participación en dichos ingresos ni compensación económica, salvo acuerdo escrito distinto entre las partes.</li>
                <li>Esta autorización podrá comprender la edición, recorte, adaptación y publicación del contenido en redes sociales, página web, anuncios y materiales promocionales de LITIO ENERGY, siempre dentro de la finalidad previamente informada y aceptada por el cliente.</li>
                <li>Esta autorización no implica que el cliente recomiende públicamente a LITIO ENERGY ni comprende el uso de su imagen o voz.</li>
                <li>Si el cliente no desea autorizar el uso publicitario de las fotografías o videos de su vehículo, deberá indicarlo al momento de dejarlo en el taller, dejándose constancia de su negativa en la orden de servicio. Dicha negativa no afectará la atención, precio ni garantía del servicio.</li>
                <li>Ninguna disposición de estos Términos y Condiciones limita el derecho del cliente a presentar una queja o reclamo ante LITIO ENERGY o recurrir ante la autoridad competente.</li>
              </ul>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-800">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-cyan-400 mb-2 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Constancia de Aceptación</span>
            </h3>
            <div className="space-y-2">
              <p className={sectionStyle}>Antes del inicio del servicio, el cliente declara haber tenido acceso a los presentes Términos y Condiciones mediante enlace digital y haber contado con la posibilidad de leerlos y formular consultas. La aceptación quedará acreditada mediante la firma de la orden de servicio, aceptación digital, marcación de la casilla correspondiente o mensaje expreso enviado desde el número de WhatsApp o correo electrónico registrado por el cliente. Las aprobaciones específicas relacionadas con trabajos, repuestos, costos o modificaciones del servicio se regirán por el numeral 3. Las coordinaciones realizadas mediante llamada telefónica deberán ser confirmadas posteriormente por un medio escrito cuando impliquen una aprobación o modificación de lo contratado. En caso el cliente no manifieste observaciones previas al inicio del servicio, se entenderá que acepta íntegramente las condiciones aquí descritas.</p>
            </div>
          </div>

        </section>

        <footer className="text-center text-[10px] text-slate-600 pt-4 space-y-1">
          <p className="flex items-center justify-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Documento generado por el Sistema Litio Energy</span>
          </p>
          <p>SAN ISIDRO — LINCE — SAN BORJA — SURCO — LIMA, PERÚ</p>
          <p className="text-slate-700">© 2026 Litio Energy · GRUPO PERÚ CREARTE S.A.C. · RUC 20611007419 · Documento de uso exclusivo del taller</p>
        </footer>
      </main>
      </div>
    </CopyProtected>
  );
}
