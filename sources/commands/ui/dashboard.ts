export function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bee Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#12110f;--surface:#1a1816;--card:#1f1d1a;--card-hover:#262320;
  --border:#2a2723;--border-subtle:#221f1c;
  --amber:#d4a843;--amber-light:#e8c97a;--amber-dim:#7a5d2a;
  --amber-glow:rgba(212,168,67,.08);
  --text:#e6ded2;--text-sec:#8a8278;--text-muted:#5a554e;
  --green:#5a9a6a;--red:#c45c5c;--blue:#5a7ca8;
  --radius:10px;--radius-sm:6px;
  --font-display:'Syne',sans-serif;
  --font-body:'Instrument Sans',sans-serif;
  --font-mono:'IBM Plex Mono',monospace;
  --sidebar-w:220px;
}
html{font-size:15px;-webkit-font-smoothing:antialiased}
body{font-family:var(--font-body);color:var(--text);background:var(--bg);display:flex;min-height:100vh;overflow:hidden}
a{color:var(--amber);text-decoration:none}
a:hover{color:var(--amber-light)}

#sidebar{width:var(--sidebar-w);min-width:var(--sidebar-w);background:var(--surface);border-right:1px solid var(--border);
  display:flex;flex-direction:column;padding:20px 0;overflow-y:auto;position:relative;z-index:10}
#sidebar .logo{padding:0 20px 24px;font-family:var(--font-display);font-weight:800;font-size:1.4rem;
  color:var(--amber);letter-spacing:-.03em;display:flex;align-items:center;gap:10px}
#sidebar .logo span{opacity:.5;font-size:.6em;font-weight:400;color:var(--text-sec);letter-spacing:.05em;text-transform:uppercase}
#sidebar nav{flex:1;display:flex;flex-direction:column;gap:2px;padding:0 8px}
#sidebar nav a{display:flex;align-items:center;gap:12px;padding:9px 14px;border-radius:var(--radius-sm);
  font-size:.88rem;font-weight:500;color:var(--text-sec);transition:all .15s ease}
#sidebar nav a:hover{color:var(--text);background:var(--amber-glow)}
#sidebar nav a.active{color:var(--amber);background:var(--amber-glow)}
#sidebar nav a svg{width:18px;height:18px;opacity:.6;flex-shrink:0}
#sidebar nav a.active svg{opacity:1}
#sidebar .sidebar-section{font-size:.65rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;
  color:var(--text-muted);padding:20px 14px 6px}

#main{flex:1;overflow-y:auto;padding:32px 40px;max-height:100vh}
#main::-webkit-scrollbar{width:6px}
#main::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
.page{display:none;animation:fadeIn .2s ease}
.page.active{display:block}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

h1{font-family:var(--font-display);font-size:1.8rem;font-weight:700;letter-spacing:-.04em;margin-bottom:6px}
h2{font-family:var(--font-display);font-size:1.15rem;font-weight:600;letter-spacing:-.02em;color:var(--text-sec);margin-bottom:16px}
h3{font-family:var(--font-display);font-size:.95rem;font-weight:600;color:var(--amber);margin-bottom:10px}
.subtitle{font-size:.85rem;color:var(--text-sec);margin-bottom:28px}

.card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:18px 20px;margin-bottom:12px;
  transition:border-color .15s,background .15s}
.card:hover{border-color:var(--amber-dim);background:var(--card-hover)}
.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:28px}
.stat-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:18px 20px;text-align:center}
.stat-card .value{font-family:var(--font-display);font-size:2rem;font-weight:800;color:var(--amber)}
.stat-card .label{font-size:.75rem;color:var(--text-sec);margin-top:4px;text-transform:uppercase;letter-spacing:.06em}

.convo-card{cursor:pointer}
.convo-card .convo-time{font-family:var(--font-mono);font-size:.75rem;color:var(--text-muted);margin-bottom:6px}
.convo-card .convo-summary{font-size:.88rem;line-height:1.5;color:var(--text-sec)}
.convo-card .convo-state{display:inline-block;font-size:.65rem;font-weight:600;padding:2px 8px;border-radius:20px;
  background:var(--amber-glow);color:var(--amber);margin-bottom:8px}

.utterance{padding:8px 0;border-bottom:1px solid var(--border-subtle);font-size:.85rem;line-height:1.55}
.utterance:last-child{border-bottom:none}
.utterance .speaker{font-family:var(--font-mono);font-weight:500;color:var(--amber);font-size:.8rem}
.utterance .text{color:var(--text-sec);margin-top:2px}

.fact-item{display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--border-subtle)}
.fact-item:last-child{border-bottom:none}
.fact-text{flex:1;font-size:.88rem;line-height:1.5;color:var(--text-sec)}
.fact-tag{font-size:.65rem;background:var(--amber-glow);color:var(--amber-dim);padding:2px 8px;border-radius:20px;white-space:nowrap}
.todo-item{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border-subtle)}
.todo-item:last-child{border-bottom:none}
.todo-check{width:20px;height:20px;border-radius:50%;border:2px solid var(--border);cursor:pointer;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;transition:all .15s}
.todo-check:hover{border-color:var(--amber)}
.todo-check.done{background:var(--amber);border-color:var(--amber)}
.todo-check.done::after{content:'\\2713';font-size:.7rem;color:var(--bg)}
.todo-text{flex:1;font-size:.88rem;color:var(--text-sec)}
.todo-text.done{text-decoration:line-through;opacity:.5}

.event-item{padding:12px 0;border-bottom:1px solid var(--border-subtle)}
.event-item:last-child{border-bottom:none}
.event-time{font-family:var(--font-mono);font-size:.78rem;color:var(--amber-dim)}
.event-title{font-size:.88rem;margin-top:2px}
.event-location{font-size:.78rem;color:var(--text-muted);margin-top:2px}
.mail-item{padding:12px 0;border-bottom:1px solid var(--border-subtle)}
.mail-item:last-child{border-bottom:none}
.mail-date{font-family:var(--font-mono);font-size:.72rem;color:var(--text-muted)}
.mail-from{font-size:.82rem;color:var(--text-sec);margin-top:2px}
.mail-subject{font-size:.88rem;margin-top:2px}

.input-row{display:flex;gap:8px;margin-bottom:16px}
input[type="text"],input[type="password"]{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);
  padding:9px 14px;color:var(--text);font-family:var(--font-body);font-size:.85rem;flex:1;outline:none;transition:border-color .15s}
