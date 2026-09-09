import re, sys, os

root = sys.argv[1]
for name in sys.argv[2:]:
    path = os.path.join(root, name + '.html')
    print(f'=== {name}.html ===')
    if not os.path.exists(path):
        print('MISSING')
        continue
    h = open(path, encoding='utf8').read()
    g = lambda r: re.findall(r, h)
    print('size', len(h))
    print('html', g(r'<html[^>]*>'))
    print('title', g(r'<title[^>]*>([^<]*)</title>'))
    print('description', [d[:60] for d in g(r'name="description"[^>]*content="([^"]*)"')])
    print('og:title', g(r'property="og:title"[^>]*content="([^"]*)"'))
    print('canonical', g(r'rel="canonical"[^>]*href="([^"]*)"'))
    print('robots', g(r'name="robots"[^>]*content="([^"]*)"'))
    print('theme-color', g(r'name="theme-color"[^>]*content="([^"]*)"'))
    print('helmet tags (data-rh)', h.count('data-rh'))
    print('inline scripts', len(g(r'<script>')), 'script src', g(r'<script[^>]*src="([^"]*)"'))
    print('stylesheets', g(r'<link[^>]*rel="stylesheet"[^>]*href="([^"]*)"'))
    print('font links', len(g(r'<link[^>]*(?:preload|font)[^>]*>')), 'font-face styles', h.count('@font-face'))
    b = re.search(r'<body[^>]*>([\s\S]*)</body>', h).group(1)
    b = re.sub(r'<script[\s\S]*?</script>', '', b)
    t = re.sub(r'<[^>]+>', ' ', b)
    t = re.sub(r'\s+', ' ', t).strip()
    print('bodyChars', len(t))
    print('body:', t[:400])
    print()
