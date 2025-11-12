#!/usr/bin/env python3
import subprocess
import json
import sys
from difflib import SequenceMatcher

def build_email_normalization_map():
    """
    Construye automáticamente un mapa de normalización de emails
    detectando desarrolladores con múltiples emails basándose en similitud de nombres
    """
    # Obtener lista de emails y nombres únicos
    result = subprocess.run(
        ['git', 'log', '--all', '--format=%aE|||%aN'],
        capture_output=True,
        text=True,
        cwd='..'
    )
    
    if result.returncode != 0:
        print(f"Error obteniendo emails: {result.stderr}", file=sys.stderr)
        return {}
    
    # Parsear emails y nombres
    email_to_name = {}
    for line in result.stdout.strip().split('\n'):
        if '|||' in line:
            email, name = line.split('|||')
            email = email.strip()
            name = name.strip()
            if email and name:
                email_to_name[email] = name
    
    # Agrupar emails por similitud de nombre
    email_groups = {}
    processed = set()
    
    for email1, name1 in email_to_name.items():
        if email1 in processed:
            continue
            
        # Iniciar grupo con este email
        group = [email1]
        name1_lower = name1.lower()
        
        # Buscar emails similares
        for email2, name2 in email_to_name.items():
            if email1 == email2 or email2 in processed:
                continue
            
            name2_lower = name2.lower()
            
            # Calcular similitud de nombres
            similarity = SequenceMatcher(None, name1_lower, name2_lower).ratio()
            
            # Si los nombres son muy similares o uno está contenido en el otro
            if similarity > 0.6 or name1_lower in name2_lower or name2_lower in name1_lower:
                group.append(email2)
                processed.add(email2)
        
        if len(group) > 1:
            # El email preferido es el más corto que no sea de github noreply
            non_noreply = [e for e in group if 'noreply.github.com' not in e]
            if non_noreply:
                canonical = min(non_noreply, key=len)
            else:
                canonical = min(group, key=len)
            
            email_groups[tuple(sorted(group))] = canonical
            processed.add(email1)
    
    # Construir mapa de normalización
    normalization_map = {}
    for group, canonical in email_groups.items():
        for email in group:
            if email != canonical:
                normalization_map[email] = canonical
    
    # Imprimir mapa detectado para información
    if normalization_map:
        print("\n🔍 Emails duplicados detectados automáticamente:", file=sys.stderr)
        for orig, norm in normalization_map.items():
            name = email_to_name.get(orig, 'Unknown')
            print(f"  {name}: {orig} → {norm}", file=sys.stderr)
        print("", file=sys.stderr)
    
    return normalization_map

def normalize_email(email, normalization_map):
    """Normaliza un email a su versión canónica"""
    return normalization_map.get(email, email)

def get_lines_stats(normalization_map):
    """Obtiene estadísticas de líneas por desarrollador"""
    
    # Ejecutar git log con numstat
    result = subprocess.run(
        [
            'git', 'log', '--all', '--format=%aE', '--numstat', '--no-merges',
            '--', '.',
            ':(exclude)package-lock.json',
            ':(exclude)composer.lock',
            ':(exclude)*.min.js',
            ':(exclude)*.min.css'
        ],
        capture_output=True,
        text=True,
        cwd='..'
    )
    
    if result.returncode != 0:
        print(f"Error ejecutando git log: {result.stderr}", file=sys.stderr)
        sys.exit(1)
    
    # Procesar la salida
    stats = {}
    current_author = None
    
    for line in result.stdout.split('\n'):
        line = line.strip()
        
        # Línea de email
        if '@' in line and not '\t' in line:
            current_author = normalize_email(line, normalization_map)
            if current_author not in stats:
                stats[current_author] = {'added': 0, 'deleted': 0}
        
        # Línea de estadísticas (added, deleted, filename)
        elif line and current_author:
            parts = line.split('\t')
            if len(parts) >= 2:
                try:
                    added = int(parts[0]) if parts[0] != '-' else 0
                    deleted = int(parts[1]) if parts[1] != '-' else 0
                    
                    # Filtrar cambios muy grandes (probablemente archivos generados)
                    if added < 100000 and deleted < 100000:
                        stats[current_author]['added'] += added
                        stats[current_author]['deleted'] += deleted
                except ValueError:
                    continue
    
    # Convertir a lista de objetos
    result = []
    for email, data in stats.items():
        result.append({
            'email': email,
            'linesAdded': data['added'],
            'linesDeleted': data['deleted'],
            'linesNet': data['added'] - data['deleted']
        })
    
    # Ordenar por líneas netas
    result.sort(key=lambda x: x['linesNet'], reverse=True)
    
    return result

if __name__ == '__main__':
    try:
        print("📊 Generando stats-lines.json...", file=sys.stderr)
        
        # Construir mapa de normalización automáticamente
        normalization_map = build_email_normalization_map()
        
        # Generar estadísticas con normalización
        stats = get_lines_stats(normalization_map)
        
        # Escribir JSON
        with open('stats-lines.json', 'w', encoding='utf-8') as f:
            json.dump(stats, f, indent=2, ensure_ascii=False)
        
        print(f"✅ stats-lines.json generado con {len(stats)} desarrolladores", file=sys.stderr)
        
        # Mostrar resumen
        print("\n📈 Resumen de líneas:", file=sys.stderr)
        for dev in stats:
            print(f"  {dev['email']}: +{dev['linesNet']:,} líneas netas", file=sys.stderr)
        
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)
