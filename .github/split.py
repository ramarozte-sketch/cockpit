# Prepara a cópia para o InfinityFree: o filtro automático do InfinityFree apaga o index.html
# quando o HTML e todo o JavaScript estão no mesmo ficheiro (falso positivo). Aqui o JavaScript
# de cada <script> embutido passa para ficheiros app/N.js, carregados pela mesma ordem.
import re, os, shutil, sys
src, out, ver = '.', 'dist', (sys.argv[1] if len(sys.argv) > 1 else '0')[:8]
shutil.rmtree(out, ignore_errors=True)
shutil.copytree(src, out, ignore=shutil.ignore_patterns('.git', '.github', 'dist', '.ftp-deploy-sync-state.json'))
s = open(os.path.join(src, 'index.html'), encoding='utf-8').read()
os.makedirs(os.path.join(out, 'app'), exist_ok=True)
n = 0
def rep(m):
    global n
    attrs, body = m.group(1), m.group(2)
    if 'type=' in attrs and 'module' not in attrs: return m.group(0)   # dados (JSON) ficam onde estão
    n += 1
    open(os.path.join(out, 'app', f'{n}.js'), 'w', encoding='utf-8').write(body)
    return f'<script{attrs} src="app/{n}.js?v={ver}"></script>'
s = re.sub(r'<script((?:(?!\bsrc=)[^>])*)>(.*?)</script>', rep, s, flags=re.S)
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(s)
print('scripts separados:', n, 'index:', len(s))
