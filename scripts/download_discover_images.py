#!/usr/bin/env python3
"""Download artwork images for the /discover screen from Art Institute of Chicago API."""

import subprocess
import json
import os
import time
import urllib.parse

OUTDIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'images', 'discover')
IIIF = 'https://www.artic.edu/iiif/2'
AIC  = 'https://api.artic.edu/api/v1/artworks/search'
UA   = 'ArtTracker/1.0 (educational project; contact@example.com)'

# Artists to fetch — no Banksy per user request
ARTISTS = [
    ('vangogh',     'starry night van gogh'),
    ('picasso',     'les demoiselles avignon picasso'),
    ('davinci',     'mona lisa'),
    ('monet',       'water lilies monet'),
    ('rembrandt',   'rembrandt self portrait'),
    ('dali',        'persistence of memory dali'),
    ('kahlo',       'frida kahlo self portrait'),
    ('vermeer',     'johannes vermeer pearl earring'),
    ('michelangelo','michelangelo'),
    ('matisse',     'henri matisse dance'),
    ('klimt',       'gustav klimt'),
    ('munch',       'edvard munch'),
    ('raphael',     'raphael school of athens'),
    ('botticelli',  'botticelli birth of venus'),
    ('caravaggio',  'caravaggio calling saint matthew'),
    ('goya',        'francisco goya'),
    ('renoir',      'pierre-auguste renoir moulin galette'),
    ('degas',       'edgar degas'),
    ('cezanne',     'paul cezanne'),
    ('manet',       'edouard manet olympia'),
    ('gauguin',     'paul gauguin'),
    ('mondrian',    'piet mondrian composition'),
    ('chagall',     'marc chagall'),
    ('pollock',     'jackson pollock'),
    ('warhol',      'andy warhol'),
    ('rothko',      'mark rothko'),
    ('basquiat',    'jean-michel basquiat'),
    ('klee',        'paul klee'),
    ('miro',        'joan miro'),
    ('magritte',    'rene magritte'),
    ('okeeffe',     'georgia okeeffe'),
    ('schiele',     'egon schiele'),
    ('bosch',       'hieronymus bosch'),
    ('vaneyck',     'jan van eyck arnolfini'),
    ('kandinsky',   'wassily kandinsky composition'),
]

def curl_get(url):
    r = subprocess.run(
        ['curl', '-s', '-H', f'User-Agent: {UA}', url],
        capture_output=True, timeout=20
    )
    return r.stdout

def curl_download(url, outpath):
    r = subprocess.run(
        ['curl', '-s', '-L', '-H', f'User-Agent: {UA}', '-o', outpath, url],
        capture_output=True, timeout=20
    )
    return r.returncode == 0

def is_valid_jpeg(path):
    if not os.path.exists(path):
        return False
    with open(path, 'rb') as f:
        return f.read(3) == b'\xff\xd8\xff'

os.makedirs(OUTDIR, exist_ok=True)

for slug, query in ARTISTS:
    outfile = os.path.join(OUTDIR, slug + '.jpg')

    if is_valid_jpeg(outfile):
        size = os.path.getsize(outfile) // 1024
        print(f'skip  {slug} (already {size}KB)')
        continue

    encoded = urllib.parse.quote(query)
    api_url = f'{AIC}?q={encoded}&limit=5&fields=id,title,image_id,is_public_domain'

    raw = curl_get(api_url)
    if not raw:
        print(f'FAIL  {slug}: empty API response')
        continue

    try:
        data = json.loads(raw)
    except Exception as e:
        print(f'FAIL  {slug}: JSON parse error — {e}')
        continue

    image_id = None
    title = ''
    for w in data.get('data', []):
        if w.get('image_id'):
            image_id = w['image_id']
            title = w.get('title', '')[:50]
            break

    if not image_id:
        print(f'NO IMAGE {slug}')
        continue

    img_url = f'{IIIF}/{image_id}/full/400,/0/default.jpg'
    tmpfile = outfile + '.tmp'
    curl_download(img_url, tmpfile)

    if is_valid_jpeg(tmpfile):
        os.rename(tmpfile, outfile)
        size = os.path.getsize(outfile) // 1024
        print(f'ok    {slug} ({size}KB) "{title}"')
    else:
        if os.path.exists(tmpfile):
            os.remove(tmpfile)
        print(f'FAIL  {slug} — not a JPEG (url: {img_url})')

    time.sleep(0.1)

print('\nDone.')
