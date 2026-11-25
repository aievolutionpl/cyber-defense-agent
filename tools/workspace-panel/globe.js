/** Decorative, local-only globe. It represents review areas, never live attack telemetry. */
export function mountGlobe(canvas) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const continents = [
    [[-168,70],[-145,73],[-125,68],[-108,73],[-79,72],[-55,52],[-64,45],[-81,25],[-98,17],[-110,24],[-123,39],[-130,53],[-164,58]],
    [[-82,12],[-69,12],[-53,5],[-35,-8],[-42,-22],[-53,-34],[-70,-55],[-76,-35],[-80,-5]],
    [[-17,36],[5,37],[29,32],[36,23],[51,11],[41,-12],[32,-28],[18,-35],[9,-20],[-2,5],[-17,15]],
    [[-11,36],[-9,44],[5,49],[-5,58],[14,71],[29,70],[40,57],[60,57],[52,35],[31,36],[22,41]],
    [[35,70],[65,75],[110,73],[150,61],[180,66],[173,52],[143,50],[135,33],[118,20],[110,3],[100,8],[95,22],[78,7],[67,24],[51,26],[42,40]],
    [[112,-12],[133,-11],[145,-15],[154,-28],[145,-39],[127,-33],[114,-24]],
    [[-54,59],[-43,61],[-20,76],[-40,84],[-60,81],[-68,70]],
    [[47,-13],[51,-18],[48,-26],[43,-23]],
  ];
  const inside = (x, y, polygon) => {
    let hit = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      if (((a[1] > y) !== (b[1] > y)) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
    }
    return hit;
  };
  const points = [];
  for (let lat = -57; lat <= 82; lat += 2) {
    for (let lon = -180; lon < 180; lon += 2.1 / Math.max(.2, Math.cos(lat * Math.PI / 180))) {
      if (continents.some(polygon => inside(lon, lat, polygon))) points.push([lat * Math.PI / 180, lon * Math.PI / 180]);
    }
  }
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let angle = -.32, frame = 0, lastTime = 0;
  const project = (lat, lon, radius, cx, cy) => {
    const cl = Math.cos(lat), x = cl * Math.sin(lon + angle), y = -Math.sin(lat), z = cl * Math.cos(lon + angle);
    return [cx + x * radius, cy + y * radius, z];
  };
  function draw(time = 0) {
    frame = 0;
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height || document.hidden) { lastTime = 0; return; }
    const ratio = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) { canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); }
    context.setTransform(ratio, 0, 0, ratio, 0, 0); context.clearRect(0, 0, width, height);
    if (!motion.matches && lastTime) angle += Math.min(time - lastTime, 40) * .000028;
    lastTime = time;
    const radius = Math.min(width * .36, height * .44), cx = width * .5, cy = height * .48;
    const glow = context.createRadialGradient(cx, cy, radius * .35, cx, cy, radius * 1.3);
    glow.addColorStop(0, '#0c2528'); glow.addColorStop(.69, '#0b292c'); glow.addColorStop(.78, '#123a3e'); glow.addColorStop(.81, '#28646944'); glow.addColorStop(1, '#0a121800');
    context.fillStyle = glow; context.fillRect(0, 0, width, height);
    context.lineWidth = .65;
    for (let latitude = -60; latitude <= 60; latitude += 20) {
      context.beginPath(); let started = false;
      for (let l = -180; l <= 180; l += 3) { const [x,y,z] = project(latitude * Math.PI/180,l * Math.PI/180,radius,cx,cy); if (z < 0) { started=false; continue; } if (!started) context.moveTo(x,y); else context.lineTo(x,y); started=true; }
      context.strokeStyle = '#4ca2a72c'; context.stroke();
    }
    for (let longitude = -180; longitude < 180; longitude += 25) {
      context.beginPath(); let started = false;
      for (let l = -88; l <= 88; l += 3) { const [x,y,z] = project(l * Math.PI/180,longitude * Math.PI/180,radius,cx,cy); if (z < 0) { started=false; continue; } if (!started) context.moveTo(x,y); else context.lineTo(x,y); started=true; }
      context.strokeStyle = '#4ca2a728'; context.stroke();
    }
    for (const [lat,lon] of points) { const [x,y,z] = project(lat,lon,radius,cx,cy); if(z < .02) continue; context.fillStyle = `rgba(88,218,210,${.18 + z * .65})`; context.beginPath(); context.arc(x,y,Math.max(.55,radius * .006)*(.7+z*.3),0,Math.PI*2); context.fill(); }
    context.strokeStyle='#68d9d04a'; context.lineWidth=.9; context.beginPath(); context.arc(cx,cy,radius,0,Math.PI*2); context.stroke();
    context.save(); context.translate(cx,cy); context.rotate(-.45); context.strokeStyle='#6cebdd55'; context.beginPath(); context.ellipse(0,0,radius*1.17,radius*.42,0,0,Math.PI*2); context.stroke();
    for (const p of [0.3,2.1,4.5]) { const x=Math.cos(p)*radius*1.17,y=Math.sin(p)*radius*.42; context.shadowColor='#72f4e1';context.shadowBlur=12;context.fillStyle='#a6f8eb'; context.beginPath();context.arc(x,y,2.4,0,Math.PI*2);context.fill(); } context.restore();
    if (!motion.matches) frame = requestAnimationFrame(draw);
  }
  const restart = () => { if (frame) cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); };
  new ResizeObserver(restart).observe(canvas);
  motion.addEventListener('change', restart);
  document.addEventListener('visibilitychange', restart);
  restart();
}
