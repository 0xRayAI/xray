# House ASCII plate v4: foundry and its parts. No posting.
from PIL import Image, ImageDraw, ImageFont
import os, sys
D=os.path.join(sys.argv[1] if len(sys.argv)>1 else os.environ.get('PLATE_OUT','.'),'')
MONO='/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'
BG=(8,9,11);CY=(61,224,232);YE=(245,197,24);WH=(245,247,250);GR=(120,126,135)
PANEL=(20,23,28);STRIP=(18,21,26)
lead='The foundry, and what sits inside it.'
FS=16;LH=24
f=ImageFont.truetype(MONO,FS);cw=f.getlength('x')
W=1280;M=24;PAD=10
COLS=int((W-2*M-2*PAD)//cw)  # grid width in chars
NR=20
G=[[' ']*COLS for _ in range(NR)]
def put(x,y,t):
    for i,c in enumerate(t):G[y][x+i]=c
def hline(x1,x2,y,c='─'):
    for x in range(x1,x2+1):G[y][x]=c
def vline(x,y1,y2,c='│'):
    for y in range(y1,y2+1):G[y][x]=c
def box(x,y,w,h,name,line=None,dashed=False):
    H='┄' if dashed else '─';V='┆' if dashed else '│'
    hline(x+1,x+w-2,y,H);hline(x+1,x+w-2,y+h-1,H)
    vline(x,y+1,y+h-2,V);vline(x+w-1,y+1,y+h-2,V)
    G[y][x]='┌';G[y][x+w-1]='┐';G[y+h-1][x]='└';G[y+h-1][x+w-1]='┘'
    iw=w-2
    put(x+1,y+1,name.center(iw))
    if line:put(x+1,y+3,line.center(iw))
F=4;Fx=29;FW=69;BH=5
BX=1;BWd=17;EX=Fx+FW+11;EW=15
rowA=F+3;rowB=F+9
# foundry frame + title
box(Fx,F,FW,16,'')
put(Fx+3,F+1,'FOUNDRY')
x1=Fx+3;x2=Fx+25;x3=Fx+47;IW=19
box(x1,rowA,IW,BH,'JOB MAILBOX','building')
box(x2,rowA,IW,BH,'foundry.json','id · receiver')
box(x3,rowA,IW,BH,'FOUNDRY AGENT','NEAR identity')
box(x2,rowB,IW,BH,'SKILLS','2 NEAR skills')
box(x3,rowB,IW,BH,'TOOLS','grok-bot CLI')
# outside
box(BX,rowA,BWd,BH,'BUYER')
box(EX,rowA,EW,BH,'NEAR ESCROW','holds deposit')
box(EX,rowB,EW,BH,'CLEARING','optional',dashed=True)
box(BX,rowB,BWd,BH,'HANGAR LISTING','pending',dashed=True)
# buyer -> mailbox (post_job), result back
ya=rowA+1;yb=rowA+3
for yy in range(ya,yb+1):G[yy][Fx]=' '
hline(BX+BWd,x1-2,ya);G[ya][x1-1]='►'
hline(BX+BWd+1,x1-1,yb);G[yb][BX+BWd]='◄'
gl=BX+BWd;gr=Fx-1;gw=gr-gl
for t,y in (('post_job',ya-1),('result',yb+1)):
    put(gl+(gw-len(t))//2+0,y,t)
# escrow -> agent
G[ya][Fx+FW-1]=' '
hline(x3+IW+1,EX-1,ya);G[ya][x3+IW]='◄'
# note: arrow head sits on agent right edge column+0
t='accept pays';l=Fx+FW;r=EX-1;put(l+((r-l+1)-len(t))//2,ya-1,t)
# deposit route over the top: buyer -> escrow
bxm=BX+BWd//2;exm=EX+EW//2;R0=1
G[R0][bxm]='┌';hline(bxm+1,exm-1,R0);G[R0][exm]='┐'
vline(bxm,R0+1,rowA-2);G[rowA-1][bxm]='╎';vline(exm,R0+1,rowA-2);G[rowA-1][exm]='▼'
t=' deposit ';put((bxm+exm)//2-len(t)//2,R0,t)
rows=[r for r in G]
ft=ImageFont.truetype(BOLD,34);fm=ImageFont.truetype(BOLD,28);fl=ImageFont.truetype(MONO,18)
fs=ImageFont.truetype(MONO,18);fg=ImageFont.truetype(MONO,13)
def wrap(t,font,maxw):
    out=[];cur=''
    for w in t.split(' '):
        n=(cur+' '+w).strip()
        if font.getlength(n)<=maxw:cur=n
        else:out.append(cur);cur=w
    out.append(cur);return out
leadl=wrap(lead,fl,W-2*M-40)
ty=44;sub_y=ty+52
panel_y=sub_y+len(leadl)*28+22
ph=len(rows)*LH+2*28
foot_y=panel_y+ph+40
H=foot_y+96
im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
d.rectangle([10,10,W-11,H-11],outline=CY,width=2)
for x,y in [(10,10),(W-11,10),(10,H-11),(W-11,H-11)]:d.ellipse([x-5,y-5,x+5,y+5],fill=CY)
d.text((M+10,ty+6),'0xRay',font=fm,fill=YE)
mk=fm.getlength('0xRay')
d.text((M+10+mk+22,ty+2),'FOUNDRY ARCHITECTURE',font=ft,fill=WH)
for i,l in enumerate(leadl):d.text((M+10,sub_y+i*28),l,font=fl,fill=CY)
d.rounded_rectangle([M,panel_y,W-M,panel_y+ph],radius=18,fill=PANEL,outline=CY,width=2)
for i,r in enumerate(rows):
    y=panel_y+28+i*LH
    for j,ch in enumerate(r):
        if ch==' ':continue
        x=M+PAD+j*cw;mx=x+cw/2;my=y+10;t=y-2;b=y-2+LH
        if ch=='╎':
            d.line([(mx,t),(mx,b+12)],fill=WH,width=1);continue
        if ch=='▼':
            d.line([(mx,t),(mx,b-2)],fill=WH,width=1)
            d.polygon([(mx,b+12),(mx-4.5,b-2),(mx+4.5,b-2)],fill=WH);continue
        if ch=='▲':
            d.polygon([(mx,t-11),(mx-4.5,t+3),(mx+4.5,t+3)],fill=WH)
            d.line([(mx,t+3),(mx,t+12)],fill=WH,width=1);continue
        if ch=='╷':
            d.line([(mx,t-11),(mx,t+14)],fill=WH,width=1);continue
        if ch=='┆':
            d.line([(mx,t),(mx,t+14)],fill=WH,width=1);continue
        if ch=='┄':
            d.line([(x,my),(x+6.5,my)],fill=WH,width=1);continue
        if ch in '│┌┐└┘─':
            if ch in '│┌┐└┘':
                if ch=='│':d.line([(mx,t),(mx,b)],fill=WH,width=1)
                elif ch in '┌┐':d.line([(mx,my),(mx,b)],fill=WH,width=1)
                else:d.line([(mx,t),(mx,my)],fill=WH,width=1)
            if ch in '─┌└':d.line([(mx if ch!='─' else x,my),(x+cw+1,my)],fill=WH,width=1)
            if ch in '─┐┘':d.line([(x,my),(mx if ch!='─' else x+cw+1,my)],fill=WH,width=1)
        else:d.text((x,y),ch,font=f,fill=WH)
d.rectangle([M,foot_y,W-M,foot_y+66],fill=STRIP,outline=(40,48,56),width=1)
d.text((M+16,foot_y+14),'#consult  ·  consult@0xray.dev',font=fs,fill=CY)
d.text((M+16,foot_y+42),'stamped · 0xray 4.2.3',font=fg,fill=GR)
im.save(D+'foundry-architecture-ascii-v4.png');print(W,H,COLS)
