"""The game's projection (same maths as LL2XZ in src/parts/03_world_data.js): WGS84 transverse Mercator, k=1, origin 32.55 N 35.85 E.
x = easting (m), z = -northing (m). xz2ll inverts it numerically (Newton), accurate to < 1 mm inside the play area."""
import math
A=6378137.0;F=1/298.257223563;E2=F*(2-F);EP2=E2/(1-E2);LAT0=math.radians(32.55);LON0=math.radians(35.85)
def _mer(p):return A*((1-E2/4-3*E2*E2/64-5*E2**3/256)*p-(3*E2/8+3*E2*E2/32+45*E2**3/1024)*math.sin(2*p)+(15*E2*E2/256+45*E2**3/1024)*math.sin(4*p)-(35*E2**3/3072)*math.sin(6*p))
M0=_mer(LAT0)
def ll2xz(lat,lon):
    p=math.radians(lat);l=math.radians(lon);N=A/math.sqrt(1-E2*math.sin(p)**2);T=math.tan(p)**2;C=EP2*math.cos(p)**2;a=(l-LON0)*math.cos(p)
    x=N*(a+(1-T+C)*a**3/6+(5-18*T+T*T+72*C-58*EP2)*a**5/120)
    y=_mer(p)-M0+N*math.tan(p)*(a*a/2+(5-T+9*C+4*C*C)*a**4/24+(61-58*T+T*T+600*C-330*EP2)*a**6/720)
    return x,-y
def xz2ll(x,z):
    la=32.55-z/110900.0;lo=35.85+x/93900.0
    for _ in range(30):
        X,Z=ll2xz(la,lo);lo+=(x-X)/93900.0;la-=(z-Z)/110900.0
    return la,lo
