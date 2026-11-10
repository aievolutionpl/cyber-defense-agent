"""Original vector motion studies. Pillow only; synthetic security illustration."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math
out=Path(__file__).resolve().parents[1]/'apps/site/public/assets'
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',11)
for kind in ['shield-cycle','code-review']:
 frames=[]
 for frame in range(60):
  phase=frame//15;t=(frame%15)/15
  im=Image.new('RGB',(480,280),'#101827');d=ImageDraw.Draw(im)
  for x in range(0,480,24):d.line((x,0,x,280),fill='#19263a')
  for y in range(0,280,24):d.line((0,y,480,y),fill='#19263a')
  color=['#9bdfff','#ff718a','#cbb0ff','#94efc1'][phase]
  d.text((22,18),'CYBER DEFENSE / ILLUSTRATION',font=small,fill='#b6c6e0')
  if kind=='shield-cycle':
   cx,cy=240,135
   for radius in [75,91]:d.ellipse((cx-radius,cy-radius,cx+radius,cy+radius),outline='#3e526e',width=1)
   angle=frame/60*2*math.pi
   x=cx+91*math.cos(angle);y=cy+91*math.sin(angle)
   d.ellipse((x-5,y-5,x+5,y+5),fill=color)
   d.polygon([(240,64),(291,84),(285,140),(270,169),(240,191),(210,169),(195,140),(189,84)],fill='#20324b',outline=color,width=3)
   if phase==1:
    d.line((240,100,240,137),fill=color,width=5);d.ellipse((237,149,243,155),fill=color)
   elif phase==3:d.line((216,128,234,146,268,108),fill=color,width=5)
   else:
    yy=85+int(90*t);d.line((205,yy,275,yy),fill=color,width=3)
  else:
   d.rounded_rectangle((70,62,410,211),12,fill='#18253a',outline='#5c7195',width=2)
   widths=[170,230,140,210,180]
   for n,w in enumerate(widths):
    y=85+n*23
    d.text((85,y-3),str(n+1),font=small,fill='#8c9cbd')
    col=color if n==2 else '#526988'
    d.rounded_rectangle((112,y,112+w,y+7),3,fill=col)
   if phase==0:
    x=75+int(t*330);d.line((x,70,x,202),fill=color,width=2)
   if phase==1:d.rounded_rectangle((105,123,388,147),4,outline=color,width=2)
   if phase==2:
    x=120+int(t*200);d.polygon([(x,144),(x,166),(x+6,159),(x+13,174),(x+18,171),(x+11,156),(x+22,156)],fill=color)
  label=['SCAN / APPROVED SCOPE','ALERT / RISK FOUND','PROPOSE FIX / HUMAN REVIEW','RETEST / CONFIRMED'][phase]
  d.text((22,244),label,font=font,fill=color)
  frames.append(im)
 frames[0].save(out/f'{kind}.png',optimize=True)
 frames[0].save(out/f'{kind}.gif',save_all=True,append_images=frames[1:],duration=100,loop=0,optimize=True)
