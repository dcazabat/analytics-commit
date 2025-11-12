// Variables globales
let commitsData = [];
let filteredData = [];
let linesStatsData = [];
let currentPage = 1;
const itemsPerPage = 20;
let charts = {};

// NOTA: La normalización de emails ahora se hace automáticamente en los scripts Python
// Los datos ya vienen normalizados en output.json y stats-lines.json
// No es necesario mantener un mapa manual de normalización

// Función para procesar output.json directamente
function processOutputData(rawData) {
    return rawData.map(commit => {
        let type = 'otros';
        const subjectLower = commit.subject.toLowerCase();
        
        if (subjectLower.match(/^fix[:(]|fix:/)) {
            type = 'fix';
        } else if (subjectLower.match(/^feat[:(]|feat:/)) {
            type = 'feat';
        }
        
        return {
            commit: commit.abbreviated_commit,
            subject: commit.subject,
            author: commit.author.name,
            email: commit.author.email, // Ya viene normalizado del script Python
            date: commit.author.date,
            refs: commit.refs,
            type: type
        };
    });
}

// Cargar datos desde output.json y stats-lines.json
async function loadData() {
    try {
        // Cargar commits
        const response = await fetch('output.json');
        
        if (!response.ok) {
            throw new Error('No se encontró output.json');
        }
        
        const rawData = await response.json();
        commitsData = processOutputData(rawData);
        console.log('✅ Datos procesados desde output.json');
        
        // Cargar estadísticas de líneas
        try {
            const statsResponse = await fetch('stats-lines.json');
            if (statsResponse.ok) {
                linesStatsData = await statsResponse.json();
                console.log('✅ Estadísticas de líneas cargadas');
            }
        } catch (e) {
            console.log('⚠️ stats-lines.json no encontrado');
        }
        
        filteredData = [...commitsData];
        initializeDashboard();
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        alert('Error al cargar los datos. Por favor, verifica que existe output.json');
    }
}

// Inicializar dashboard
function initializeDashboard() {
    populateFilters();
    updateSummaryCards();
    createCharts();
    renderPerformanceTable();
    renderCommitsList();
    setupEventListeners();
}

// Obtener el nombre principal de un desarrollador (el más usado)
function getPrimaryName(email) {
    const commits = commitsData.filter(c => c.email === email);
    const nameCount = {};
    
    commits.forEach(c => {
        nameCount[c.author] = (nameCount[c.author] || 0) + 1;
    });
    
    // Retornar el nombre más usado
    return Object.entries(nameCount).sort((a, b) => b[1] - a[1])[0][0];
}

// Obtener desarrolladores únicos por email
function getUniqueDevelopers() {
    const emailMap = {};
    
    commitsData.forEach(commit => {
        if (!emailMap[commit.email]) {
            emailMap[commit.email] = {
                email: commit.email,
                names: [commit.author],
                primaryName: commit.author
            };
        } else if (!emailMap[commit.email].names.includes(commit.author)) {
            emailMap[commit.email].names.push(commit.author);
        }
    });
    
    // Determinar el nombre principal para cada email
    Object.keys(emailMap).forEach(email => {
        emailMap[email].primaryName = getPrimaryName(email);
    });
    
    return emailMap;
}

// Poblar filtros
function populateFilters() {
    const developerMap = getUniqueDevelopers();
    const developers = Object.values(developerMap)
        .map(dev => ({ email: dev.email, name: dev.primaryName }))
        .sort((a, b) => a.name.localeCompare(b.name));
    
    const months = [...new Set(commitsData.map(c => {
        const date = new Date(c.date);
        return `${date.toLocaleString('es', { month: 'long' })} ${date.getFullYear()}`;
    }))].sort();
    
    const devFilter = document.getElementById('developerFilter');
    developers.forEach(dev => {
        const option = document.createElement('option');
        option.value = dev.email;
        option.textContent = dev.name;
        devFilter.appendChild(option);
    });
    
    const monthFilter = document.getElementById('monthFilter');
    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month;
        monthFilter.appendChild(option);
    });
}

