#!/usr/bin/env python3
"""Build the web bundle for the Capacitor app (app/www, git-ignored): the OFFLINE single-file game (three.js r128 inlined, so the app needs
no network) as app/www/index.html. Run after build.py; then `cd app && npx cap sync` copies it into android/ and ios/.
usage: python tools/make_app_www.py"""
import os,subprocess,sys
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));W=os.path.join(R,'app','www');os.makedirs(W,exist_ok=True)
out=os.path.join(W,'index.html');subprocess.run([sys.executable,os.path.join(R,'tools','make_offline.py'),out],check=True)
s=open(out,encoding='utf-8').read()
if '<head>' not in s and '<head ' not in s:sys.exit('index.html needs a <head> tag for Capacitor')
if 'cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>' in s:sys.exit('three.js not inlined')
print('app/www/index.html ready (%d MB)'%(len(s.encode())//1048576))
