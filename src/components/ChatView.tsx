import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, 
  Send, 
  Search, 
  User, 
  ChevronRight, 
  Phone, 
  Loader2,
  Inbox,
  X,
  MapPin,
  Wrench,
  RefreshCw,
  CheckCheck
} from "lucide-react";
import { 
  db, 
  isFirebaseConfigured, 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  addDoc,
  getDocs
} from "../firebase";

interface ChatClient {
  id: string;
  phone: string;
  name: string;
  status?: string;
  progress?: number;
  sede?: string;
  vehicleType?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  lastMessage?: string;
  lastMessageTime?: number;
  unread?: number;
}

interface ChatMessage {
  id: string;
  senderRole: string;
  senderName: string;
  message: string;
  timestamp: number;
}

const BRANCH_LABELS: Record<string, string> = {
  "Litio Lince": "San Isidro (Arenales)",
  "Litio Surco": "Surco",
  "Litio San Borja": "San Borja",
  "Litio Jose Leal": "Lince (José Leal)",
  "Litio Leal": "Lince (José Leal)",
  lince_arenales: "San Isidro (Arenales)",
  surco: "Surco",
  san_borja: "San Borja",
  lince_leal: "Lince (José Leal)"
};

export default function ChatView({ userBranch }: { userBranch?: string }) {
  const [clients, setClients] = useState<ChatClient[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Normaliza el teléfono igual que la App Android (FirestoreService)
  const phoneKey = (phone: string): string => {
    const key = (phone || "").trim().replace(/[^a-zA-Z0-9._-]/g, "_");
    return key || "sin-telefono";
  };

  const messagesPath = (phone: string) => phoneKey(phone);

  // Load clients from Firestore (clientes collection, same as Android app)
  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setError("Firebase no configurado. Revisa las variables VITE_FIREBASE_* en el .env");
      setLoading(false);
      return;
    }

    const q = query(collection(db, "clientes"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const list: ChatClient[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const phone = data.phone || docSnap.id;
        const client: ChatClient = {
          id: docSnap.id,
          phone,
          name: data.name || "Cliente",
          status: data.status || "Recibido",
          progress: data.progress || 0,
          sede: data.sede || "",
          vehicleType: data.vehicleType || "",
          vehicleBrand: data.vehicleBrand || "",
          vehicleModel: data.vehicleModel || "",
          unread: 0
        };

        // Fetch last message and unread count for this client
        try {
          const msgsQuery = query(
            collection(db, "chats", messagesPath(phone), "messages"),
            orderBy("timestamp", "desc")
          );
          const msgsSnap = await getDocs(msgsQuery);
          if (!msgsSnap.empty) {
            const first = msgsSnap.docs[0].data() as any;
            client.lastMessage = first.message || "";
            client.lastMessageTime = typeof first.timestamp === "number" ? first.timestamp : 0;
            client.unread = msgsSnap.docs.filter((m) => {
              const d = m.data() as any;
              return d.senderRole === "CLIENT";
            }).length;
          }
        } catch (e) {
          // Chat not present yet
        }

        list.push(client);
      }

      // Filter by branch/sede for local users
      const branchSedeMap: Record<string, string[]> = {
        lince_arenales: ["Litio Lince", "Litio San Isidro"],
        surco: ["Litio Surco"],
        san_borja: ["Litio San Borja"],
        lince_leal: ["Litio Leal", "Litio Jose Leal"]
      };
      const allowedSedes = userBranch ? branchSedeMap[userBranch] || [] : null;
      const filtered = allowedSedes ? list.filter((c) => allowedSedes.includes(c.sede)) : list;

      setClients(filtered);
      setLoading(false);
    }, (err) => {
      console.error("ChatView onSnapshot error:", err);
      setError("Error al cargar clientes desde Firestore. Revisa las reglas de seguridad.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userBranch]);

  // Listen to messages for the selected client
  useEffect(() => {
    if (!selectedPhone || !db) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, "chats", messagesPath(selectedPhone), "messages"),
      orderBy("timestamp", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as any;
        list.push({
          id: docSnap.id,
          senderRole: d.senderRole || "CLIENT",
          senderName: d.senderName || "",
          message: d.message || "",
          timestamp: typeof d.timestamp === "number" ? d.timestamp : 0
        });
      });
      setMessages(list);
    });
    return () => unsubscribe();
  }, [selectedPhone]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedPhone]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !selectedPhone || sending) return;
    setSending(true);
    try {
      const messagesCol = collection(db, "chats", messagesPath(selectedPhone), "messages");
      await addDoc(messagesCol, {
        senderRole: "TECHNICIAN",
        senderName: "Técnico Litio Energy",
        message: text,
        timestamp: Date.now()
      });
      setInput("");
    } catch (err) {
      console.error("Error sending:", err);
      alert("No se pudo enviar el mensaje. Revisa internet y las reglas de Firestore.");
    } finally {
      setSending(false);
    }
  };

  const filteredClients = clients.filter((c) => {
    const term = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.phone.includes(term) ||
      (c.vehicleBrand || "").toLowerCase().includes(term) ||
      (c.vehicleModel || "").toLowerCase().includes(term)
    );
  }).sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

  const selectedClient = clients.find((c) => c.phone === selectedPhone);

  const formatTime = (ts: number) => {
    if (!ts) return "";
    const date = new Date(ts);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    if (sameDay) {
      return date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <MessageSquare className="w-6 h-6 text-cyan-400" />
            <span>Chat Cliente - Técnico</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Responde los mensajes que los clientes envían desde la app de Litio Energy.
          </p>
        </div>
        {isFirebaseConfigured && (
          <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-full border border-cyan-500/20">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
            </span>
            <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">En línea</span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/60 text-rose-200 rounded-2xl mb-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 space-x-3">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          <p className="text-slate-400 text-sm">Cargando clientes...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: "calc(100vh - 260px)", minHeight: 480 }}>
          {/* Client List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-800 bg-slate-950">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar cliente, teléfono o vehículo..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <Inbox className="w-10 h-10 text-slate-700 mb-3" />
                  <p className="text-sm text-slate-500">
                    No hay clientes aún. Cuando un cliente se registre desde la app, aparecerá aquí.
                  </p>
                </div>
              ) : (
                filteredClients.map((client) => (
                  <button
                    key={client.phone}
                    onClick={() => setSelectedPhone(client.phone)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-800/60 transition-colors ${
                      selectedPhone === client.phone ? "bg-cyan-500/10 border-l-4 border-l-cyan-500" : "hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${selectedPhone === client.phone ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-cyan-400"}`}>
                          <User className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-100 truncate">{client.name}</p>
                          <p className="text-xs text-slate-500 flex items-center space-x-1">
                            <Phone className="w-3 h-3" />
                            <span>{client.phone}</span>
                          </p>
                          {client.lastMessage && (
                            <p className="text-xs text-slate-400 truncate mt-0.5">
                              {client.lastMessage}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 ml-2">
                        {client.lastMessageTime > 0 && (
                          <span className="text-[10px] text-slate-500">{formatTime(client.lastMessageTime)}</span>
                        )}
                        {client.unread ? (
                          <span className="mt-1 w-5 h-5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                            {client.unread}
                          </span>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-600 mt-1" />
                        )}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center space-x-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-cyan-400">
                        {client.status}
                      </span>
                      {(client.vehicleBrand || client.vehicleModel) && (
                        <span className="text-[10px] text-slate-500 flex items-center space-x-0.5">
                          <Wrench className="w-3 h-3" />
                          <span>{client.vehicleBrand} {client.vehicleModel}</span>
                        </span>
                      )}
                      {client.sede && (
                        <span className="text-[10px] text-slate-500 flex items-center space-x-0.5">
                          <MapPin className="w-3 h-3" />
                          <span>{BRANCH_LABELS[client.sede] || client.sede}</span>
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Panel */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
            {!selectedPhone ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                <MessageSquare className="w-14 h-14 text-slate-700 mb-4" />
                <h3 className="text-lg font-semibold text-slate-300 mb-2">Selecciona un cliente</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  Elige un cliente de la lista para ver su conversación con el taller y responderle en tiempo real.
                </p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="px-4 py-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-cyan-500 flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-950" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-100">{selectedClient?.name}</p>
                      <p className="text-xs text-slate-500">
                        {selectedClient?.vehicleBrand} {selectedClient?.vehicleModel} · {selectedClient?.status}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPhone(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-950/40">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 text-center">
                      <Inbox className="w-10 h-10 text-slate-700 mb-3" />
                      <p className="text-sm text-slate-500">Sin mensajes aún. Espera a que el cliente escriba.</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isTech = msg.senderRole === "TECHNICIAN";
                      return (
                        <div key={msg.id} className={`flex ${isTech ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm ${
                              isTech
                                ? "bg-cyan-500 text-slate-950 rounded-br-md"
                                : "bg-slate-800 text-slate-100 rounded-bl-md"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                            <div className={`mt-1 flex items-center space-x-1 text-[10px] ${isTech ? "text-slate-900/70" : "text-slate-500"}`}>
                              <span>{msg.senderName}</span>
                              <span>·</span>
                              <span>{formatTime(msg.timestamp)}</span>
                              {isTech && <CheckCheck className="w-3 h-3" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-slate-800 bg-slate-950">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                      placeholder="Escribe tu respuesta al cliente..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || sending}
                      className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 rounded-lg flex items-center space-x-2 text-sm font-bold transition-colors"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">Enviar</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