// Actualizar tarjetas de resumen
function updateSummaryCards() {
    const totalCommits = filteredData.length;
    const developers = new Set(filteredData.map(c => c.email)).size;
    
    // Calcular días de desarrollo
    const dates = filteredData.map(c => new Date(c.date).setHours(0, 0, 0, 0));
    const uniqueDates = new Set(dates);
    const activeDays = uniqueDates.size;
    
    const avgCommitsDay = activeDays > 0 ? (totalCommits / activeDays).toFixed(2) : 0;
    
    document.getElementById('totalCommits').textContent = totalCommits;
    document.getElementById('totalDevelopers').textContent = developers;
    document.getElementById('activeDays').textContent = activeDays;
    document.getElementById('avgCommitsDay').textContent = avgCommitsDay;
}

// Crear gráficos
function createCharts() {
    createDeveloperChart();
    createCommitTypeChart();
    createMonthlyChart();
    createTimelineChart();
}

// Gráfico de distribución por desarrollador
function createDeveloperChart() {
    const ctx = document.getElementById('developerChart');
    
    if (charts.developer) {
        charts.developer.destroy();
    }
    
    const developerStats = {};
    filteredData.forEach(commit => {
        developerStats[commit.email] = (developerStats[commit.email] || 0) + 1;
    });
    
    const sortedDevs = Object.entries(developerStats).sort((a, b) => b[1] - a[1]);
    const labels = sortedDevs.map(d => getPrimaryName(d[0]));
    const data = sortedDevs.map(d => d[1]);
    const percentages = data.map(val => ((val / filteredData.length) * 100).toFixed(1));
    
    charts.developer = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Commits',
                data: data,
                backgroundColor: [
                    '#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
                ],
                borderRadius: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const index = context.dataIndex;
                            return `${context.parsed.y} commits (${percentages[index]}%)`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

// Gráfico de tipos de commits
function createCommitTypeChart() {
    const ctx = document.getElementById('commitTypeChart');
    
    if (charts.commitType) {
        charts.commitType.destroy();
    }
    
    const types = { fix: 0, feat: 0, otros: 0 };
    filteredData.forEach(commit => {
        types[commit.type]++;
    });
    
    const total = filteredData.length;
    const percentages = {
        fix: ((types.fix / total) * 100).toFixed(1),
        feat: ((types.feat / total) * 100).toFixed(1),
        otros: ((types.otros / total) * 100).toFixed(1)
    };
    
    charts.commitType = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['🔧 Fix', '✨ Feat', '📦 Otros'],
            datasets: [{
                data: [types.fix, types.feat, types.otros],
                backgroundColor: ['#ef4444', '#10b981', '#64748b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 20, font: { size: 14 } }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const type = context.label.split(' ')[1].toLowerCase();
                            return `${context.parsed} commits (${percentages[type]}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Gráfico de actividad mensual
function createMonthlyChart() {
    const ctx = document.getElementById('monthlyChart');
    
    if (charts.monthly) {
        charts.monthly.destroy();
    }
    
    const monthlyStats = {};
    filteredData.forEach(commit => {
        const date = new Date(commit.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = `${date.toLocaleString('es', { month: 'short' })} ${date.getFullYear()}`;
        
        if (!monthlyStats[monthKey]) {
            monthlyStats[monthKey] = { 
                label: monthLabel, 
                count: 0,
                sortDate: new Date(date.getFullYear(), date.getMonth(), 1)
            };
        }
        monthlyStats[monthKey].count++;
    });
    
    const sortedMonths = Object.entries(monthlyStats).sort((a, b) => a[1].sortDate - b[1].sortDate);
    const labels = sortedMonths.map(m => m[1].label);
    const data = sortedMonths.map(m => m[1].count);
    
    charts.monthly = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Commits por mes',
                data: data,
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: '#4f46e5',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return context[0].label;
                        },
                        label: function(context) {
                            return `${context.parsed.y} commits`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 5 }
                }
            }
        }
    });
}

// Gráfico de timeline por desarrollador
function createTimelineChart() {
    const ctx = document.getElementById('timelineChart');
    
    if (charts.timeline) {
        charts.timeline.destroy();
    }
    
    const developers = [...new Set(filteredData.map(c => c.email))];
    const datasets = [];
    
    const colors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    
    // Obtener todos los meses únicos del proyecto, ordenados cronológicamente
    const monthsMap = new Map();
    filteredData.forEach(c => {
        const date = new Date(c.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthsMap.has(monthKey)) {
            monthsMap.set(monthKey, {
                key: monthKey,
                label: `${date.toLocaleString('es', { month: 'short' })} ${date.getFullYear()}`,
                sortDate: new Date(date.getFullYear(), date.getMonth(), 1)
            });
        }
    });
    
    const allMonths = Array.from(monthsMap.values()).sort((a, b) => a.sortDate - b.sortDate);
    
    developers.forEach((email, index) => {
        const devCommits = filteredData.filter(c => c.email === email);
        const monthlyData = {};
        
        devCommits.forEach(commit => {
            const date = new Date(commit.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
        });
        
        const data = allMonths.map(month => monthlyData[month.key] || 0);
        
        datasets.push({
            label: getPrimaryName(email),
            data: data,
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length] + '20',
            tension: 0.3,
            fill: true,
            pointRadius: 6,
            pointHoverRadius: 8,
            borderWidth: 3,
            pointBackgroundColor: colors[index % colors.length],
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: colors[index % colors.length],
            pointHoverBorderWidth: 3
        });
    });
    
    const labels = allMonths.map(m => m.label);
    
    charts.timeline = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { 
                        padding: 15, 
                        font: { size: 13, weight: 'bold' },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    bodySpacing: 8,
                    callbacks: {
                        title: function(context) {
                            return context[0].label;
                        },
                        label: function(context) {
                            const value = context.parsed.y;
                            if (value === 0) return null;
                            return `${context.dataset.label}: ${value} commit${value !== 1 ? 's' : ''}`;
                        },
                        afterBody: function(context) {
                            const total = context.reduce((sum, item) => sum + item.parsed.y, 0);
                            return `\nTotal del mes: ${total} commits`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: { size: 12, weight: 'bold' },
                        color: '#1e293b',
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: { 
                        stepSize: 5,
                        font: { size: 12, weight: 'bold' },
                        color: '#1e293b'
                    },
                    title: {
                        display: true,
                        text: 'Número de Commits',
                        font: { size: 13, weight: 'bold' },
                        color: '#1e293b'
                    }
                }
            }
        }
    });
}

// Renderizar tabla de desempeño
function renderPerformanceTable() {
    const developers = [...new Set(filteredData.map(c => c.email))];
    const tbody = document.getElementById('performanceTableBody');
    tbody.innerHTML = '';
    
    const performanceData = developers.map(email => {
        const devCommits = filteredData.filter(c => c.email === email);
        const fixes = devCommits.filter(c => c.type === 'fix').length;
        const features = devCommits.filter(c => c.type === 'feat').length;
        const others = devCommits.filter(c => c.type === 'otros').length;
        
        const dates = devCommits.map(c => new Date(c.date));
        const firstCommit = new Date(Math.min(...dates));
        const lastCommit = new Date(Math.max(...dates));
        
        const uniqueDates = new Set(devCommits.map(c => new Date(c.date).toDateString()));
        const activeDays = uniqueDates.size;
        const avgPerDay = activeDays > 0 ? (devCommits.length / activeDays).toFixed(2) : 0;
        
        // Obtener todos los nombres usados
        const namesUsed = [...new Set(devCommits.map(c => c.author))];
        const displayName = getPrimaryName(email);
        const nameVariations = namesUsed.length > 1 ? ` (${namesUsed.join(', ')})` : '';
        
        // Buscar estadísticas de líneas
        const lineStats = linesStatsData.find(s => s.email === email);
        
        return {
            email: email,
            name: displayName + nameVariations,
            displayName: displayName,
            totalCommits: devCommits.length,
            percentage: ((devCommits.length / filteredData.length) * 100).toFixed(1),
            fixes,
            features,
            others,
            firstCommit: firstCommit.toLocaleDateString('es'),
            lastCommit: lastCommit.toLocaleDateString('es'),
            activeDays,
            avgPerDay,
            linesAdded: lineStats ? lineStats.linesAdded : 0,
            linesDeleted: lineStats ? lineStats.linesDeleted : 0,
            linesNet: lineStats ? lineStats.linesNet : 0
        };
    }).sort((a, b) => b.totalCommits - a.totalCommits);
    
    performanceData.forEach(dev => {
        const row = document.createElement('tr');
        const linesInfo = dev.linesNet > 0 
            ? `<span class="badge badge-success" title="Líneas netas escritas">+${dev.linesNet.toLocaleString()}</span>`
            : '<span class="badge" style="background-color: #94a3b8;">Sin datos</span>';
        
        row.innerHTML = `
            <td><strong>${dev.name}</strong></td>
            <td>${dev.totalCommits}</td>
            <td><span class="badge badge-info">${dev.percentage}%</span></td>
            <td><span class="badge badge-danger">${dev.fixes}</span></td>
            <td><span class="badge badge-success">${dev.features}</span></td>
            <td><span class="badge badge-warning">${dev.others}</span></td>
            <td>${linesInfo}</td>
            <td>${dev.firstCommit}</td>
            <td>${dev.lastCommit}</td>
            <td>${dev.activeDays}</td>
            <td><strong>${dev.avgPerDay}</strong></td>
        `;
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => showDeveloperDetails(dev.email));
        tbody.appendChild(row);
    });
}

// Mostrar detalles de desarrollador
function showDeveloperDetails(developerEmail) {
    const devCommits = filteredData.filter(c => c.email === developerEmail);
    const detailsSection = document.getElementById('developerDetails');
    
    const fixes = devCommits.filter(c => c.type === 'fix').length;
    const features = devCommits.filter(c => c.type === 'feat').length;
    const others = devCommits.filter(c => c.type === 'otros').length;
    
    const dates = devCommits.map(c => new Date(c.date));
    const firstCommit = new Date(Math.min(...dates));
    const lastCommit = new Date(Math.max(...dates));
    const daysDiff = Math.ceil((lastCommit - firstCommit) / (1000 * 60 * 60 * 24));
    
    const uniqueDates = new Set(devCommits.map(c => new Date(c.date).toDateString()));
    const activeDays = uniqueDates.size;
    
    const developerName = getPrimaryName(developerEmail);
    const namesUsed = [...new Set(devCommits.map(c => c.author))];
    const nameVariationsText = namesUsed.length > 1 
        ? `<p style="color: #64748b; font-size: 0.9rem;">También conocido como: ${namesUsed.join(', ')}</p>` 
        : '';
    
    detailsSection.innerHTML = `
        <div class="developer-card">
            <h3>👤 Análisis Detallado: ${developerName}</h3>
            <p style="color: #64748b;">📧 ${developerEmail}</p>
            ${nameVariationsText}
            <div class="metrics-grid">
                <div class="metric-item">
                    <div class="value">${devCommits.length}</div>
                    <div class="label">Total Commits</div>
                </div>
                <div class="metric-item">
                    <div class="value">${((devCommits.length / filteredData.length) * 100).toFixed(1)}%</div>
                    <div class="label">% del Proyecto</div>
                </div>
                <div class="metric-item">
                    <div class="value">${fixes}</div>
                    <div class="label">Correcciones</div>
                </div>
                <div class="metric-item">
                    <div class="value">${features}</div>
                    <div class="label">Nuevas Features</div>
                </div>
                <div class="metric-item">
                    <div class="value">${others}</div>
                    <div class="label">Otros</div>
                </div>
                <div class="metric-item">
                    <div class="value">${activeDays}</div>
                    <div class="label">Días Activos</div>
                </div>
                <div class="metric-item">
                    <div class="value">${daysDiff}</div>
                    <div class="label">Días Totales</div>
                </div>
                <div class="metric-item">
                    <div class="value">${(devCommits.length / activeDays).toFixed(2)}</div>
                    <div class="label">Commits/Día Activo</div>
                </div>
            </div>
            ${generateLinesStatsHTML(developerEmail)}
        </div>
    `;
    
    detailsSection.scrollIntoView({ behavior: 'smooth' });
}

// Generar HTML de estadísticas de líneas
function generateLinesStatsHTML(email) {
    const lineStats = linesStatsData.find(s => s.email === email);
    
    if (!lineStats) {
        return '<p style="color: #94a3b8; margin-top: 1rem; font-style: italic;">📊 Estadísticas de líneas no disponibles</p>';
    }
    
    return `
        <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 2px solid #e2e8f0;">
            <h4 style="margin-bottom: 1rem; color: #1e293b;">📊 Estadísticas de Código</h4>
            <div class="metrics-grid">
                <div class="metric-item" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                    <div class="value" style="color: white;">${lineStats.linesAdded.toLocaleString()}</div>
                    <div class="label" style="color: rgba(255,255,255,0.9);">Líneas Agregadas</div>
                </div>
                <div class="metric-item" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                    <div class="value" style="color: white;">${lineStats.linesDeleted.toLocaleString()}</div>
                    <div class="label" style="color: rgba(255,255,255,0.9);">Líneas Eliminadas</div>
                </div>
                <div class="metric-item" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
                    <div class="value" style="color: white;">${lineStats.linesNet > 0 ? '+' : ''}${lineStats.linesNet.toLocaleString()}</div>
                    <div class="label" style="color: rgba(255,255,255,0.9);">Líneas Netas</div>
                </div>
            </div>
        </div>
    `;
}

// Renderizar lista de commits
function renderCommitsList() {
    const commitsList = document.getElementById('commitsList');
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageCommits = filteredData.slice(start, end);
    
    commitsList.innerHTML = '';
    
    pageCommits.forEach(commit => {
        const date = new Date(commit.date);
        const formattedDate = date.toLocaleDateString('es', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const commitItem = document.createElement('div');
        commitItem.className = `commit-item ${commit.type}`;
        commitItem.innerHTML = `
            <div class="commit-header">
                <div class="commit-subject">${commit.subject}</div>
                <span class="commit-type ${commit.type}">${commit.type.toUpperCase()}</span>
            </div>
            <div class="commit-meta">
                <span>👤 ${commit.author}</span>
                <span>📅 ${formattedDate}</span>
                <span>🔗 ${commit.commit}</span>
                ${commit.refs ? `<span>🌿 ${commit.refs}</span>` : ''}
            </div>
        `;
        commitsList.appendChild(commitItem);
    });
    
    updatePagination();
}

// Actualizar paginación
function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    document.getElementById('pageInfo').textContent = `Página ${currentPage} de ${totalPages}`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

// Función para recargar datos
async function reloadData() {
    const btn = document.getElementById('reloadData');
    btn.classList.add('loading');
    btn.disabled = true;
    
    try {
        console.log('🔄 Recargando datos...');
        
        // Cargar output.json
        const response = await fetch('output.json?t=' + Date.now()); // Cache bust
        
        if (!response.ok) {
            throw new Error('No se pudo cargar output.json');
        }
        
        const rawData = await response.json();
        commitsData = processOutputData(rawData);
        filteredData = [...commitsData];
        
        // Recargar estadísticas de líneas
        try {
            const statsResponse = await fetch('stats-lines.json?t=' + Date.now());
            if (statsResponse.ok) {
                linesStatsData = await statsResponse.json();
                console.log('✅ Estadísticas de líneas actualizadas');
            }
        } catch (e) {
            console.log('⚠️ stats-lines.json no encontrado');
        }
        
        // Limpiar filtros
        document.getElementById('developerFilter').value = 'todos';
        document.getElementById('monthFilter').value = 'todos';
        document.getElementById('typeFilter').value = 'todos';
        document.getElementById('searchCommits').value = '';
        currentPage = 1;
        
        // Re-popular filtros
        document.getElementById('developerFilter').innerHTML = '<option value="todos">Todos</option>';
        document.getElementById('monthFilter').innerHTML = '<option value="todos">Todos</option>';
        populateFilters();
        
        // Actualizar todo el dashboard
        updateDashboard();
        
        console.log('✅ Datos actualizados correctamente');
        
        // Mostrar notificación
        showNotification('✅ Dashboard actualizado con los últimos datos');
        
    } catch (error) {
        console.error('Error recargando datos:', error);
        showNotification('❌ Error al actualizar: ' + error.message, 'error');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// Función para mostrar notificaciones
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ef4444' : '#10b981'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-weight: 600;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Configurar event listeners
function setupEventListeners() {
    // Filtros
    document.getElementById('developerFilter').addEventListener('change', applyFilters);
    document.getElementById('monthFilter').addEventListener('change', applyFilters);
    document.getElementById('typeFilter').addEventListener('change', applyFilters);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    
    // Botón de recarga
    document.getElementById('reloadData').addEventListener('click', reloadData);
    
    // Búsqueda
    document.getElementById('searchCommits').addEventListener('input', applySearch);
    
    // Paginación
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderCommitsList();
        }
    });
    
    document.getElementById('nextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredData.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderCommitsList();
        }
    });
}

// Aplicar filtros
function applyFilters() {
    const devFilter = document.getElementById('developerFilter').value;
    const monthFilter = document.getElementById('monthFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    
    filteredData = commitsData.filter(commit => {
        let match = true;
        
        if (devFilter !== 'todos') {
            match = match && commit.email === devFilter;
        }
        
        if (monthFilter !== 'todos') {
            const date = new Date(commit.date);
            const commitMonth = `${date.toLocaleString('es', { month: 'long' })} ${date.getFullYear()}`;
            match = match && commitMonth === monthFilter;
        }
        
        if (typeFilter !== 'todos') {
            match = match && commit.type === typeFilter;
        }
        
        return match;
    });
    
    currentPage = 1;
    updateDashboard();
}

// Aplicar búsqueda
function applySearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    if (searchTerm === '') {
        applyFilters();
        return;
    }
    
    filteredData = commitsData.filter(commit => {
        return commit.subject.toLowerCase().includes(searchTerm) ||
               commit.author.toLowerCase().includes(searchTerm) ||
               commit.commit.toLowerCase().includes(searchTerm);
    });
    
    // Mantener otros filtros activos
    const devFilter = document.getElementById('developerFilter').value;
    const monthFilter = document.getElementById('monthFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    
    if (devFilter !== 'todos') {
        filteredData = filteredData.filter(c => c.email === devFilter);
    }
    if (monthFilter !== 'todos') {
        filteredData = filteredData.filter(c => {
            const date = new Date(c.date);
            const commitMonth = `${date.toLocaleString('es', { month: 'long' })} ${date.getFullYear()}`;
            return commitMonth === monthFilter;
        });
    }
    if (typeFilter !== 'todos') {
        filteredData = filteredData.filter(c => c.type === typeFilter);
    }
    
    currentPage = 1;
    updateDashboard();
}

// Restablecer filtros
function resetFilters() {
    document.getElementById('developerFilter').value = 'todos';
    document.getElementById('monthFilter').value = 'todos';
    document.getElementById('typeFilter').value = 'todos';
    document.getElementById('searchCommits').value = '';
    
    filteredData = [...commitsData];
    currentPage = 1;
    updateDashboard();
}

// Actualizar dashboard
function updateDashboard() {
    updateSummaryCards();
    createCharts();
    renderPerformanceTable();
    renderCommitsList();
}

// Toggle de tema día/noche
function toggleTheme() {
    const body = document.body;
    const themeButton = document.getElementById('themeToggle');
    
    body.classList.toggle('dark-mode');
    
    // Cambiar el icono
    if (body.classList.contains('dark-mode')) {
        themeButton.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    } else {
        themeButton.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    }
    
    // Recrear gráficos para que usen los nuevos colores
    if (Object.keys(charts).length > 0) {
        createCharts();
    }
}

// Cargar tema guardado
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeButton = document.getElementById('themeToggle');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeButton.textContent = '☀️';
    } else {
        themeButton.textContent = '🌙';
    }
}

// Iniciar cuando cargue el DOM
document.addEventListener('DOMContentLoaded', () => {
    loadSavedTheme();
    loadData();
    
    // Event listener para el botón de tema
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
});