input[type="text"]:focus,input[type="password"]:focus{border-color:var(--amber-dim)}
button{background:var(--amber);color:var(--bg);border:none;border-radius:var(--radius-sm);padding:9px 18px;
  font-family:var(--font-body);font-size:.85rem;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap}
button:hover{background:var(--amber-light)}
button.ghost{background:transparent;color:var(--text-sec);border:1px solid var(--border)}
button.ghost:hover{border-color:var(--text-sec);color:var(--text)}
button.danger{background:transparent;color:var(--red);border:1px solid var(--red)}
button.danger:hover{background:var(--red);color:var(--bg)}

.data-table{width:100%;border-collapse:collapse;font-size:.85rem}
.data-table th{text-align:left;font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);
  padding:8px 12px;border-bottom:1px solid var(--border)}
.data-table td{padding:10px 12px;border-bottom:1px solid var(--border-subtle);color:var(--text-sec)}
.data-table tr:hover td{color:var(--text)}

.detail-panel{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:20px}
.detail-panel h2{color:var(--amber);margin-bottom:12px}
.back-link{font-size:.82rem;color:var(--text-muted);cursor:pointer;margin-bottom:16px;display:inline-block}
.back-link:hover{color:var(--amber)}

.loading{color:var(--text-muted);font-size:.88rem;padding:40px 0;text-align:center}
.loading::after{content:'';display:inline-block;width:14px;height:14px;border:2px solid var(--border);border-top-color:var(--amber);
  border-radius:50%;animation:spin .6s linear infinite;margin-left:10px;vertical-align:middle}
@keyframes spin{to{transform:rotate(360deg)}}
.empty{color:var(--text-muted);font-size:.88rem;padding:40px 0;text-align:center}

.hex-accent{position:fixed;right:-80px;bottom:-80px;width:300px;height:300px;
  background:conic-gradient(from 30deg,transparent 0deg,var(--amber-glow) 60deg,transparent 120deg);
  clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);opacity:.35;pointer-events:none;z-index:0}

.guide-step{display:flex;gap:18px;padding:20px 24px;margin-bottom:14px;background:var(--card);border:1px solid var(--border);
  border-radius:var(--radius);transition:border-color .15s}
.guide-step:hover{border-color:var(--amber-dim)}
.guide-num{width:36px;height:36px;border-radius:50%;background:var(--surface);border:2px solid var(--amber-dim);
  display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:800;
  color:var(--amber);font-size:1rem;flex-shrink:0;margin-top:2px}
.guide-content{flex:1}
.guide-content h3{margin-bottom:8px}
.guide-content h4{font-family:var(--font-display);font-size:.85rem;font-weight:600;color:var(--amber-dim)}
.guide-content p{font-size:.88rem;color:var(--text-sec);line-height:1.6;margin-bottom:6px}
.guide-code{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);
  padding:12px 16px;font-family:var(--font-mono);font-size:.82rem;color:var(--amber-light);
  line-height:1.8;margin:10px 0 12px;overflow-x:auto;white-space:pre}

#login-overlay{position:fixed;inset:0;z-index:100;background:var(--bg);display:none;align-items:center;justify-content:center}
#login-overlay.visible{display:flex}
.login-box{width:480px;max-width:90vw;text-align:center}
.login-box .logo{font-family:var(--font-display);font-weight:800;font-size:2.2rem;color:var(--amber);margin-bottom:6px}
.login-box .logo span{opacity:.5;font-size:.5em;font-weight:400;color:var(--text-sec);letter-spacing:.05em;text-transform:uppercase}
.login-box .tagline{font-size:.9rem;color:var(--text-sec);margin-bottom:36px}
.login-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:32px;text-align:left}
.login-card h3{margin-bottom:16px;text-align:center}
.login-card p{font-size:.85rem;color:var(--text-sec);line-height:1.6;margin-bottom:12px}
.login-pairing-url{display:block;text-align:center;font-family:var(--font-mono);font-size:.85rem;
  background:var(--surface);border:1px solid var(--amber-dim);border-radius:var(--radius-sm);
  padding:14px;margin:16px 0;color:var(--amber-light);word-break:break-all}
.login-pairing-url:hover{background:var(--card-hover);border-color:var(--amber)}
.login-status{text-align:center;font-size:.85rem;color:var(--text-muted);margin-top:16px}
.login-status .spinner{display:inline-block;width:12px;height:12px;border:2px solid var(--border);border-top-color:var(--amber);
  border-radius:50%;animation:spin .6s linear infinite;margin-right:8px;vertical-align:middle}
.login-divider{display:flex;align-items:center;gap:12px;margin:24px 0;color:var(--text-muted);font-size:.75rem;text-transform:uppercase;letter-spacing:.1em}
.login-divider::before,.login-divider::after{content:'';flex:1;border-top:1px solid var(--border)}
.login-token-row{display:flex;gap:8px}
.login-token-row input{flex:1}
.login-error{color:var(--red);font-size:.82rem;text-align:center;margin-top:10px}
.login-expires{font-size:.75rem;color:var(--text-muted);text-align:center}
</style>
</head>
<body>
<div id="login-overlay">
  <div class="login-box">
    <div class="logo">bee <span>dashboard</span></div>
    <div class="tagline">Connect your Bee account to get started</div>
    <div class="login-card" id="login-card">
      <div id="login-initial">
        <h3>Connect to Bee</h3>
        <p>Click the button below to start the authentication flow. You'll get a link to open on your phone to approve the connection.</p>
        <div style="text-align:center;margin-top:20px">
          <button id="login-start-btn" style="padding:12px 32px;font-size:.95rem">Start Pairing</button>
        </div>
        <div class="login-divider">or paste a token</div>
        <div class="login-token-row">
          <input type="password" id="login-token-input" placeholder="Paste your API token...">
          <button id="login-token-btn" class="ghost">Login</button>
        </div>
        <div id="login-error" class="login-error" style="display:none"></div>
      </div>
      <div id="login-pairing" style="display:none">
        <h3>Approve the Connection</h3>
        <p>Open this link on any device and follow the instructions to approve:</p>
        <a id="login-pairing-link" class="login-pairing-url" href="#" target="_blank" rel="noopener"></a>
        <p class="login-expires" id="login-expires"></p>
        <div class="login-status" id="login-poll-status">
          <span class="spinner"></span>Waiting for approval...
        </div>
        <div style="text-align:center;margin-top:16px">
          <button class="ghost" id="login-cancel-btn" style="font-size:.8rem;padding:6px 16px">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</div>
