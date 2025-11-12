# 📊 Dashboard de Análisis de Commits Git

Sistema de análisis interactivo para visualizar y evaluar el desempeño del equipo de desarrollo basado en el historial de commits de cualquier repositorio Git.

## 🎯 Características Principales

- ✅ **100% Automático**: Detecta y normaliza emails duplicados sin configuración
- ✅ **Portable**: Funciona en cualquier proyecto Git sin modificaciones
- ✅ **Completo**: Análisis de commits, líneas de código, y actividad temporal
- ✅ **Interactivo**: Filtros, búsqueda, gráficos y visualizaciones en tiempo real
- ✅ **Sin dependencias**: Solo requiere Python 3, Git y un navegador web

## 🚀 Inicio Rápido

### Instalación

```bash
# Copiar la carpeta eval/ a la raíz de tu proyecto Git
cp -r /ruta/a/eval/ /tu/proyecto/eval/
cd /tu/proyecto/eval/
```

### Uso

```bash
# 1. Generar datos del proyecto
./update-stats.sh

# 2. Iniciar servidor web
python3 -m http.server 8000

# 3. Abrir en navegador
# http://localhost:8000/
```

**¡Eso es todo!** El sistema analiza automáticamente tu repositorio y genera el dashboard.

## ✨ Características del Dashboard

### Visualizaciones Interactivas

- 📊 **Gráfico de barras**: Distribución de commits por desarrollador
- 🍩 **Gráfico circular**: Proporción de tipos (Fix/Feat/Otros)
- 📈 **Gráfico de líneas**: Actividad mensual del proyecto
- 📉 **Timeline**: Evolución temporal por desarrollador

### Métricas Disponibles

- ✅ Total de commits y porcentaje de contribución
- ✅ Clasificación por tipo: Fix, Feat, Otros
- ✅ Líneas de código (agregadas/eliminadas/netas)
- ✅ Días activos de desarrollo
- ✅ Promedio de commits por día
- ✅ Período de actividad completo

### Funcionalidades Interactivas

- 🔍 Filtros por desarrollador, mes y tipo
- 🔎 Búsqueda en tiempo real
- 📋 Tabla de desempeño interactiva
- 👤 Vista detallada por desarrollador
- 📜 Historial completo con paginación
- 🔄 Actualización dinámica de datos
- 📱 Diseño responsivo

## 📁 Estructura de Archivos

```
eval/
├── index.html                 # Página principal del dashboard
├── styles.css                 # Estilos y tema visual
├── main.js                    # Lógica y visualizaciones interactivas
├── output.json                # Datos de commits (generado)
├── stats-lines.json           # Estadísticas de líneas (generado)
├── generate-output-json.py    # Generador de datos de commits
├── generate-stats-lines.py    # Generador de estadísticas de código
├── update-stats.sh            # Script automatizado de actualización
└── README.md                  # Esta documentación
```

## 🔄 Actualización de Datos

### Método Automático (Recomendado)

```bash
./update-stats.sh
```

Este script ejecuta todo el proceso:

- Extrae historial de commits con `git log`
- Detecta y normaliza emails duplicados automáticamente
- Genera `output.json` con todos los commits
- Genera `stats-lines.json` con estadísticas de código
- Muestra resumen de desarrolladores detectados

### Método Manual

Si prefieres ejecutar los scripts individualmente:

```bash
# Generar datos de commits
python3 generate-output-json.py

# Generar estadísticas de líneas
python3 generate-stats-lines.py
```

### Actualizar el Dashboard

Después de generar los datos:

1. Abre el dashboard en tu navegador
2. Presiona el botón **"🔄 Actualizar Datos"**
3. Las estadísticas se recargarán automáticamente

## 🔧 Normalización Automática de Emails

### ¿Qué es?

Un mismo desarrollador puede aparecer con múltiples emails en el historial de Git:

- Email personal: `developer@gmail.com`
- Email de GitHub: `123456+developer@users.noreply.github.com`
- Variaciones con typos o diferentes dominios

El sistema **detecta y agrupa automáticamente** estos emails duplicados sin necesidad de configuración manual.

