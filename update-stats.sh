#!/bin/bash

# Script para actualizar estadísticas del dashboard
# Genera output.json y stats-lines.json

echo "🔄 Actualizando estadísticas del dashboard..."
echo ""

# Cambiar al directorio raíz del proyecto
cd "$(dirname "$0")/.."

# 1. Generar output.json (commits)
echo "📝 Generando output.json..."
cd eval
python3 generate-output-json.py

if [ $? -eq 0 ]; then
    COMMIT_COUNT=$(jq 'length' output.json 2>/dev/null || echo "?")
    echo "✅ output.json generado ($COMMIT_COUNT commits)"
    cd ..
else
    echo "❌ Error generando output.json"
    cd ..
    exit 1
fi

echo ""

# 2. Generar stats-lines.json (estadísticas de líneas)
cd eval
python3 generate-stats-lines.py

if [ $? -eq 0 ]; then
    DEV_COUNT=$(jq 'length' stats-lines.json 2>/dev/null || echo "?")
    cd ..
else
    echo "❌ Error generando stats-lines.json"
    cd ..
    exit 1
fi

echo ""
echo "✨ ¡Estadísticas actualizadas!"
echo ""
echo "🌐 Ahora puedes:"
echo "   1. Ir al dashboard en tu navegador"
echo "   2. Presionar el botón '🔄 Actualizar Datos'"
echo "   3. Ver las nuevas estadísticas incluyendo líneas de código"
echo ""