<div id="sidebar">
  <div class="logo">bee <span>dashboard</span></div>
  <nav>
    <a href="#guide" data-page="guide" style="margin-bottom:12px;border:1px solid var(--amber-dim);border-radius:var(--radius-sm)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
      Getting Started
    </a>
    <div class="sidebar-section">Live</div>
    <a href="#overview" data-page="overview">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
      Overview
    </a>
    <a href="#conversations" data-page="conversations">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      Conversations
    </a>
    <div class="sidebar-section">Knowledge</div>
    <a href="#facts" data-page="facts">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
      Facts
    </a>
    <a href="#todos" data-page="todos">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
      Todos
    </a>
    <a href="#speakers" data-page="speakers">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
      Speakers
    </a>
    <div class="sidebar-section">Integrations</div>
    <a href="#calendar" data-page="calendar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
      Calendar
    </a>
    <a href="#mail" data-page="mail">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>
      Mail
    </a>
    <div class="sidebar-section">System</div>
    <a href="#settings" data-page="settings">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
      Settings
    </a>
  </nav>
</div>

<div id="main">
  <div class="page" id="page-guide">
    <h1>Getting Started</h1>
    <p class="subtitle">How to connect your Bee, set up AI, and start using the dashboard</p>

    <div class="guide-step">
      <div class="guide-num">1</div>
      <div class="guide-content">
        <h3>Install the Bee app &amp; enable Developer Mode</h3>
        <p>Download the <strong>Bee</strong> app on your phone. After creating your account, open the app and go to:</p>
        <div class="guide-code">Settings &rarr; Advanced &rarr; Developer Mode &rarr; Enable</div>
        <p>This unlocks the Developer API that the CLI needs to access your conversations, facts, and todos.</p>
      </div>
    </div>

    <div class="guide-step">
      <div class="guide-num">2</div>
      <div class="guide-content">
        <h3>Log in</h3>
        <p>If you&rsquo;re not already connected, the dashboard will show a <strong>login screen</strong> automatically. Click &ldquo;Start Pairing&rdquo; and approve the connection from your Bee app on your phone.</p>
        <p>Or from the terminal:</p>
        <div class="guide-code">bee login</div>
        <p>Once logged in, your API token is stored locally. You can verify with:</p>
        <div class="guide-code">bee status</div>
        <p>If the dashboard is showing data on the <a href="#overview">Overview</a> page, you&rsquo;re already connected.</p>
      </div>
    </div>

    <div class="guide-step">
      <div class="guide-num">3</div>
      <div class="guide-content">
        <h3>Set up your AI provider (for speaker ID &amp; inference)</h3>
        <p>Some features like <strong>speaker identification</strong> and <strong>inference</strong> require an AI provider. You can use either OpenAI or Anthropic.</p>
        <h4 style="margin-top:14px;color:var(--text)">Option A: OpenAI</h4>
        <div class="guide-code">bee config set ai_provider openai<br>bee config set openai_api_key sk-your-key-here</div>
        <p style="font-size:.82rem;color:var(--text-muted)">Get your API key at <span style="color:var(--amber)">platform.openai.com/api-keys</span>. Default model: gpt-4o.</p>
        <h4 style="margin-top:14px;color:var(--text)">Option B: Anthropic</h4>
        <div class="guide-code">bee config set ai_provider anthropic<br>bee config set anthropic_api_key sk-ant-your-key-here</div>
        <p style="font-size:.82rem;color:var(--text-muted)">Get your API key at <span style="color:var(--amber)">console.anthropic.com/settings/keys</span>. Default model: claude-sonnet.</p>
        <p style="margin-top:10px">Or set them right here in the <a href="#settings">Settings</a> page using the key/value form.</p>
        <p style="margin-top:10px"><strong>Env vars also work:</strong> <code style="background:var(--surface);padding:2px 6px;border-radius:4px;font-family:var(--font-mono);font-size:.82rem">BEE_AI_PROVIDER</code>, <code style="background:var(--surface);padding:2px 6px;border-radius:4px;font-family:var(--font-mono);font-size:.82rem">OPENAI_API_KEY</code>, or <code style="background:var(--surface);padding:2px 6px;border-radius:4px;font-family:var(--font-mono);font-size:.82rem">ANTHROPIC_API_KEY</code></p>
      </div>
    </div>

    <div class="guide-step">
      <div class="guide-num">4</div>
      <div class="guide-content">
        <h3>Connect calendar &amp; email (optional)</h3>
        <p>To see your calendar and mail in the dashboard, add integrations via the CLI:</p>
        <div class="guide-code">bee integrations add calendar<br>bee integrations add mail</div>
        <p>The interactive prompts will ask for your CalDAV / IMAP server details. Once connected, events and messages will show up on the <a href="#calendar">Calendar</a> and <a href="#mail">Mail</a> pages.</p>
        <p style="margin-top:8px">Verify they&rsquo;re working:</p>
        <div class="guide-code">bee integrations test my-calendar<br>bee integrations test my-email</div>
      </div>
    </div>

    <div class="guide-step">
      <div class="guide-num">5</div>
      <div class="guide-content">
        <h3>Explore your data</h3>
        <p>Now you&rsquo;re set! Here&rsquo;s what each section does:</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;margin-top:10px;font-size:.88rem">
          <div><strong style="color:var(--amber)">Overview</strong> &mdash; Quick stats and recent conversations</div>
          <div><strong style="color:var(--amber)">Conversations</strong> &mdash; Browse transcripts with full utterances</div>
          <div><strong style="color:var(--amber)">Facts</strong> &mdash; Things Bee has learned about you</div>
          <div><strong style="color:var(--amber)">Todos</strong> &mdash; Action items from your conversations</div>
          <div><strong style="color:var(--amber)">Speakers</strong> &mdash; Name the people Bee hears</div>
          <div><strong style="color:var(--amber)">Calendar</strong> &mdash; Upcoming events from CalDAV</div>
          <div><strong style="color:var(--amber)">Mail</strong> &mdash; Recent messages from IMAP</div>
          <div><strong style="color:var(--amber)">Settings</strong> &mdash; API keys and configuration</div>
        </div>
      </div>
    </div>

    <div class="guide-step" style="border:1px solid var(--amber-dim);background:var(--amber-glow)">
      <div class="guide-num" style="background:var(--amber);color:var(--bg)">?</div>
      <div class="guide-content">
        <h3>Quick reference &mdash; CLI commands</h3>
        <div class="guide-code" style="background:var(--card)">bee login / logout / status     &mdash; Authentication<br>bee today / now / daily          &mdash; Summaries<br>bee conversations / stream       &mdash; Transcripts<br>bee facts / todos / search       &mdash; Knowledge<br>bee speakers list / identify     &mdash; Speaker ID<br>bee cite / infer                 &mdash; Source tracking &amp; AI gap-fill<br>bee config set/get/list          &mdash; Configuration<br>bee integrations add/test        &mdash; Calendar &amp; mail<br>bee ui                           &mdash; This dashboard</div>
      </div>
    </div>
  </div>

  <div class="page" id="page-overview">
    <h1>Overview</h1>
    <p class="subtitle">Recent activity from your Bee</p>
    <div class="card-grid" id="stats-grid"></div>
    <h2>Recent Conversations</h2>
    <div id="overview-conversations"></div>
  </div>
  <div class="page" id="page-conversations">
    <h1>Conversations</h1>
    <p class="subtitle">Browse and explore your conversation history</p>
    <div id="conversations-detail" style="display:none"></div>
    <div id="conversations-list"></div>
    <div style="text-align:center;padding:16px">
      <button class="ghost" id="conversations-load-more" style="display:none">Load more</button>
    </div>
  </div>
  <div class="page" id="page-facts">
    <h1>Facts</h1>
    <p class="subtitle">What Bee has learned about you</p>
    <div class="input-row">
      <input type="text" id="fact-input" placeholder="Add a new fact...">
      <button id="fact-add-btn">Add Fact</button>
    </div>
    <div class="card"><div id="facts-list"></div></div>
  </div>
  <div class="page" id="page-todos">
    <h1>Todos</h1>
    <p class="subtitle">Action items from your conversations</p>
    <div class="input-row">
      <input type="text" id="todo-input" placeholder="Add a new todo...">
      <button id="todo-add-btn">Add Todo</button>
    </div>
    <h3>Open</h3>
    <div class="card" id="todos-open"></div>
    <h3 style="margin-top:24px">Completed</h3>
    <div class="card" id="todos-done"></div>
  </div>
  <div class="page" id="page-speakers">
    <h1>Speakers</h1>
    <p class="subtitle">Manage speaker profiles for conversation identification</p>
    <div class="input-row">
      <input type="text" id="speaker-name" placeholder="Name">
      <input type="text" id="speaker-notes" placeholder="Notes (optional)">
      <button id="speaker-add-btn">Add Profile</button>
    </div>
    <div class="card">
      <table class="data-table">
        <thead><tr><th>Name</th><th>Notes</th><th>Created</th><th></th></tr></thead>
        <tbody id="speakers-body"></tbody>
      </table>
    </div>
  </div>
  <div class="page" id="page-calendar">
    <h1>Calendar</h1>
    <p class="subtitle">Upcoming events from connected calendars</p>
    <div class="card" id="calendar-events"></div>
  </div>
  <div class="page" id="page-mail">
    <h1>Mail</h1>
    <p class="subtitle">Recent messages from connected email accounts</p>
    <div class="card" id="mail-messages"></div>
  </div>
  <div class="page" id="page-settings">
    <h1>Settings</h1>
    <p class="subtitle">Bee account, AI keys, and configuration</p>

    <div class="card" style="margin-bottom:20px">
      <h3 style="margin-bottom:12px">Bee Connection</h3>
      <div id="conn-status" style="font-size:.88rem;color:var(--text-sec)">Checking...</div>
      <div id="conn-actions" style="margin-top:12px;display:none">
        <button id="conn-login-btn" style="display:none">Log In</button>
        <button id="conn-logout-btn" class="danger" style="display:none;padding:6px 16px;font-size:.82rem">Log Out</button>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <h3 style="margin-bottom:4px">OpenAI</h3>
      <p style="font-size:.78rem;color:var(--text-muted);margin-bottom:10px">Used for speaker ID &amp; inference. Get a key at <span style="color:var(--amber)">platform.openai.com/api-keys</span></p>
      <div class="input-row">
        <input type="password" id="openai-key-input" placeholder="sk-...">
        <button id="openai-key-save">Save</button>
      </div>
      <div id="openai-key-status" style="font-size:.82rem;margin-top:4px"></div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <h3 style="margin-bottom:4px">Anthropic</h3>
      <p style="font-size:.78rem;color:var(--text-muted);margin-bottom:10px">Alternative AI provider. Get a key at <span style="color:var(--amber)">console.anthropic.com/settings/keys</span></p>
      <div class="input-row">
        <input type="password" id="anthropic-key-input" placeholder="sk-ant-...">
        <button id="anthropic-key-save">Save</button>
      </div>
      <div id="anthropic-key-status" style="font-size:.82rem;margin-top:4px"></div>
    </div>

    <div id="ai-active-provider" class="card" style="margin-bottom:20px;display:none">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <span style="font-size:.82rem;color:var(--text-muted)">Active AI provider:</span>
          <span id="ai-active-name" style="font-weight:600;color:var(--amber);margin-left:6px"></span>
        </div>
        <div style="display:flex;gap:8px">
          <button id="ai-switch-openai" class="ghost" style="padding:4px 12px;font-size:.78rem">Use OpenAI</button>
          <button id="ai-switch-anthropic" class="ghost" style="padding:4px 12px;font-size:.78rem">Use Anthropic</button>
        </div>
      </div>
    </div>

    <h3>All Configuration</h3>
    <p style="font-size:.82rem;color:var(--text-sec);margin-bottom:12px">Advanced: view and edit raw config values.</p>
    <div class="input-row">
      <input type="text" id="config-key" placeholder="Key">
      <input type="text" id="config-value" placeholder="Value">
      <button id="config-set-btn">Set</button>
    </div>
    <div class="card">
      <table class="data-table">
        <thead><tr><th>Key</th><th>Value</th><th></th></tr></thead>
        <tbody id="config-body"></tbody>
      </table>
    </div>
  </div>