### Algoritmo de Detección

El proceso es completamente automático:

1. **Extracción**: Lee todos los pares (email, nombre) del historial Git
2. **Análisis**: Compara nombres usando algoritmos de similitud de texto (SequenceMatcher)
3. **Agrupación**: Agrupa emails cuando:
   - La similitud de nombres es > 60%
   - Un nombre está contenido en otro (ej: "John" en "John Doe")
4. **Selección**: Elige como email canónico:
   - El más corto que no sea `@users.noreply.github.com`
   - Si todos son noreply, el más corto
5. **Normalización**: Reemplaza todos los duplicados por el canónico

### Ejemplo en Ejecución

```bash
./update-stats.sh

🔍 Emails duplicados detectados automáticamente:
  Developer Name: 168598403+dev@users.noreply.github.com → dev@gmail.com
  Another Dev: 149209003+another@users.noreply.github.com → another@company.com
```

### Ventajas

| Característica                    | Beneficio                                         |
| ---------------------------------- | ------------------------------------------------- |
| ✅**Cero configuración**    | Funciona en cualquier proyecto Git inmediatamente |
| ✅**Totalmente automático** | No requiere intervención manual ni mapeos        |
| ✅**Inteligente**            | Usa algoritmos probados de similitud de texto     |
| ✅**Portable**               | El mismo código funciona en todos los proyectos  |
| ✅**Transparente**           | Muestra las detecciones para validación          |

### Para Casos Especiales

Si necesitas forzar una normalización específica, puedes editar el algoritmo en:

- `generate-output-json.py` - Función `build_email_normalization_map()`
- `generate-stats-lines.py` - Función `build_email_normalization_map()`

## 📖 Métricas Explicadas

### Total Commits

Número total de commits realizados por el desarrollador en todas las ramas.

### % del Proyecto

Porcentaje de commits del desarrollador respecto al total del proyecto.

### Fixes / Features / Otros

Clasificación automática basada en el mensaje del commit:

- **Fix**: Commits que empiezan con "fix:" o "fix("
- **Feat**: Commits que empiezan con "feat:" o "feat("
- **Otros**: Resto de commits

### Líneas Netas

Diferencia entre líneas agregadas y eliminadas:

```
Líneas Netas = Líneas Agregadas - Líneas Eliminadas
```

**Exclusiones automáticas:**

- `package-lock.json` y `composer.lock`
- Archivos `.min.js` y `.min.css`
- Cambios de más de 100,000 líneas (archivos generados)

### Días Activos

Número de días únicos en los que el desarrollador hizo commits.

### Promedio/Día

Commits promedio por día activo:

```
Promedio = Total Commits / Días Activos
```

## 🎨 Personalización

### Cambiar Colores

Edita las variables CSS en `styles.css`:

```css
:root {
    --primary-color: #4f46e5;
    --secondary-color: #06b6d4;
    /* ... más colores */
}
```

### Ajustar Paginación

En `main.js`, línea 6:

```javascript
const itemsPerPage = 20; // Cambia a tu preferencia
```

## 💡 Casos de Uso

- **📊 Evaluación de Desempeño**: Analiza métricas individuales, compara contribuciones entre desarrolladores, identifica períodos de alta/baja actividad
- **📅 Planificación de Sprints**: Revisa actividad histórica, estima capacidad del equipo, identifica patrones de productividad
- **🔍 Code Review**: Filtra commits por desarrollador, revisa tipos de cambios (fixes vs features), analiza historial completo
- **📈 Reportes de Gestión**: Exporta gráficos, genera informes de contribución, presenta métricas al equipo
- **🎓 Evaluación Académica**: Verifica la participación equitativa en proyectos grupales
- **🏆 Gamificación**: Crea competencias amigables entre el equipo basadas en métricas

## 🔐 Datos Procesados

### output.json

Formato JSON con todos los commits:

```json
[
  {
    "commit": "7bf8cc4",
    "abbreviated_commit": "7bf8cc4",
    "subject": "Commit message",
    "author": {
      "name": "Developer",
      "email": "dev@example.com",
      "date": "Wed, 12 Nov 2025 12:29:15 -0300"
    },
    ...
  }
]
```

