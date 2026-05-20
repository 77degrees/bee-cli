import { createHash, randomBytes } from "node:crypto";

const SESSION_SECRET = randomBytes(32).toString("hex");
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function getPin(): string | null {
  const pin = process.env["BEE_PIN"] ?? Bun.env["BEE_PIN"];
  return pin?.trim() || null;
}

function hmac(data: string): string {
  return createHash("sha256").update(`${SESSION_SECRET}:${data}`).digest("hex");
}

function createSessionToken(): string {
  const expires = Date.now() + SESSION_DURATION_MS;
  const payload = `bee-pin:${expires}`;
  return `${payload}:${hmac(payload)}`;
}

function isValidSession(token: string): boolean {
  const parts = token.split(":");
  if (parts.length !== 3) return false;
  const [prefix, expiresStr, sig] = parts;
  const payload = `${prefix}:${expiresStr}`;
  if (hmac(payload) !== sig) return false;
  const expires = Number(expiresStr);
  return Number.isFinite(expires) && Date.now() < expires;
}

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match?.[1] ?? null;
}

export function isPinEnabled(): boolean {
  return getPin() !== null;
}

export async function handlePinRequest(req: Request, url: URL): Promise<Response | null> {
  const pin = getPin();
  if (!pin) return null;

  if (url.pathname === "/api/gate/verify" && req.method === "POST") {
    return handleVerify(req, pin);
  }

  const sessionToken = parseCookie(req.headers.get("cookie"), "bee_session");
  if (sessionToken && isValidSession(sessionToken)) return null;

  if (url.pathname === "/" || url.pathname === "/index.html") {
    return new Response(getPinPageHtml(), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return Response.json({ error: "PIN required" }, { status: 401 });
}

async function handleVerify(req: Request, pin: string): Promise<Response> {
  const body = (await req.json()) as { pin?: string };
  const attempt = body.pin?.trim();
  if (!attempt || attempt !== pin) {
    return Response.json({ error: "Incorrect PIN" }, { status: 403 });
  }
  const token = createSessionToken();
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": `bee_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}`,
      },
    }
  );
}

function getPinPageHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bee Dashboard</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Instrument+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#12110f;--surface:#1a1816;--card:#1f1d1a;--border:#2a2723;
  --amber:#d4a843;--amber-light:#e8c97a;--amber-dim:#7a5d2a;
  --text:#e6ded2;--text-sec:#8a8278;--red:#c45c5c;
  --font-display:'Syne',sans-serif;--font-body:'Instrument Sans',sans-serif;--font-mono:'IBM Plex Mono',monospace}
body{font-family:var(--font-body);color:var(--text);background:var(--bg);display:flex;align-items:center;justify-content:center;min-height:100vh}
.gate{width:360px;max-width:90vw;text-align:center}
.gate .logo{font-family:var(--font-display);font-weight:800;font-size:2.2rem;color:var(--amber);margin-bottom:6px}
.gate .logo span{opacity:.5;font-size:.5em;font-weight:400;color:var(--text-sec);letter-spacing:.05em;text-transform:uppercase}
.gate p{font-size:.88rem;color:var(--text-sec);margin-bottom:28px}
.pin-row{display:flex;gap:8px;justify-content:center;margin-bottom:16px}
.pin-digit{width:52px;height:60px;background:var(--surface);border:1px solid var(--border);border-radius:8px;
  text-align:center;font-family:var(--font-mono);font-size:1.6rem;color:var(--amber);outline:none;caret-color:var(--amber)}
.pin-digit:focus{border-color:var(--amber-dim)}
.error{color:var(--red);font-size:.82rem;min-height:20px;margin-bottom:12px}
.hex{position:fixed;right:-80px;bottom:-80px;width:300px;height:300px;
  background:conic-gradient(from 30deg,transparent 0deg,rgba(212,168,67,.08) 60deg,transparent 120deg);
  clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);opacity:.35;pointer-events:none}
</style>
</head>
<body>
<div class="gate">
  <div class="logo">\u{1F41D} bee <span>dashboard</span></div>
  <p>Enter PIN to continue</p>
  <div class="pin-row">
    <input class="pin-digit" type="tel" maxlength="1" inputmode="numeric" autofocus>
    <input class="pin-digit" type="tel" maxlength="1" inputmode="numeric">
    <input class="pin-digit" type="tel" maxlength="1" inputmode="numeric">
    <input class="pin-digit" type="tel" maxlength="1" inputmode="numeric">
  </div>
  <div class="error" id="err"></div>
</div>
<div class="hex"></div>
<script>
const digits=document.querySelectorAll('.pin-digit');
const err=document.getElementById('err');
digits.forEach((d,i)=>{
  d.addEventListener('input',()=>{
    d.value=d.value.replace(/\\D/g,'').slice(0,1);
    if(d.value&&i<3)digits[i+1].focus();
    const pin=[...digits].map(x=>x.value).join('');
    if(pin.length===4)submit(pin);
  });
  d.addEventListener('keydown',e=>{
    if(e.key==='Backspace'&&!d.value&&i>0){digits[i-1].focus();digits[i-1].value='';}
  });
  d.addEventListener('paste',e=>{
    e.preventDefault();
    const text=(e.clipboardData||window.clipboardData).getData('text').replace(/\\D/g,'').slice(0,4);
    [...text].forEach((c,j)=>{if(digits[i+j])digits[i+j].value=c;});
    if(text.length===4)submit(text);
    else if(digits[i+text.length])digits[i+text.length].focus();
  });
});
async function submit(pin){
  err.textContent='';
  try{
    const r=await fetch('/api/gate/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin})});
    if(r.ok){location.reload();return;}
    const d=await r.json();
    err.textContent=d.error||'Incorrect PIN';
  }catch{err.textContent='Connection error';}
  digits.forEach(d=>d.value='');
  digits[0].focus();
}
</script>
</body>
</html>`;
}
