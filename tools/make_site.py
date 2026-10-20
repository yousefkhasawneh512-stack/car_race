"""Build the public website folder from the game build (used by .github/workflows/pages.yml; also runs locally).
usage: python tools/make_site.py [out_dir]   (default: site/, git-ignored)
Writes index.html (the game + description / social-preview / canonical tags), robots.txt, sitemap.xml and 404.html.
The game itself is unchanged: only tags are added to <head>."""
import os,sys,datetime
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.abspath(sys.argv[1]) if len(sys.argv)>1 else os.path.join(ROOT,'site')
URL='https://yousefkhasawneh512-stack.github.io/car_race/'
DESC=('Irbid Drive: a free open-world 3D driving game in your browser on a real-data model of Irbid, Jordan '
      '(OpenStreetMap streets, buildings and places, SRTM terrain). Drift, race, driving school, 217 cars, keyboard, touch or G29 wheel.')
html=open(os.path.join(ROOT,'dist','irbid-drive.html'),encoding='utf-8',newline='').read()
tags=('<meta name="description" content="%s">\n<link rel="canonical" href="%s">\n'
      '<meta property="og:type" content="website"><meta property="og:title" content="Irbid Drive"><meta property="og:url" content="%s">'
      '<meta property="og:description" content="%s">\n<meta name="robots" content="index,follow">\n')%(DESC,URL,URL,DESC)
a='<title>Irbid Drive</title>\n'
assert html.count(a)==1,'title tag not found'
html=html.replace(a,'<title>Irbid Drive: free 3D driving game in Irbid, Jordan</title>\n'+tags,1)
os.makedirs(OUT,exist_ok=True)
w=lambda n,s:open(os.path.join(OUT,n),'w',encoding='utf-8',newline='\n').write(s)
w('index.html',html)
w('robots.txt','User-agent: *\nAllow: /\nSitemap: %ssitemap.xml\n'%URL)
w('sitemap.xml','<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>%s</loc><lastmod>%s</lastmod></url></urlset>\n'%(URL,datetime.date.today().isoformat()))
w('404.html','<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=%s"><title>Irbid Drive</title><a href="%s">Irbid Drive</a>\n'%(URL,URL))
w('.nojekyll','')
print('site ->',OUT,len(html),'chars')
