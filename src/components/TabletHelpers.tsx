import React, { useRef, useState, useEffect } from "react";
import { Camera, Upload, Trash2, Check, Video, RefreshCw, AlertCircle, Play } from "lucide-react";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onClear: () => void;
  initialData?: string;
  placeholderText?: string;
}

export function SignaturePad({ onSave, onClear, initialData, placeholderText = "Dibuja tu firma aquí" }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set line styles
    ctx.strokeStyle = "#06b6d4"; // cyan-500
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Set background
    ctx.fillStyle = "#020617"; // slate-950
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (initialData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setHasSigned(true);
      };
      img.src = initialData;
    }
  }, [initialData]);

  // Adjust canvas size to parent container dynamically
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect && rect.width) {
        // Save current contents
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d");
        if (tempCtx) {
          tempCtx.drawImage(canvas, 0, 0);
        }

        canvas.width = rect.width;
        canvas.height = 150;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#020617";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = "#06b6d4";
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          // Draw back saved contents
          ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
        }
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e.nativeEvent);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e.nativeEvent);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveSignature();
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (canvas && hasSigned) {
      onSave(canvas.toDataURL("image/png"));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
    onClear();
  };

  return (
    <div className="space-y-1.5 w-full">
      <div className="relative border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
        <canvas
          ref={canvasRef}
          height={150}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full cursor-crosshair block touch-none"
        />
        {!hasSigned && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <span className="text-xs text-slate-600 font-mono italic">{placeholderText}</span>
          </div>
        )}
      </div>
      <div className="flex justify-between items-center px-1">
        <p className="text-[10px] text-slate-500 font-mono">
          {hasSigned ? "✓ Conformidad Dibujada" : "Usa el dedo o mouse para firmar"}
        </p>
        <button
          type="button"
          onClick={clearCanvas}
          className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors uppercase font-mono px-2 py-1 bg-rose-950/25 border border-rose-900/30 rounded"
        >
          Borrar Firma
        </button>
      </div>
    </div>
  );
}

// ----------------- PHOTO AND MULTIMEDIA MANAGER -----------------

interface PhotoManagerProps {
  photos: string[];
  onPhotosChange: (updatedPhotos: string[]) => void;
  title?: string;
  subtitle?: string;
  storageBadge?: string;
}

// Simulated EV diagnostics photos in case no camera or file is available
const SIMULATED_EV_PHOTOS = [
  {
    name: "Controladora dañado por agua",
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%230f172a'/><text x='50%25' y='40%25' dominant-baseline='middle' text-anchor='middle' fill='%23ef4444' font-family='sans-serif' font-size='16' font-weight='bold'>SULFATO / HUMEDAD CONTROLADORA</text><text x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='sans-serif' font-size='11'>LITIO ENERGY - REPORTE DE EVIDENCIA</text><rect x='80' y='200' width='240' height='40' rx='5' fill='%231e293b' stroke='%23ef4444' stroke-width='2'/><text x='50%25' y='220' dominant-baseline='middle' text-anchor='middle' fill='%23ef4444' font-family='monospace' font-size='12' font-weight='bold'>FALLA ELÉCTRICA DETECTADA</text></svg>"
  },
  {
    name: "Celdas de batería 48V balance",
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%230f172a'/><text x='50%25' y='40%25' dominant-baseline='middle' text-anchor='middle' fill='%2306b6d4' font-family='sans-serif' font-size='16' font-weight='bold'>TEST DE CELDAS LITIO-ION 48V</text><text x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='sans-serif' font-size='11'>LITIO ENERGY - ANALIZADOR BATERÍAS</text><rect x='80' y='200' width='240' height='40' rx='5' fill='%231e293b' stroke='%2306b6d4' stroke-width='2'/><text x='50%25' y='220' dominant-baseline='middle' text-anchor='middle' fill='%2306b6d4' font-family='monospace' font-size='12' font-weight='bold'>BMS: 54.6V - ESTADO OK</text></svg>"
  },
  {
    name: "Pastilla de freno gastada",
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%230f172a'/><text x='50%25' y='40%25' dominant-baseline='middle' text-anchor='middle' fill='%23f59e0b' font-family='sans-serif' font-size='16' font-weight='bold'>DESGASTE PASTILLAS DE FRENO</text><text x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='sans-serif' font-size='11'>LITIO ENERGY - REGISTRO DE RECEPCIÓN</text><rect x='80' y='200' width='240' height='40' rx='5' fill='%231e293b' stroke='%23f59e0b' stroke-width='2'/><text x='50%25' y='220' dominant-baseline='middle' text-anchor='middle' fill='%23f59e0b' font-family='monospace' font-size='12' font-weight='bold'>CAMBIO RECOMENDADO</text></svg>"
  },
  {
    name: "Neumático agrietado scooter",
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%230f172a'/><text x='50%25' y='40%25' dominant-baseline='middle' text-anchor='middle' fill='%23a855f7' font-family='sans-serif' font-size='16' font-weight='bold'>NEUMÁTICO MACIZO CON FISURAS</text><text x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='sans-serif' font-size='11'>LITIO ENERGY - OBSERVACIONES VISUALES</text><rect x='80' y='200' width='240' height='40' rx='5' fill='%231e293b' stroke='%23a855f7' stroke-width='2'/><text x='50%25' y='220' dominant-baseline='middle' text-anchor='middle' fill='%23a855f7' font-family='monospace' font-size='12' font-weight='bold'>PRESIÓN BAJA / DESGASTE EXTREMO</text></svg>"
  }
];