</div>
<div class="hex-accent"></div>

<script>
/* NOTE: All dynamic content is HTML-escaped via esc() before DOM insertion.
   This dashboard runs on localhost only, serving the authenticated user's own data. */

// --- State ---
let convoCursor = null;
let convoList = [];

// --- API helpers ---
async function apiBee(path, opts) {
  const r = await fetch('/api/bee' + path, opts);
  if (!r.ok) throw new Error('API error ' + r.status);
  return r.json();
}
async function apiLocal(path, opts) {
  const r = await fetch('/api/local' + path, opts);
  if (!r.ok) throw new Error('API error ' + r.status);
  return r.json();
}

// --- Escape all dynamic content ---
function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// --- Safe DOM helpers ---
function setText(el, text) { el.textContent = text; }
function setHtml(el, html) { el.innerHTML = html; } // All values pre-escaped via esc()

// --- Router ---
function navigate() {
  const hash = location.hash.replace('#','') || 'overview';
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  const page = document.getElementById('page-' + hash);
  if (page) page.classList.add('active');
  document.querySelectorAll('#sidebar nav a').forEach(function(a) {
    a.classList.toggle('active', a.dataset.page === hash);
  });
  var loaders = {
    guide: function(){}, overview: loadOverview, conversations: loadConversations,
    facts: loadFacts, todos: loadTodos, speakers: loadSpeakers,
    calendar: loadCalendar, mail: loadMail, settings: loadSettings,
  };
  if (loaders[hash]) loaders[hash]();
}
window.addEventListener('hashchange', navigate);

