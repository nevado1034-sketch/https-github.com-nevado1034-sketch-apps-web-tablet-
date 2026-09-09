# ─────────────────────────────────────────────────────────────────────────────
# Configuración de BACKUPS PROGRAMADOS y MONITOREO para Firestore (litio-energy)
# Requisito: Google Cloud SDK (gcloud) instalado y con login:
#   winget install Google.CloudSDK   (en Windows)
#   gcloud auth login
#   gcloud config set project litio-energy
# ─────────────────────────────────────────────────────────────────────────────

$Project = "litio-energy"
$Database = "(default)"

Write-Host "Proyecto: $Project" -ForegroundColor Cyan

# ── 1. Verificar autenticación y API habilitadas ─────────────────────────────
gcloud auth list
gcloud services enable firestore.googleapis.com --project=$Project

# ── 2. Backup diario de Firestore, retención 30 días ─────────────────────────
# Los backups administrados de Firestore se guardan automáticos sin bucket manual.
Write-Host "Creando schedule de backup DIARIO (retencion 30d)..." -ForegroundColor Yellow
gcloud firestore backups schedules create `
  --database=$Database `
  --project=$Project `
  --recurrence=DAILY `
  --retention=30d

# Backups semanales adicionales con retención de 6 meses (punto de restauración a largo plazo)
Write-Host "Creando schedule de backup SEMANAL (retencion 180d)..." -ForegroundColor Yellow
gcloud firestore backups schedules create `
  --database=$Database `
  --project=$Project `
  --recurrence=WEEKLY `
  --retention=180d

# ── 3. Verificar ─────────────────────────────────────────────────────────────
Write-Host "Schedules activos:" -ForegroundColor Green
gcloud firestore backups schedules list --database=$Database --project=$Project
Write-Host "Backups existentes:" -ForegroundColor Green
gcloud firestore backups list --database=$Database --project=$Project

Write-Host ""
Write-Host "✔ Backups configurados. El primer backup se toma automaticamente." -ForegroundColor Green
Write-Host ""
Write-Host "SIGUIENTE: crear las ALERTAS de monitoreo via consola web (Cloud Monitoring)."
Write-Host "  1) Abre https://console.cloud.google.com/monitoring/alerting?project=$Project"
Write-Host "  2) Crea Politica -> condicion por METRICA:"
Write-Host "     - firestore.googleapis.com/document/delete_count (borrados excesivos)"
Write-Host "     - firestore.googleapis.com/api/request_count (errores 5xx/permision denied)"
Write-Host "     - cloudfunctions.googleapis.com/function/execution_count (si usas Cloud Functions)"
Write-Host "     - billing: que el costo estimado supere un monto (ej. S/ 80/mes)"
Write-Host "  3) Notificaciones: correo a tu cuenta de Google Cloud."