### stats-lines.json

Estadísticas de líneas por desarrollador:

```json
[
  {
    "email": "dev@example.com",
    "linesAdded": 17146,
    "linesDeleted": 1764,
    "linesNet": 15382
  }
]
```

## �️ Requisitos del Sistema

- **Git**: Repositorio Git con historial de commits
- **Python 3.6+**: Para ejecutar scripts de análisis
- **Navegador moderno**: Chrome, Firefox, Safari o Edge
- **Servidor web local**: Python http.server (incluido) o similar

**Sin dependencias adicionales**: El sistema usa solo bibliotecas estándar de Python y CDN para Chart.js

## 📝 Tecnologías

| Componente     | Tecnología                | Propósito                           |
| -------------- | -------------------------- | ------------------------------------ |
| Backend        | Python 3 + Git             | Extracción y procesamiento de datos |
| Frontend       | HTML5/CSS3/JavaScript ES6+ | Interfaz de usuario                  |
| Visualización | Chart.js v3                | Gráficos interactivos               |
| Algoritmo      | difflib.SequenceMatcher    | Detección de emails duplicados      |
| Servidor       | Python http.server         | Servir archivos localmente           |

## 🚀 Ventajas Técnicas

- ✅ **Sin instalación**: No requiere npm, pip install, ni compilación
- ✅ **Offline-ready**: Funciona localmente sin internet (excepto Chart.js CDN)
- ✅ **Ligero**: ~50KB de código JavaScript, respuesta instantánea
- ✅ **Compatible**: Funciona en Linux, macOS y Windows
- ✅ **Extensible**: Código modular fácil de personalizar

## ❓ Preguntas Frecuentes (FAQ)

### ¿Funciona con GitLab, Bitbucket u otros sistemas?

Sí, funciona con cualquier repositorio Git. No depende de GitHub, GitLab o ninguna plataforma específica.

### ¿Puedo usarlo en un monorepo?

Sí, analiza todo el historial del repositorio actual. Para analizar solo una subcarpeta, modifica los comandos `git log` en los scripts Python.

### ¿Se pueden exportar los datos?

Sí, los archivos `output.json` y `stats-lines.json` contienen todos los datos en formato JSON estándar.

### ¿Qué sucede con branches no mergeadas?

El script usa `git log --all`, por lo que incluye commits de todas las ramas, mergeadas o no.

### ¿Cómo personalizo los colores del dashboard?

Edita las variables CSS en `styles.css` (líneas 1-15).

### ¿Funciona con repositorios grandes (>10,000 commits)?

Sí, está optimizado para repositorios grandes. El procesamiento puede tomar más tiempo, pero el dashboard se carga instantáneamente.

### ¿Puedo integrarlo en CI/CD?

Sí, puedes ejecutar `./update-stats.sh` en tu pipeline y publicar el dashboard como artefacto.

## 🤝 Contribución

Para mejorar este dashboard:

1. **Reportar bugs**: Describe el problema y los pasos para reproducirlo
2. **Sugerir features**: Explica el caso de uso y beneficio esperado
3. **Enviar mejoras**: Mantén el código simple y documentado

### Ideas para Contribuir

- 🎨 Temas adicionales (dark mode mejorado, colores personalizables)
- 📊 Nuevas visualizaciones (heatmaps, gráficos de radar)
- 🔌 Integración con APIs de GitHub/GitLab para PRs y issues
- 🌍 Internacionalización (i18n) para múltiples idiomas
- 📱 Versión mobile-first mejorada
- 🔔 Notificaciones de milestones (100 commits, etc.)

## 📄 Licencia

Este proyecto es de código abierto y puede ser usado libremente en proyectos personales, académicos y comerciales.

**Desarrollado como herramienta de análisis para equipos de desarrollo.**

---

**Versión**: 2.0 - Auto-normalización de emails
**Compatibilidad**: Python 3.6+ | Git 2.0+ | Navegadores modernos
**Última actualización**: Noviembre 2025