// --- Time formatting ---
function relTime(epoch) {
  if (!epoch) return '';
  var ms = epoch > 1e12 ? epoch : epoch * 1000;
  var diff = Date.now() - ms;
  if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
  return new Date(ms).toLocaleDateString(undefined, {month:'short',day:'numeric'});
}
function fmtDate(epoch) {
  if (!epoch) return '';
  var ms = epoch > 1e12 ? epoch : epoch * 1000;
  return new Date(ms).toLocaleString(undefined, {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
}

// --- Overview ---
async function loadOverview() {
  var grid = document.getElementById('stats-grid');
  var convoDiv = document.getElementById('overview-conversations');
  setHtml(grid, '<div class="stat-card"><div class="value">--</div><div class="label">Conversations</div></div>'
    + '<div class="stat-card"><div class="value">--</div><div class="label">Facts</div></div>'
    + '<div class="stat-card"><div class="value">--</div><div class="label">Open Todos</div></div>');
  setHtml(convoDiv, '<div class="loading">Loading recent data</div>');
  try {
    var results = await Promise.all([
      apiBee('/v1/conversations?limit=5'),
      apiBee('/v1/facts?confirmed=true&limit=200'),
      apiBee('/v1/todos?limit=200'),
    ]);
    var cl = results[0].conversations || [];
    var fl = results[1].facts || [];
    var tl = results[2].todos || [];
    var openTodos = tl.filter(function(t) { return !t.completed; });
    setHtml(grid,
      '<div class="stat-card"><div class="value">' + esc(cl.length) + '</div><div class="label">Recent</div></div>'
      + '<div class="stat-card"><div class="value">' + esc(fl.length) + '</div><div class="label">Facts</div></div>'
      + '<div class="stat-card"><div class="value">' + esc(openTodos.length) + '</div><div class="label">Open Todos</div></div>');
    if (cl.length === 0) {
      setHtml(convoDiv, '<div class="empty">No recent conversations</div>');
    } else {
      setHtml(convoDiv, cl.map(convoCardHtml).join(''));
    }
  } catch(e) {
    setHtml(convoDiv, '<div class="empty">Failed to load: ' + esc(e.message) + '</div>');
  }
}

// --- Conversations ---
async function loadConversations() {
  var list = document.getElementById('conversations-list');
  var detail = document.getElementById('conversations-detail');
  detail.style.display = 'none';
  if (convoList.length > 0) {
    setHtml(list, convoList.map(convoCardHtml).join(''));
    return;
  }
  setHtml(list, '<div class="loading">Loading conversations</div>');
  try {
    var data = await apiBee('/v1/conversations?limit=20');
    convoList = data.conversations || [];
    convoCursor = data.next_cursor || null;
    setHtml(list, convoList.map(convoCardHtml).join(''));
    document.getElementById('conversations-load-more').style.display = convoCursor ? '' : 'none';
  } catch(e) {
    setHtml(list, '<div class="empty">Failed to load: ' + esc(e.message) + '</div>');
  }
}

document.getElementById('conversations-load-more').addEventListener('click', async function() {
  if (!convoCursor) return;
  this.textContent = 'Loading...';
  try {
    var data = await apiBee('/v1/conversations?limit=20&cursor=' + encodeURIComponent(convoCursor));
    var newConvos = data.conversations || [];
    convoList = convoList.concat(newConvos);
    convoCursor = data.next_cursor || null;
    setHtml(document.getElementById('conversations-list'), convoList.map(convoCardHtml).join(''));
    this.style.display = convoCursor ? '' : 'none';
  } catch(e) {}
  this.textContent = 'Load more';
});

function convoCardHtml(c) {
  var t = c.start_time || c.created_at;
  var summary = c.summary || c.short_summary || '(no summary)';
  var state = c.state || '';
  return '<div class="card convo-card" onclick="showConversation(' + Number(c.id) + ')">'
    + '<span class="convo-state">' + esc(state) + '</span>'
    + '<div class="convo-time">#' + esc(c.id) + ' &middot; ' + esc(relTime(t)) + '</div>'
    + '<div class="convo-summary">' + esc(summary).substring(0,200) + '</div></div>';
}

window.showConversation = async function(id) {
  var detail = document.getElementById('conversations-detail');
  var list = document.getElementById('conversations-list');
  detail.style.display = 'block';
  list.style.display = 'none';
  document.getElementById('conversations-load-more').style.display = 'none';
  setHtml(detail, '<div class="loading">Loading conversation</div>');
  try {
    var data = await apiBee('/v1/conversations/' + Number(id));
    var c = data.conversation;
    if (!c) { setHtml(detail, '<div class="empty">Conversation not found</div>'); return; }
    var html = '<div class="detail-panel">';
    html += '<span class="back-link" onclick="hideConvoDetail()">&larr; Back to list</span>';
    html += '<h2>Conversation ' + esc(c.id) + '</h2>';
    html += '<div style="font-size:.82rem;color:var(--text-muted);margin-bottom:16px">';
    html += esc(fmtDate(c.start_time)) + (c.end_time ? ' &mdash; ' + esc(fmtDate(c.end_time)) : '') + ' &middot; ' + esc(c.state||'');
    html += '</div>';
    if (c.summary) html += '<p style="font-size:.88rem;color:var(--text-sec);margin-bottom:20px;line-height:1.6">' + esc(c.summary) + '</p>';
    if (c.primary_location && c.primary_location.address) {
      html += '<div style="font-size:.82rem;color:var(--text-muted);margin-bottom:16px">Location: ' + esc(c.primary_location.address) + '</div>';
    }
    html += '<h3>Utterances</h3>';
    var transcription = c.transcriptions && c.transcriptions.length > 0
      ? (c.transcriptions.find(function(t) { return !t.realtime; }) || c.transcriptions[0]) : null;
    if (transcription && transcription.utterances && transcription.utterances.length > 0) {
      var utts = transcription.utterances.slice().sort(function(a,b) { return (a.spoken_at||a.start||0) - (b.spoken_at||b.start||0); });
      for (var i = 0; i < utts.length; i++) {
        var u = utts[i];
        html += '<div class="utterance"><div class="speaker">' + esc(u.speaker||'unknown') + '</div>'
          + '<div class="text">' + esc(u.text||'') + '</div></div>';
      }
    } else {
      html += '<div class="empty">No utterances</div>';
    }
    html += '</div>';
    setHtml(detail, html);
  } catch(e) {
    setHtml(detail, '<div class="empty">Error: ' + esc(e.message) + '</div>');
  }
};

window.hideConvoDetail = function() {
  document.getElementById('conversations-detail').style.display = 'none';
  document.getElementById('conversations-list').style.display = '';
  if (convoCursor) document.getElementById('conversations-load-more').style.display = '';
};

// --- Facts ---
async function loadFacts() {
  var list = document.getElementById('facts-list');
  setHtml(list, '<div class="loading">Loading facts</div>');
  try {
    var data = await apiBee('/v1/facts?confirmed=true&limit=200');
    var facts = data.facts || [];
    if (facts.length === 0) { setHtml(list, '<div class="empty">No facts yet</div>'); return; }
    setHtml(list, facts.map(function(f) {
      return '<div class="fact-item"><div class="fact-text">' + esc(f.text) + '</div>'
        + (f.tags && f.tags.length ? f.tags.map(function(t) { return '<span class="fact-tag">' + esc(t) + '</span>'; }).join(' ') : '')
        + '</div>';
    }).join(''));
  } catch(e) {
    setHtml(list, '<div class="empty">Failed to load: ' + esc(e.message) + '</div>');
  }
}
document.getElementById('fact-add-btn').addEventListener('click', async function() {
  var input = document.getElementById('fact-input');
  var text = input.value.trim();
  if (!text) return;
  try {
    await apiBee('/v1/facts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text:text}) });
    input.value = '';
    loadFacts();
  } catch(e) { alert('Error: ' + e.message); }
});
document.getElementById('fact-input').addEventListener('keydown', function(e) { if (e.key === 'Enter') document.getElementById('fact-add-btn').click(); });

// --- Todos ---
async function loadTodos() {
  var openDiv = document.getElementById('todos-open');
  var doneDiv = document.getElementById('todos-done');
  setHtml(openDiv, '<div class="loading">Loading</div>');
  setHtml(doneDiv, '');
  try {
    var data = await apiBee('/v1/todos?limit=200');
    var todos = data.todos || [];
    var open = todos.filter(function(t) { return !t.completed; });
    var done = todos.filter(function(t) { return t.completed; });
    setHtml(openDiv, open.length ? open.map(todoHtml).join('') : '<div class="empty">All done!</div>');
    setHtml(doneDiv, done.length ? done.map(todoHtml).join('') : '<div class="empty">No completed todos</div>');
  } catch(e) {
    setHtml(openDiv, '<div class="empty">Failed: ' + esc(e.message) + '</div>');
  }
}
function todoHtml(t) {
  var cls = t.completed ? 'done' : '';
  return '<div class="todo-item">'
    + '<div class="todo-check ' + cls + '" onclick="toggleTodo(' + Number(t.id) + ',' + !t.completed + ')"></div>'
    + '<div class="todo-text ' + cls + '">' + esc(t.text) + '</div></div>';
}
window.toggleTodo = async function(id, completed) {
  try {
    await apiBee('/v1/todos/' + Number(id), { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({completed:completed}) });
    loadTodos();
  } catch(e) { alert('Error: ' + e.message); }
};
document.getElementById('todo-add-btn').addEventListener('click', async function() {
  var input = document.getElementById('todo-input');
  var text = input.value.trim();
  if (!text) return;
  try {
    await apiBee('/v1/todos', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text:text}) });
    input.value = '';
    loadTodos();
  } catch(e) { alert('Error: ' + e.message); }
});
document.getElementById('todo-input').addEventListener('keydown', function(e) { if (e.key === 'Enter') document.getElementById('todo-add-btn').click(); });

