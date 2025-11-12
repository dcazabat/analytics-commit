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
    
    return normalization_map

def normalize_email(email, normalization_map):
    """Normaliza un email a su versión canónica"""
    return normalization_map.get(email, email)

def get_commits(normalization_map):
    """Obtiene los commits del repositorio usando git log"""
    
    # Formato del git log
    git_format = [
        '%H',  # commit hash
        '%h',  # abbreviated commit hash
        '%T',  # tree hash
        '%t',  # abbreviated tree hash
        '%P',  # parent hashes
        '%p',  # abbreviated parent hashes
        '%D',  # refs
        '%e',  # encoding
        '%s',  # subject
        '%f',  # sanitized subject
        '%b',  # body
        '%N',  # commit notes
        '%aN', # author name
        '%aE', # author email
        '%aD', # author date
        '%cN', # committer name
        '%cE', # committer email
        '%cD', # committer date
    ]
    
    separator = '|||GIT_COMMIT_SEPARATOR|||'
    field_separator = '|||FIELD|||'
    
    format_string = field_separator.join(git_format)
    
    # Ejecutar git log
    result = subprocess.run(
        ['git', 'log', '--all', f'--pretty=format:{format_string}{separator}'],
        capture_output=True,
        text=True,
        cwd='..'
    )
    
    if result.returncode != 0:
        print(f"Error ejecutando git log: {result.stderr}", file=sys.stderr)
        sys.exit(1)
    
    # Parsear la salida
    commits = []
    commit_strings = result.stdout.split(separator)
    
    for commit_str in commit_strings:
        if not commit_str.strip():
            continue
            
        fields = commit_str.split(field_separator)
        
        if len(fields) < 18:
            continue
        
        # Normalizar emails
        author_email = normalize_email(fields[13].strip(), normalization_map)
        committer_email = normalize_email(fields[16].strip(), normalization_map)
        
        commit_data = {
            "commit": fields[0].strip(),
            "abbreviated_commit": fields[1].strip(),
            "tree": fields[2].strip(),
            "abbreviated_tree": fields[3].strip(),
            "parent": fields[4].strip(),
            "abbreviated_parent": fields[5].strip(),
            "refs": fields[6].strip(),
            "encoding": fields[7].strip(),
            "subject": fields[8].strip(),
            "sanitized_subject_line": fields[9].strip(),
            "body": fields[10].strip(),
            "commit_notes": fields[11].strip(),
            "author": {
                "name": fields[12].strip(),
                "email": author_email,
                "date": fields[14].strip()
            },
            "committer": {
                "name": fields[15].strip(),
                "email": committer_email,
                "date": fields[17].strip()
            }
        }
        
        commits.append(commit_data)
    
    return commits

if __name__ == '__main__':
    try:
        print("📝 Generando output.json...", file=sys.stderr)
        
        # Construir mapa de normalización automáticamente
        normalization_map = build_email_normalization_map()
        
        # Mostrar emails detectados
        if normalization_map:
            print("\n🔍 Emails duplicados detectados automáticamente:", file=sys.stderr)
            for orig, norm in normalization_map.items():
                print(f"  {orig} → {norm}", file=sys.stderr)
            print("", file=sys.stderr)
        
        # Generar commits con normalización
        commits = get_commits(normalization_map)
        
        # Escribir JSON
        with open('output.json', 'w', encoding='utf-8') as f:
            json.dump(commits, f, indent=2, ensure_ascii=False)
        
        print(f"✅ output.json generado con {len(commits)} commits", file=sys.stderr)
        
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)
