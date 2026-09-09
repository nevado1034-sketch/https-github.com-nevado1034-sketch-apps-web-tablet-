# ─────────────────────────────────────────────────────────────────────────────
# Configuración de BACKUPS PROGRAMADOS y MONITOREO para Firestore (litio-energy)
# Requisito: Google Cloud SDK (gcloud) instalado y con login:
#   winget install Google.CloudSDK   (en Windows)
#   gcloud auth login
#   gcloud config set project litio-energy
# NOTA: si PowerShell bloquea gcloud.ps1, usar gcloud.cmd explícitamente.
# ─────────────────────────────────────────────────────────────────────────────

$Project = "litio-energy"
$Database = "(default)"
$gcloudBin = "C:\Users\PC\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
if (Test-Path $gcloudBin) {
  $g = $gcloudBin
} else {
  $g = "gcloud"
}

Write-Host "Proyecto: $Project" -ForegroundColor Cyan

# ── 1. Verificar autenticación y API habilitadas ─────────────────────────────
& $g auth list
& $g services enable firestore.googleapis.com --project=$Project

# ── 2. Backup diario de Firestore, retención 30 días ─────────────────────────
Write-Host "Creando schedule de backup DIARIO (retencion 30d)..." -ForegroundColor Yellow
& $g firestore backups schedules create `
  --database=$Database `
  --project=$Project `
  --recurrence=daily `
  --retention=30d

# Backup semanal los domingos (máximo soportado: 14 semanas = 98 días)
Write-Host "Creando schedule de backup SEMANAL domingo (retencion 98d)..." -ForegroundColor Yellow
& $g firestore backups schedules create `
  --database=$Database `
  --project=$Project `
  --recurrence=weekly `
  --day-of-week=SUNDAY `
  --retention=98d

# ── 3. Verificar ─────────────────────────────────────────────────────────────
Write-Host "Schedules activos:" -ForegroundColor Green
& $g firestore backups schedules list --database=$Database --project=$Project
Write-Host "Backups existentes:" -ForegroundColor Green
& $g firestore backups list --project=$Project

Write-Host ""
Write-Host "✔ Backups configurados. El primer backup se toma automaticamente." -ForegroundColor Green
Write-Host ""
Write-Host "ALERTAS DE MONITOREO YA CREADAS EN PRODUCCION (2026-09-09):"
Write-Host "  1) Firestore - Borrados excesivos de documentos (document/delete_count > 5 en 2 min)"
Write-Host "  2) Firestore - Reglas denegadas (rules/evaluation_count result=deny > 5 en 2 min)"
Write-Host ""
Write-Host "Notificaciones por email: nevado1034@gmail.com (canal 5102794637189226851)"
Write-Host "Para ver/editar: https://console.cloud.google.com/monitoring/alerting?project=$Project"