// --- Speakers ---
async function loadSpeakers() {
  var body = document.getElementById('speakers-body');
  setHtml(body, '<tr><td colspan="4"><div class="loading">Loading</div></td></tr>');
  try {
    var profiles = await apiLocal('/speakers');
    if (profiles.length === 0) {
      setHtml(body, '<tr><td colspan="4"><div class="empty">No speaker profiles</div></td></tr>');
      return;
    }
    setHtml(body, profiles.map(function(p) {
      return '<tr><td style="font-weight:500;color:var(--text)">' + esc(p.name) + '</td>'
        + '<td>' + esc(p.notes||'') + '</td>'
        + '<td style="font-family:var(--font-mono);font-size:.75rem">' + esc((p.created_at||'').split('T')[0]) + '</td>'
        + '<td><button class="danger" style="padding:4px 10px;font-size:.75rem" onclick="deleteSpeaker(' + esc(JSON.stringify(p.name)) + ')">Delete</button></td></tr>';
    }).join(''));
  } catch(e) {
    setHtml(body, '<tr><td colspan="4"><div class="empty">Failed: ' + esc(e.message) + '</div></td></tr>');
  }
}
document.getElementById('speaker-add-btn').addEventListener('click', async function() {
  var name = document.getElementById('speaker-name').value.trim();
  if (!name) return;
  var notes = document.getElementById('speaker-notes').value.trim();
  try {
    await apiLocal('/speakers', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name:name, notes:notes||undefined}) });
    document.getElementById('speaker-name').value = '';
    document.getElementById('speaker-notes').value = '';
    loadSpeakers();
  } catch(e) { alert('Error: ' + e.message); }
});
window.deleteSpeaker = async function(name) {
  if (!confirm('Delete speaker profile "' + name + '"?')) return;
  try {
    await apiLocal('/speakers/' + encodeURIComponent(name), { method:'DELETE' });
    loadSpeakers();
  } catch(e) { alert('Error: ' + e.message); }
};

