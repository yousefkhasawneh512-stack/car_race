#!/usr/bin/env python3
"""Make a fully offline copy of the game: dist/irbid-drive.html with the three.js r128 <script src=cdnjs...> replaced by the same file inlined
from node_modules/three (MIT licence; its header comment is kept). Nothing else changes.
usage: python tools/make_offline.py [out.html]   (default: dist/irbid-drive-offline.html, git-ignored: 4.9 MB, regenerate it)
The online build stays the deliverable; this copy is for playing without a connection (open it straight from disk)."""
import os,sys,json
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src=open(os.path.join(R,'dist','irbid-drive.html'),encoding='utf-8').read()
pkg=json.load(open(os.path.join(R,'node_modules','three','package.json'),encoding='utf-8'))
if pkg.get('version')!='0.128.0':sys.exit('node_modules/three is %s, expected 0.128.0 (r128): run npm install'%pkg.get('version'))
three=open(os.path.join(R,'node_modules','three','build','three.min.js'),encoding='utf-8').read()
tag='<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
if src.count(tag)!=1:sys.exit('three.js script tag not found exactly once')
out=src.replace(tag,'<script>/* three.js r128 (MIT licence, https://github.com/mrdoob/three.js), inlined for offline play */\n'+three.replace('</script','<\\/script')+'\n</script>')
dst=sys.argv[1] if len(sys.argv)>1 else os.path.join(R,'dist','irbid-drive-offline.html')
open(dst,'w',encoding='utf-8',newline='\n').write(out)
print(dst,len(out),'chars')
