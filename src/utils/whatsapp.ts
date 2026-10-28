// Enlace para abrir WhatsApp con un mensaje ya escrito.
//
// Se usa api.whatsapp.com/send en lugar de wa.me: la redirección de wa.me
// rompe los emojis en algunos navegadores de escritorio (llegan como "�").
export function whatsappUrl(phone: string, message: string): string {
  const digits = String(phone || "").replace(/\D/g, "");
  return `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(message)}`;
}