// --- Calendar ---
async function loadCalendar() {
  var div = document.getElementById('calendar-events');
  setHtml(div, '<div class="loading">Loading events</div>');
  try {
    var events = await apiLocal('/calendar/events');
    if (events.length === 0) {
      setHtml(div, '<div class="empty">No upcoming events. Configure a calendar integration via the CLI.</div>');
      return;
    }
    setHtml(div, events.map(function(e) {
      return '<div class="event-item"><div class="event-time">' + esc(e.start||'') + (e.end ? ' - ' + esc(e.end) : '') + '</div>'
        + '<div class="event-title">' + esc(e.summary||'(no title)') + '</div>'
        + (e.location ? '<div class="event-location">' + esc(e.location) + '</div>' : '')
        + '</div>';
    }).join(''));
  } catch(e) {
    setHtml(div, '<div class="empty">Failed: ' + esc(e.message) + '</div>');
  }
}

// --- Mail ---
async function loadMail() {
  var div = document.getElementById('mail-messages');
  setHtml(div, '<div class="loading">Loading messages</div>');
  try {
    var msgs = await apiLocal('/mail/recent?limit=30');
    if (msgs.length === 0) {
      setHtml(div, '<div class="empty">No messages. Configure a mail integration via the CLI.</div>');
      return;
    }
    setHtml(div, msgs.map(function(m) {
      return '<div class="mail-item"><div class="mail-date">' + esc(m.date||'') + (m.provider_name ? ' &middot; ' + esc(m.provider_name) : '') + '</div>'
        + '<div class="mail-from">' + esc(m.from||'') + '</div>'
        + '<div class="mail-subject">' + esc(m.subject||'(no subject)') + '</div></div>';
    }).join(''));
  } catch(e) {
    setHtml(div, '<div class="empty">Failed: ' + esc(e.message) + '</div>');
  }
}

// --- Settings ---
async function loadSettings() {
  loadConnectionStatus();
  refreshAiProvider();
  loadSettingsTable();
}
async function loadSettingsTable() {
  var body = document.getElementById('config-body');
  setHtml(body, '<tr><td colspan="3"><div class="loading">Loading</div></td></tr>');
  try {
    var entries = await apiLocal('/config');
    if (entries.length === 0) {
      setHtml(body, '<tr><td colspan="3"><div class="empty">No configuration set</div></td></tr>');
      return;
    }
    setHtml(body, entries.map(function(e) {
      var masked = e.key.indexOf('key') >= 0 || e.key.indexOf('password') >= 0 || e.key.indexOf('secret') >= 0;
      var val = masked ? '****' + String(e.value||'').slice(-4) : (e.value||'');
      return '<tr><td style="font-family:var(--font-mono);color:var(--amber-dim)">' + esc(e.key) + '</td>'
        + '<td style="font-family:var(--font-mono)">' + esc(val) + '</td>'
        + '<td><button class="danger" style="padding:4px 10px;font-size:.75rem" onclick="deleteConfig(' + esc(JSON.stringify(e.key)) + ')">Delete</button></td></tr>';
    }).join(''));
  } catch(e) {
    setHtml(body, '<tr><td colspan="3"><div class="empty">Failed: ' + esc(e.message) + '</div></td></tr>');
  }
}
document.getElementById('config-set-btn').addEventListener('click', async function() {
  var key = document.getElementById('config-key').value.trim();
  var value = document.getElementById('config-value').value.trim();
  if (!key || !value) return;
  try {
    await apiLocal('/config', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({key:key,value:value}) });
    document.getElementById('config-key').value = '';
    document.getElementById('config-value').value = '';
    loadSettings();
  } catch(e) { alert('Error: ' + e.message); }
});
window.deleteConfig = async function(key) {
  if (!confirm('Delete config "' + key + '"?')) return;
  try {
    await apiLocal('/config/' + encodeURIComponent(key), { method:'DELETE' });
    loadSettings();
  } catch(e) { alert('Error: ' + e.message); }
};

// --- Connection Status ---
async function loadConnectionStatus() {
  var statusDiv = document.getElementById('conn-status');
  var actionsDiv = document.getElementById('conn-actions');
  var loginBtn = document.getElementById('conn-login-btn');
  var logoutBtn = document.getElementById('conn-logout-btn');
  try {
    var data = await (await fetch('/api/auth/status')).json();
    actionsDiv.style.display = '';
    if (data.authenticated) {
      var name = [data.user.first_name, data.user.last_name].filter(Boolean).join(' ');
      setHtml(statusDiv, '<span style="color:var(--green)">&#10003; Connected</span> as <strong>' + esc(name) + '</strong>');
      loginBtn.style.display = 'none';
      logoutBtn.style.display = '';
    } else {
      setHtml(statusDiv, '<span style="color:var(--red)">&#10007; Not connected</span>');
      loginBtn.style.display = '';
      logoutBtn.style.display = 'none';
    }
  } catch {
    setText(statusDiv, 'Unable to check status');
  }
}

document.getElementById('conn-login-btn').addEventListener('click', function() {
  showLogin();
});

document.getElementById('conn-logout-btn').addEventListener('click', async function() {
  if (!confirm('Log out of Bee? You will need to re-pair from your phone to log back in.')) return;
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    showLogin();
    loadConnectionStatus();
  } catch {}
});

// --- AI Key Saving ---
async function saveAiKey(provider, configKey, inputId, statusId) {
  var key = document.getElementById(inputId).value.trim();
  if (!key) return;
  var statusDiv = document.getElementById(statusId);
  statusDiv.style.color = 'var(--text-muted)';
  setText(statusDiv, 'Saving...');
  try {
    await apiLocal('/config', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({key: configKey, value: key}) });
    await apiLocal('/config', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({key: 'ai_provider', value: provider}) });
    statusDiv.style.color = 'var(--green)';
    setText(statusDiv, 'Saved! Now using ' + provider + '.');
    document.getElementById(inputId).value = '';
    refreshAiProvider();
    loadSettingsTable();
  } catch(e) {
    statusDiv.style.color = 'var(--red)';
    setText(statusDiv, 'Error: ' + e.message);
  }
}

