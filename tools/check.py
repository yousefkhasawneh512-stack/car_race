"""Project check workflow (v47). Runs from the repo root:

  python tools/check.py            quick: tree state, syntax of every part, build, script-extraction guard, JSON, asset manifests,
                                   external hosts in the build, the core Node checks
  python tools/check.py --full     + every Node check and every Playwright check (about 25-40 minutes on this PC)

Writes a Markdown report to .check/report.md (git-ignored) and prints it. When EVERYTHING passes, the build is copied to
dist/last-good/irbid-drive.html (git-ignored) with a stamp file, so the last known working build is kept even if a later change breaks
dist/. It never publishes, commits or deletes anything. Exits 1 if any check fails.
Expected values for the checks whose output is read by eye come from CLAUDE.md / PLAN.md ("expected pre-existing test results")."""
import sys,os,re,json,subprocess,shutil,tempfile,time,glob,hashlib
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));os.chdir(ROOT)
PY=sys.executable;NODE=shutil.which('node')or'node';B='dist/irbid-drive.html';FULL='--full' in sys.argv
rows=[];t0=time.time()
def rec(name,ok,detail=''):
    rows.append((name,ok,detail));print(('PASS ' if ok else 'FAIL ')+name+('  '+detail if detail else ''),flush=True)
def run(cmd,cwd=ROOT,timeout=1800):
    try:p=subprocess.run(cmd,cwd=cwd,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=timeout);return p.returncode,(p.stdout+p.stderr).strip()
    except subprocess.TimeoutExpired:return 124,'timeout'
last=lambda s:(s.strip().splitlines() or [''])[-1][:200]
# 1. working tree
c,o=run(['git','status','--porcelain']);rec('git working tree readable',c==0,('clean' if not o else str(len(o.splitlines()))+' changed/untracked paths'))
# 2. syntax of every part (catches the mid-line // comment class of bug and broken edits before the build)
order=re.search(r"order=\[(.*?)\]",open('build.py',encoding='utf-8').read(),re.S).group(1);parts=re.findall(r"'([^']+)'",order)
missing=[p for p in parts if not os.path.exists('src/parts/'+p)]
rec('every part in build.py exists',not missing,', '.join(missing))
unused=[os.path.basename(p) for p in glob.glob('src/parts/*.js') if os.path.basename(p) not in parts]
if unused:print('     note: parts not in the build order: '+', '.join(unused))
js="const fs=require('fs');let bad=[];for(const f of process.argv.slice(1)){try{new Function(fs.readFileSync(f,'utf8'))}catch(e){bad.push(f+': '+e.message)}}console.log(bad.join('\\n')||'ok');process.exit(bad.length?1:0)"
c,o=run([NODE,'-e',js]+['src/parts/'+p for p in parts if p.endswith('.js')]);rec('syntax of all '+str(len(parts))+' parts',c==0,'' if c==0 else o[:400])
# 3. build
c,o=run([PY,'build.py']);rec('build',c==0 and os.path.exists(B),last(o))
html=open(B,encoding='utf-8').read()
# 4. the Node tests and tools find the game script with /<script>\n/: exactly one such tag, and it must be the big one
m=re.findall(r'<script>\n',html);g=re.search(r'<script>\n([\s\S]*?)</script>',html)
rec('game script extractable by the test harness',len(m)==1 and g and len(g.group(1))>1_000_000,'%d match(es)'%len(m))
# the whole game script parses as ONE script (catches a top-level name declared in two parts, which per-part checks cannot see)
if g:
    tf=os.path.join(tempfile.gettempdir(),'irbid_check_game.js');open(tf,'w',encoding='utf-8').write(g.group(1))
    c,o=run([NODE,'-e',"try{new Function(require('fs').readFileSync(process.argv[1],'utf8'));console.log('ok')}catch(e){console.log(e.message);process.exit(1)}",tf]);rec('whole game script parses (no duplicate top-level names)',c==0,last(o))
# 5. external hosts the build loads at run time (constraint 8: only cdnjs for three r128; links such as the OSM copyright page are fine)
hosts=sorted(set(re.findall(r'(?:src=|fetch\(|import\(|new Worker\(|\.open\([\'"]GET[\'"],\s*)[\'"]https?://([^/\'"]+)',html)))
rec('run-time hosts = cdnjs only',hosts==['cdnjs.cloudflare.com'],', '.join(hosts))
rec('OpenStreetMap attribution in the build','id="osmcr"' in html and 'openstreetmap.org/copyright' in html)
# 6. JSON files parse
bad=[]
for f in glob.glob('manifest/*.json')+glob.glob('assets/manifests/*.json')+['package.json']+glob.glob('app/*.json'):
    try:json.load(open(f,encoding='utf-8'))
    except Exception as e:bad.append(f+': '+str(e)[:80])