export function PhotoManager({ 
  photos, 
  onPhotosChange, 
  title = "Registro de Evidencia Fotográfica", 
  subtitle = "Captura fotos con la cámara o súbelas desde la tablet para registrarlas en la memoria.",
  storageBadge = "💾 MEMORIA INTERNA TABLET" 
}: PhotoManagerProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showSimulatedModal, setShowSimulatedModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera stream when component unmounts or active state changes
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Handle camera activation
  const startCamera = async () => {
    setCameraError("");
    setIsCameraActive(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // prefer rear camera
        audio: false
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn("Real camera not accessible, falling back to simulated high-res tablet camera.", err);
      setCameraError("Cámara física no encontrada. Se activó el simulador de cámara Litio Energy.");
      setShowSimulatedModal(true);
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !cameraStream) return;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Add watermark overlay for Litio Energy
        ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
        ctx.fillRect(0, canvas.height - 35, canvas.width, 35);
        ctx.fillStyle = "#22d3ee"; // cyan-400
        ctx.font = "bold 12px monospace";
        ctx.fillText(`LITIO ENERGY EV-TABLET  |  ${new Date().toLocaleDateString()}`, 15, canvas.height - 12);

        const dataUrl = canvas.toDataURL("image/jpeg");
        onPhotosChange([...photos, dataUrl]);
        stopCamera();
      }
    } catch (err) {
      console.error("Capture failed:", err);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  // Upload file manually
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onPhotosChange([...photos, event.target.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    const updated = [...photos];
    updated.splice(index, 1);
    onPhotosChange(updated);
  };

  // Select simulated EV photo
  const addSimulatedPhoto = (photoUrl: string) => {
    onPhotosChange([...photos, photoUrl]);
    setShowSimulatedModal(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center space-x-1.5">
            <Camera className="w-4 h-4 text-cyan-400" />
            <span>{title}</span>
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <span className="self-start sm:self-center text-[9px] font-mono font-black tracking-widest bg-cyan-950 text-cyan-400 border border-cyan-800/40 px-2 py-1 rounded-full shrink-0">
          {storageBadge}
        </span>
      </div>

      {/* Camera interface */}
      {isCameraActive && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden relative">
          <video
            ref={videoRef}
            className="w-full aspect-video bg-black object-cover"
            playsInline
            muted
          />
          <div className="absolute bottom-4 inset-x-0 flex justify-center space-x-3 px-4">
            <button
              type="button"
              onClick={capturePhoto}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1 shadow-lg transition-transform hover:scale-105"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Tomar Foto</span>
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2 rounded-xl text-xs shadow-lg transition-transform hover:scale-105"
            >
              <span>Cancelar</span>
            </button>
          </div>
        </div>
      )}

      {/* Selection Actions */}
      {!isCameraActive && (
        <div className="grid grid-cols-2 gap-3">
          {/* Capture with Camera */}
          <button
            type="button"
            onClick={startCamera}
            className="flex flex-col items-center justify-center p-4 bg-slate-950 hover:bg-slate-850 border border-slate-800/80 hover:border-cyan-500/40 rounded-xl transition-all text-slate-300 hover:text-cyan-400 group space-y-1.5"
          >
            <Camera className="w-5 h-5 group-hover:scale-110 transition-transform text-cyan-500" />
            <span className="text-xs font-bold">Activar Cámara</span>
            <span className="text-[9px] text-slate-500 font-mono">Toma foto instantánea</span>
          </button>

          {/* Upload File */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-4 bg-slate-950 hover:bg-slate-850 border border-slate-800/80 hover:border-cyan-500/40 rounded-xl transition-all text-slate-300 hover:text-cyan-400 group space-y-1.5"
          >
            <Upload className="w-5 h-5 group-hover:scale-110 transition-transform text-cyan-500" />
            <span className="text-xs font-bold">Subir Archivo</span>
            <span className="text-[9px] text-slate-500 font-mono">JPG, PNG o video</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            multiple
            className="hidden"
          />
        </div>
      )}

      {/* Trigger simulated camera helper directly for convenience */}
      {!isCameraActive && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowSimulatedModal(true)}
            className="text-[10px] text-slate-500 hover:text-cyan-400 font-mono underline transition-colors"
          >
            ➔ Abrir Galería de Simulación de Tablet (Prueba rápida)
          </button>
        </div>
      )}

      {/* Photos Thumbnail Gallery */}
      {photos.length > 0 && (
        <div className="space-y-1.5 pt-1.5">
          <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Evidencia Registrada ({photos.length})</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {photos.map((url, idx) => (
              <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-800 aspect-video bg-slate-950">
                <img
                  src={url}
                  alt={`Evidencia ${idx + 1}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 p-1 bg-slate-950/80 border border-slate-800 text-rose-400 hover:text-rose-300 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Eliminar evidencia"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-slate-950/70 py-0.5 px-1.5 text-[8px] font-mono text-cyan-300">
                  Evidencia #{idx + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Simulated Camera Feed Modal */}
      {showSimulatedModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
            <div className="bg-gradient-to-r from-slate-950 to-cyan-950 p-4 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-display font-black text-slate-100 text-sm flex items-center space-x-1.5">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <span>SIMULADOR DE CÁMARA DE TABLET</span>
                </h3>
                <p className="text-[10px] text-slate-400">Selecciona fotos preestablecidas en la memoria para simular capturas físicas.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSimulatedModal(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-100 font-mono bg-slate-950 px-2 py-1 rounded"
              >
                Cerrar
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {SIMULATED_EV_PHOTOS.map((item, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => addSimulatedPhoto(item.url)}
                    className="group border border-slate-800 hover:border-cyan-500/40 bg-slate-950 p-2 rounded-xl text-left transition-all space-y-2 relative overflow-hidden"
                  >
                    <div className="aspect-video w-full rounded-md bg-slate-900 overflow-hidden relative">
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-200 group-hover:text-cyan-400 transition-colors truncate">
                        {item.name}
                      </p>
                      <p className="text-[9px] text-slate-500 font-mono">Toma #{idx + 1}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Para registrar imágenes personalizadas, puedes utilizar la opción <strong>Subir Archivo</strong> en el panel de control anterior y seleccionar cualquier foto o captura de pantalla de tu dispositivo.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