document.getElementById('openai-key-save').addEventListener('click', function() {
  saveAiKey('openai', 'openai_api_key', 'openai-key-input', 'openai-key-status');
});
document.getElementById('anthropic-key-save').addEventListener('click', function() {
  saveAiKey('anthropic', 'anthropic_api_key', 'anthropic-key-input', 'anthropic-key-status');
});

async function switchProvider(name) {
  try {
    await apiLocal('/config', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({key:'ai_provider', value:name}) });
    refreshAiProvider();
    loadSettingsTable();
  } catch(e) { alert('Error: ' + e.message); }
}

document.getElementById('ai-switch-openai').addEventListener('click', function() { switchProvider('openai'); });
document.getElementById('ai-switch-anthropic').addEventListener('click', function() { switchProvider('anthropic'); });

async function refreshAiProvider() {
  var bar = document.getElementById('ai-active-provider');
  var nameSpan = document.getElementById('ai-active-name');
  try {
    var entries = await apiLocal('/config');
    var provider = null;
    var hasOpenai = false;
    var hasAnthropic = false;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].key === 'ai_provider') provider = entries[i].value;
      if (entries[i].key === 'openai_api_key') hasOpenai = true;
      if (entries[i].key === 'anthropic_api_key') hasAnthropic = true;
    }
    if (provider) {
      bar.style.display = '';
      setText(nameSpan, provider);
      document.getElementById('ai-switch-openai').style.display = hasOpenai && provider !== 'openai' ? '' : 'none';
      document.getElementById('ai-switch-anthropic').style.display = hasAnthropic && provider !== 'anthropic' ? '' : 'none';
    } else {
      bar.style.display = 'none';
    }
    // Show status on key cards
    var oStat = document.getElementById('openai-key-status');
    var aStat = document.getElementById('anthropic-key-status');
    if (hasOpenai && !oStat.textContent) { oStat.style.color = 'var(--green)'; setText(oStat, provider === 'openai' ? 'Active' : 'Key saved'); }
    if (hasAnthropic && !aStat.textContent) { aStat.style.color = 'var(--green)'; setText(aStat, provider === 'anthropic' ? 'Active' : 'Key saved'); }
  } catch {}
}

// --- Auth ---
var loginOverlay = document.getElementById('login-overlay');
var pollTimer = null;

async function checkAuth() {
  try {
    var data = await (await fetch('/api/auth/status')).json();
    if (data.authenticated) {
      hideLogin();
      return true;
    }
  } catch {}
  showLogin();
  return false;
}

function showLogin() {
  loginOverlay.classList.add('visible');
}

function hideLogin() {
  loginOverlay.classList.remove('visible');
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

document.getElementById('login-start-btn').addEventListener('click', async function() {
  this.textContent = 'Starting...';
  this.disabled = true;
  var errorDiv = document.getElementById('login-error');
  errorDiv.style.display = 'none';
  try {
    var data = await (await fetch('/api/auth/start', { method: 'POST' })).json();
    if (data.status === 'completed') {
      hideLogin();
      loadOverview();
      return;
    }
    if (data.status === 'pending') {
      document.getElementById('login-initial').style.display = 'none';
      var pairingDiv = document.getElementById('login-pairing');
      pairingDiv.style.display = 'block';
      var link = document.getElementById('login-pairing-link');
      link.href = data.pairingUrl;
      setText(link, data.pairingUrl);
      var expiresAt = Date.parse(data.expiresAt);
      var expiresDiv = document.getElementById('login-expires');
      function updateExpiry() {
        var remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 60000));
        setText(expiresDiv, 'Expires in ~' + remaining + ' minute' + (remaining === 1 ? '' : 's'));
      }
      updateExpiry();
      startPolling(expiresAt, updateExpiry);
    }
    if (data.error) {
      errorDiv.style.display = '';
      setText(errorDiv, data.error);
    }
  } catch(e) {
    errorDiv.style.display = '';
    setText(errorDiv, 'Failed to start pairing: ' + e.message);
  }
  this.textContent = 'Start Pairing';
  this.disabled = false;
});

function startPolling(expiresAt, updateExpiry) {
  var statusDiv = document.getElementById('login-poll-status');
  pollTimer = setInterval(async function() {
    updateExpiry();
    if (Date.now() >= expiresAt) {
      clearInterval(pollTimer); pollTimer = null;
      setHtml(statusDiv, 'Pairing expired. <span style="color:var(--amber);cursor:pointer" onclick="resetLogin()">Try again</span>');
      return;
    }
    try {
      var data = await (await fetch('/api/auth/poll')).json();
      if (data.status === 'completed') {
        hideLogin();
        if (!location.hash || location.hash === '#guide') location.hash = '#overview';
        navigate();
        return;
      }
      if (data.status === 'expired') {
        clearInterval(pollTimer); pollTimer = null;
        setHtml(statusDiv, 'Pairing expired. <span style="color:var(--amber);cursor:pointer" onclick="resetLogin()">Try again</span>');
      }
    } catch {}
  }, 2500);
}

window.resetLogin = function() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  document.getElementById('login-initial').style.display = '';
  document.getElementById('login-pairing').style.display = 'none';
  document.getElementById('login-start-btn').textContent = 'Start Pairing';
  document.getElementById('login-start-btn').disabled = false;
};

document.getElementById('login-cancel-btn').addEventListener('click', function() {
  window.resetLogin();
});

document.getElementById('login-token-btn').addEventListener('click', async function() {
  var input = document.getElementById('login-token-input');
  var token = input.value.trim();
  if (!token) return;
  var errorDiv = document.getElementById('login-error');
  errorDiv.style.display = 'none';
  this.textContent = 'Logging in...';
  try {
    var r = await fetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token })
    });
    var data = await r.json();
    if (data.status === 'completed') {
      hideLogin();
      if (!location.hash || location.hash === '#guide') location.hash = '#overview';
      navigate();
      return;
    }
    errorDiv.style.display = '';
    setText(errorDiv, data.error || 'Login failed');
  } catch(e) {
    errorDiv.style.display = '';
    setText(errorDiv, 'Error: ' + e.message);
  }
  this.textContent = 'Login';
});

document.getElementById('login-token-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') document.getElementById('login-token-btn').click();
});

// --- Boot ---
(async function() {
  var authed = await checkAuth();
  if (!location.hash) location.hash = authed ? '#overview' : '#guide';
  navigate();
})();
</script>
</body>
</html>`;
}