rec('JSON files parse',not bad,'; '.join(bad))
# 7. asset manifests (fields, licences, files, sizes, checksums)
c,o=run([NODE,'scripts/validate-assets.js',B]);rec('asset manifests',c==0,last(o))
# 8. Node checks: (name, run from repo root?, regex the LAST line must match; None = exit code only)
CORE=[('off_trace',1,r'^== same|identical|same'),('val_net',0,r'widths'),('boot',0,r'meshes \d+'),('h2',0,r'true'),('h13',0,r'true'),('h20',0,r'\[\[1500,3000'),('h24',0,r'bad 6$'),('assist_v46',1,r'all passed'),('assist_v48',1,r'all passed')]
MORE=[('realism_test',1,r'all passed'),('damage_test',1,r'all passed'),('damage_v44',1,r'all passed'),('handling_test',1,r'all passed'),('drift_v45',1,r'all passed'),
 ('audio_v45',1,r'all passed'),('save_v45',1,r'all passed'),('dyn_check',0,r'groundH'),('h16',0,r' 0$'),('tour',0,r'off-road 0'),('lmchk',0,None),('signals_test',0,r'all passed'),('vg',0,r'bad 9$'),('h14',0,r'bad 2$')]
W=tempfile.mkdtemp(prefix='irbid-check-')
for name,root,rx in CORE+(MORE if FULL else []):
    c,o=run([NODE,os.path.join(ROOT,'tests',name+'.js'),os.path.join(ROOT,B)],cwd=ROOT if root else W)
    ok=c==0 and (rx is None or re.search(rx,last(o)) is not None);rec('node '+name,ok,last(o))
if FULL:
    c,o=run([NODE,os.path.join(ROOT,'tests/h21.js'),os.path.join(ROOT,B),os.path.join(W,'h21.json')],cwd=W);rec('node h21 (places)',c==0 and 'places 1729' in o,last(o))
    PW=['v48_pw','v47_pw','xbrowser_pw','v46_pw','damage_pw','damage_v44_pw','world_v44_pw','audio_v45_pw','pause_v45_pw','playtest_v45_pw','dc2','disp','ios','shopt','drive_pw','place_audit']
    for name in PW:
        env=dict(os.environ);env.pop('SP',None)
        if name in('v48_pw','v47_pw','v46_pw','pause_v45_pw','playtest_v45_pw'):env['SP']=os.path.join(W,'shots')
        try:p=subprocess.run([PY,'tests/'+name+'.py',B],cwd=ROOT,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=1800,env=env);c,o=p.returncode,(p.stdout+p.stderr).strip()
        except subprocess.TimeoutExpired:c,o=124,'timeout'
        ok=c==0 and not re.search(r'FAIL|Traceback',o.split('\n')[-1]);rec('browser '+name,ok,last(o))
    for arg in([],['blocked']):
        c,o=run([PY,'tests/wheel_test.py',B]+arg);rec('browser wheel_test '+' '.join(arg),c==0 and ('"passed": 43, "total": 43' in o or (arg and 'true' in last(o) and 'false' not in last(o))),last(o))
    run(['git','checkout','--','docs/screenshots/v44'])   # damage_v44_pw / world_v44_pw always write there
shutil.rmtree(W,ignore_errors=True)
# report + last known good build
nf=sum(1 for r in rows if not r[1])
rep=['# Irbid Drive check report','',time.strftime('%Y-%m-%d %H:%M')+' · '+('full' if FULL else 'quick')+' · %.0f s · build sha256 %s'%(time.time()-t0,hashlib.sha256(html.encode()).hexdigest()[:16]),'',
 '| Check | Result | Detail |','|---|---|---|']+['| %s | %s | %s |'%(n,'PASS' if ok else '**FAIL**',d.replace('|','/')) for n,ok,d in rows]+['','**%d of %d passed.**'%(len(rows)-nf,len(rows))]
os.makedirs('.check',exist_ok=True);open('.check/report.md','w',encoding='utf-8').write('\n'.join(rep)+'\n')
if nf==0:
    os.makedirs('dist/last-good',exist_ok=True);shutil.copy2(B,'dist/last-good/irbid-drive.html')
    open('dist/last-good/STAMP.txt','w').write(rep[2]+'\n');print('last known good build kept: dist/last-good/irbid-drive.html')
print('\n'.join(rep[-1:]));sys.exit(1 if nf else 0)
