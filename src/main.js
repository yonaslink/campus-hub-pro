import { createClient } from '@supabase/supabase-js';
import './style.css';

const $ = (s) => document.querySelector(s);
const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cfg = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = cfg ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY) : null;
let user = null, profile = null, tasks = [], teams = [], activeTeam = 'personal', view = 'overview', channel = null;

function renderShell() {
  $('#app').innerHTML = `
    <section id="auth" class="auth-screen">
      <div class="auth-art"><div class="brand"><span class="brand-icon">C</span> campus<span>hub</span></div><div class="art-copy"><span class="eyebrow">A BETTER WAY TO WORK TOGETHER</span><h1>Make room for<br><em>great work.</em></h1><p>Bring tasks, teammates and momentum into one calm workspace.</p><div class="art-pills"><span>✦ Focused work</span><span>↗ Shared progress</span><span>◉ Live updates</span></div></div><div class="art-bottom">Designed for teams that do more together.</div></div>
      <div class="auth-side"><form id="auth-form" class="auth-card"><div class="mobile-brand brand"><span class="brand-icon">C</span> campus<span>hub</span></div><div class="eyebrow" id="auth-kicker">WELCOME BACK</div><h2 id="auth-title">Sign in to your space</h2><p class="muted" id="auth-subtitle">Pick up where you left off.</p><div id="auth-error" class="inline-error hidden"></div><label>Email address<input id="email" type="email" autocomplete="email" required placeholder="you@example.com"></label><label>Password<input id="password" type="password" autocomplete="current-password" minlength="6" required placeholder="At least 6 characters"></label><label id="name-wrap" class="hidden">Your name<input id="display-name" maxlength="80" placeholder="How should we call you?"></label><button id="auth-submit" class="btn primary wide">Sign in <span>→</span></button><p class="auth-switch"><span id="auth-switch-text">New to Campus Hub?</span> <button type="button" id="auth-switch">Create an account</button></p><p class="tiny muted">Your workspace is private. Team content is shared only with team members.</p></form></div>
    </section>
    <section id="workspace" class="workspace hidden">
      <aside class="sidebar"><div class="brand"><span class="brand-icon">C</span> campus<span>hub</span></div><div class="workspace-chip"><div class="workspace-symbol">✦</div><div><b>My workspace</b><small>Personal + teams</small></div><span class="chevron">⌄</span></div><div class="nav-label">WORKSPACE</div><nav class="nav"><button data-view="overview" class="nav-item active"><span>◫</span> Overview</button><button data-view="tasks" class="nav-item"><span>☷</span> My tasks <b id="nav-task-count">0</b></button><button data-view="teams" class="nav-item"><span>♧</span> Teams</button></nav><div class="nav-label team-label">YOUR TEAMS</div><div id="sidebar-teams" class="sidebar-teams"></div><div class="sidebar-bottom"><div class="upgrade-card"><div class="upgrade-orb">✦</div><b>Great work starts here</b><p>Keep your team moving, one task at a time.</p><button data-view="teams" class="text-button">Explore teams ↗</button></div><button data-view="profile" class="profile-nav"><span class="avatar" id="sidebar-avatar">U</span><span class="profile-nav-copy"><b id="sidebar-name">Your profile</b><small id="sidebar-email">Signed in</small></span><span class="more">···</span></button></div></aside>
      <main class="main-area"><header class="topbar"><div class="breadcrumbs"><span>Workspace</span><b>/</b><strong id="crumb-title">Overview</strong></div><div class="topbar-actions"><span class="sync-status"><i></i> Live sync</span><button class="icon-btn" id="push-btn" title="Enable push notifications" aria-label="Enable push notifications">♧</button><button class="avatar top-avatar" data-view="profile" id="top-avatar">U</button></div></header>
        <div class="page-content"><div id="notice" class="notice hidden"></div>
          <section id="view-overview" class="view"><div class="page-heading"><div><div class="eyebrow">TUESDAY, YOUR WAY</div><h1 id="greeting">Good morning ✨</h1><p>Here’s what’s happening in your workspace today.</p></div><button class="btn primary" id="quick-add">＋ New task</button></div>
            <div class="welcome-banner"><div><span class="banner-kicker">YOUR MOMENTUM, AT A GLANCE</span><h2>Progress is built<br>one step at a time.</h2><p>Small wins add up. Let’s make today count.</p><button class="banner-button" data-view="tasks">View my tasks <span>→</span></button></div><div class="banner-art"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="art-star">✳</div><div class="art-check">✓</div><div class="art-spark">✦</div></div></div>
            <div class="section-title"><div><h2>Your overview</h2><p>A clear picture of what’s moving.</p></div><span class="date-pill" id="today-date"></span></div>
            <div class="stats-grid"><article class="stat-card"><div class="stat-top"><span class="stat-icon purple">☷</span><span class="stat-caption">ALL TASKS</span></div><strong id="stat-total">0</strong><div class="stat-foot"><span id="stat-total-foot">Ready when you are</span></div><div class="stat-line"><i style="width:72%"></i></div></article><article class="stat-card"><div class="stat-top"><span class="stat-icon amber">◷</span><span class="stat-caption">IN PROGRESS</span></div><strong id="stat-progress">0</strong><div class="stat-foot"><span>Keep the momentum</span></div><div class="stat-line amber-line"><i id="progress-line" style="width:0%"></i></div></article><article class="stat-card"><div class="stat-top"><span class="stat-icon green">✓</span><span class="stat-caption">COMPLETED</span></div><strong id="stat-done">0</strong><div class="stat-foot"><span id="completion-label">Every win matters</span></div><div class="stat-line green-line"><i id="done-line" style="width:0%"></i></div></article><article class="stat-card"><div class="stat-top"><span class="stat-icon pink">⚑</span><span class="stat-caption">HIGH PRIORITY</span></div><strong id="stat-high">0</strong><div class="stat-foot"><span>Give these some focus</span></div><div class="stat-line pink-line"><i style="width:35%"></i></div></article></div>
            <div class="dashboard-grid"><section class="surface"><div class="surface-heading"><div><h2>Recent tasks</h2><p>Your latest tasks in one place.</p></div><button class="text-button" data-view="tasks">See all ↗</button></div><div id="recent-tasks" class="task-list"></div></section><section class="surface"><div class="surface-heading"><div><h2>Quick focus</h2><p>A little structure goes a long way.</p></div><span class="mini-spark">✦</span></div><div class="focus-card"><div class="focus-illustration">◌<span>✓</span></div><h3 id="focus-title">Your next small win</h3><p id="focus-copy">Add a task to turn an idea into progress.</p><button class="btn subtle wide" id="focus-action">Create a task <span>→</span></button></div><div class="focus-tip"><span>✧</span><p><b>Pro tip</b> — Break big projects into smaller, finishable tasks.</p></div></section></div>
          </section>
          <section id="view-tasks" class="view hidden"><div class="page-heading"><div><div class="eyebrow">MAKE IT HAPPEN</div><h1>Tasks <span class="heading-count" id="task-heading-count">0</span></h1><p>Keep the details clear and the next step close.</p></div><button class="btn primary" id="new-task">＋ New task</button></div><div class="surface"><div class="task-toolbar"><div class="search-wrap"><span>⌕</span><input id="search" type="search" placeholder="Search tasks, details…"></div><select id="filter"><option value="all">All statuses</option><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Completed</option></select><select id="priority-filter"><option value="all">All priorities</option><option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option></select></div><div id="task-list" class="task-list full-task-list"></div></div></section>
          <section id="view-teams" class="view hidden"><div class="page-heading"><div><div class="eyebrow">BETTER, TOGETHER</div><h1>Your teams</h1><p>Bring people and projects into the same room.</p></div></div><div class="team-actions-grid"><form id="create-team-form" class="surface form-surface"><div class="surface-heading"><div><h2>Create a team</h2><p>Start a shared workspace.</p></div><span class="stat-icon purple">＋</span></div><label>Team name<input id="team-name" required maxlength="80" placeholder="e.g. Design crew"></label><label>What are you working on?<textarea id="team-description" rows="3" maxlength="500" placeholder="A little context helps everyone."></textarea></label><button class="btn primary wide">Create team <span>→</span></button></form><form id="join-team-form" class="surface form-surface"><div class="surface-heading"><div><h2>Join with a code</h2><p>Have an invite code? Enter it here.</p></div><span class="stat-icon green">↗</span></div><label>Invite code<input id="invite-code" required maxlength="20" placeholder="e.g. A1B2C3D4"></label><div class="join-note">Team codes are case-insensitive. Ask a teammate to share their code with you.</div><button class="btn subtle wide">Join team <span>→</span></button></form></div><div class="section-title"><div><h2>Teams you’re in</h2><p>Shared workspaces and invite codes.</p></div><span id="team-count" class="date-pill">0 teams</span></div><div id="team-grid" class="team-grid"></div></section>
          <section id="view-profile" class="view hidden"><div class="page-heading"><div><div class="eyebrow">MAKE IT YOURS</div><h1>Your profile</h1><p>Help teammates know who you are.</p></div></div><div class="profile-layout"><div class="surface profile-summary"><div class="profile-cover"></div><div class="profile-big-avatar" id="profile-big-avatar">U</div><h2 id="profile-display-name">Your name</h2><p id="profile-email" class="muted"></p><span class="profile-tag">Campus Hub member</span><div class="profile-summary-line"><span>✦</span><p>Your profile is visible to signed-in members so teammates can recognize you.</p></div></div><form id="profile-form" class="surface profile-edit"><div class="surface-heading"><div><h2>Personal details</h2><p>Keep your information up to date.</p></div></div><label>Display name<input id="profile-name" required maxlength="80" placeholder="Your name"></label><label>Role or title<input id="profile-title" maxlength="100" placeholder="e.g. Product designer"></label><label>About you<textarea id="profile-bio" rows="4" maxlength="500" placeholder="A few words about what you do…"></textarea></label><button class="btn primary">Save changes <span>→</span></button><hr><div class="settings-row"><div><b>Push notifications</b><p>Get updates even when Campus Hub isn’t open.</p></div><button type="button" id="profile-push" class="btn subtle">Enable</button></div><div class="settings-row"><div><b>Account</b><p id="account-email"></p></div><button type="button" id="signout" class="btn danger-outline">Sign out</button></div></form></div></section>
        </div><footer class="app-footer"><span>✦ Campus Hub</span><span>Made for focused work · Powered by Supabase</span><span id="connection-state">Connected</span></footer>
      </main>
    </section>
    <dialog id="task-dialog" class="task-dialog"><form id="task-form" method="dialog"><div class="dialog-top"><div><div class="eyebrow">MAKE PROGRESS</div><h2 id="task-dialog-title">Create a task</h2></div><button type="button" class="icon-btn" id="close-task">×</button></div><label>Task title<input id="task-title" required maxlength="120" placeholder="What needs to get done?"></label><label>Description<textarea id="task-description" rows="3" maxlength="2000" placeholder="Add a little context…"></textarea></label><div class="two-col"><label>Status<select id="task-status"><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Completed</option></select></label><label>Priority<select id="task-priority"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select></label></div><div class="two-col"><label>Due date<input id="task-due" type="date"></label><label>Workspace<select id="task-team"><option value="">Personal</option></select></label></div><div class="dialog-actions"><button type="button" class="btn subtle" id="cancel-task">Cancel</button><button class="btn primary" id="save-task">Save task <span>→</span></button></div></form></dialog>
    <div id="toast" class="toast hidden"></div>`;
}

let authMode = 'signin';
function notice(msg, type='info') { const el=$('#notice'); if(!el)return; el.textContent=msg; el.className=`notice ${type}`; el.classList.remove('hidden'); }
function toast(msg) { const el=$('#toast'); el.textContent=msg; el.classList.remove('hidden'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.add('hidden'),3000); }
function setAuthMode(mode) {
  authMode=mode; const signup=mode==='signup';
  $('#auth-title').textContent=signup?'Create your account':'Sign in to your space';
  $('#auth-kicker').textContent=signup?'YOUR SPACE STARTS HERE':'WELCOME BACK';
  $('#auth-subtitle').textContent=signup?'A little organization goes a long way.':'Pick up where you left off.';
  $('#auth-submit').innerHTML=signup?'Create account <span>→</span>':'Sign in <span>→</span>';
  $('#auth-switch-text').textContent=signup?'Already have an account?':'New to Campus Hub?';
  $('#auth-switch').textContent=signup?'Sign in':'Create an account';
  $('#name-wrap').classList.toggle('hidden',!signup);
  $('#password').autocomplete=signup?'new-password':'current-password';
}
function setView(name) {
  view=name;
  document.querySelectorAll('.view').forEach(el=>el.classList.toggle('hidden',el.id!==`view-${name}`));
  document.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view===name && el.classList.contains('nav-item')));
  $('#crumb-title').textContent=({overview:'Overview',tasks:'My tasks',teams:'Teams',profile:'Profile'})[name]||'Overview';
}
function initials(name='U') { return name.trim().split(/\s+/).slice(0,2).map(s=>s[0]||'').join('').toUpperCase()||'U'; }
function dateText(value) { if(!value)return 'No due date'; const d=new Date(`${value}T12:00:00`); return d.toLocaleDateString(undefined,{month:'short',day:'numeric'}); }
function statusName(s) { return ({todo:'To do',in_progress:'In progress',done:'Completed'})[s]||s; }

async function loadProfile() {
  let {data,error}=await supabase.from('profiles').select('*').eq('id',user.id).maybeSingle();
  if(error) console.warn(error);
  if(!data) {
    const {data:made}=await supabase.from('profiles').upsert({id:user.id,display_name:user.user_metadata?.display_name||user.email.split('@')[0]}).select().single();
    data=made;
  }
  profile=data||{display_name:user.email.split('@')[0],job_title:'',bio:''};
  $('#sidebar-name').textContent=profile.display_name||'Your profile';
  $('#sidebar-email').textContent=user.email;
  $('#sidebar-avatar').textContent=initials(profile.display_name);
  $('#top-avatar').textContent=initials(profile.display_name);
  $('#profile-big-avatar').textContent=initials(profile.display_name);
  $('#profile-display-name').textContent=profile.display_name||'Your name';
  $('#profile-email').textContent=user.email;
  $('#profile-name').value=profile.display_name||'';
  $('#profile-title').value=profile.job_title||'';
  $('#profile-bio').value=profile.bio||'';
  $('#account-email').textContent=user.email;
  $('#greeting').innerHTML=`${getGreeting()}, ${esc((profile.display_name||'there').split(' ')[0])} <span class="greeting-spark">✦</span>`;
}
function getGreeting(){const h=new Date().getHours();return h<12?'Good morning':h<18?'Good afternoon':'Good evening';}

async function loadTeams() {
  const {data:members,error}=await supabase.from('team_members').select('team_id,role,teams(id,name,description,invite_code,created_by,created_at)').eq('user_id',user.id);
  if(error){console.warn(error.message);teams=[];} else teams=(members||[]).map(m=>({...m.teams,role:m.role})).filter(Boolean);
  $('#team-count').textContent=`${teams.length} ${teams.length===1?'team':'teams'}`;
  $('#sidebar-teams').innerHTML=teams.length?teams.map(t=>`<button class="team-link" data-team="${t.id}"><span class="team-dot">${esc(t.name.slice(0,1).toUpperCase())}</span><span>${esc(t.name)}</span></button>`).join(''):'<p class="sidebar-empty">No teams yet</p>';
  $('#team-grid').innerHTML=teams.length?teams.map(t=>`<article class="team-card"><div class="team-card-top"><span class="team-mark">${esc(t.name.slice(0,1).toUpperCase())}</span><span class="role-pill">${esc(t.role||'member')}</span></div><h3>${esc(t.name)}</h3><p>${esc(t.description||'A shared space to make progress together.')}</p><div class="invite-row"><div><small>TEAM INVITE CODE</small><b>${esc(t.invite_code)}</b></div><button class="copy-btn" data-copy="${esc(t.invite_code)}" title="Copy invite code">▢ Copy</button></div><div class="team-card-footer"><span>♧ Shared workspace</span><span>Created ${dateText(t.created_at?.slice(0,10))}</span></div></article>`).join(''):'<div class="empty-state"><div class="empty-icon">♧</div><h3>Your people are one invite away</h3><p>Create a team or join one with an invite code to start collaborating.</p></div>';
  $('#task-team').innerHTML='<option value="">Personal</option>'+teams.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('');
}

async function loadTasks() {
  if(!user)return;
  let query=supabase.from('tasks').select('*').order('created_at',{ascending:false});
  if(activeTeam==='personal') query=query.is('team_id',null).eq('user_id',user.id);
  else if(activeTeam!=='all') query=query.eq('team_id',activeTeam);
  const {data,error}=await query;
  if(error){notice(`Could not load tasks: ${error.message}`,'error');return;}
  tasks=data||[]; renderTasks();
}
function taskMarkup(t, compact=false) {
  const overdue=t.due_date && t.due_date < new Date().toISOString().slice(0,10) && t.status!=='done';
  return `<article class="task-row ${compact?'compact':''}" data-task="${t.id}"><button class="task-check ${t.status==='done'?'checked':''}" data-complete="${t.id}" title="Mark completed">${t.status==='done'?'✓':''}</button><div class="task-row-main"><h3>${esc(t.title)}</h3>${t.description?`<p>${esc(t.description)}</p>`:''}<div class="task-row-meta"><span class="priority-dot ${t.priority||'medium'}">${esc(t.priority||'medium')} priority</span><span class="${overdue?'overdue':''}">◷ ${dateText(t.due_date)}</span>${t.team_id?'<span>♧ Team</span>':''}</div></div><span class="status-pill ${t.status}">${statusName(t.status)}</span><select class="row-status" data-status="${t.id}" aria-label="Change status"><option value="todo" ${t.status==='todo'?'selected':''}>To do</option><option value="in_progress" ${t.status==='in_progress'?'selected':''}>In progress</option><option value="done" ${t.status==='done'?'selected':''}>Completed</option></select><button class="row-delete" data-delete="${t.id}" title="Delete task">×</button></article>`;
}
function renderTasks() {
  const total=tasks.length, done=tasks.filter(t=>t.status==='done').length, prog=tasks.filter(t=>t.status==='in_progress').length, high=tasks.filter(t=>t.priority==='high'&&t.status!=='done').length;
  $('#stat-total').textContent=total; $('#stat-progress').textContent=prog; $('#stat-done').textContent=done; $('#stat-high').textContent=high;
  $('#stat-total-foot').textContent=total?`${done} of ${total} completed`:'Ready when you are';
  $('#completion-label').textContent=total?`${Math.round(done/total*100)}% completion rate`:'Every win matters';
  $('#progress-line').style.width=`${total?prog/total*100:0}%`; $('#done-line').style.width=`${total?done/total*100:0}%`;
  $('#task-heading-count').textContent=total; $('#nav-task-count').textContent=tasks.filter(t=>t.status!=='done').length;
  const q=($('#search')?.value||'').toLowerCase().trim(), filter=$('#filter')?.value||'all', priority=$('#priority-filter')?.value||'all';
  const filtered=tasks.filter(t=>(filter==='all'||t.status===filter)&&(priority==='all'||t.priority===priority)&&`${t.title} ${t.description||''}`.toLowerCase().includes(q));
  $('#task-list').innerHTML=filtered.length?filtered.map(t=>taskMarkup(t)).join(''):'<div class="empty-state"><div class="empty-icon">✦</div><h3>Nothing on the board</h3><p>Create a task or adjust your search filters.</p><button class="btn subtle" data-new-task>Create a task</button></div>';
  const recent=[...tasks].slice(0,5);
  $('#recent-tasks').innerHTML=recent.length?recent.map(t=>taskMarkup(t,true)).join(''):'<div class="empty-state compact-empty"><div class="empty-icon">✦</div><h3>A fresh start</h3><p>Your tasks will appear here.</p><button class="btn subtle" data-new-task>Create first task</button></div>';
  const focus=tasks.find(t=>t.status!=='done');
  $('#focus-title').textContent=focus?focus.title:'You’re all caught up!';
  $('#focus-copy').textContent=focus?`${statusName(focus.status)} · ${focus.priority||'medium'} priority${focus.due_date?' · due '+dateText(focus.due_date):''}`:'Enjoy the space, or add another task to keep momentum going.';
  $('#focus-action').textContent=focus?'Open my tasks →':'Create a task →';
}
function openTaskDialog() {
  $('#task-form').reset(); $('#task-dialog-title').textContent='Create a task'; $('#task-dialog').showModal();
  $('#task-team').value=activeTeam==='personal'?'':(activeTeam==='all'?'':activeTeam);
}
async function saveTask(e) {
  e.preventDefault();
  const payload={user_id:user.id,title:$('#task-title').value.trim(),description:$('#task-description').value.trim(),status:$('#task-status').value,priority:$('#task-priority').value,due_date:$('#task-due').value||null,team_id:$('#task-team').value||null};
  if(!payload.title)return;
  const button=$('#save-task');button.disabled=true;button.textContent='Saving…';
  const {error}=await supabase.from('tasks').insert(payload);
  button.disabled=false;button.innerHTML='Save task <span>→</span>';
  if(error){notice(`Could not save task: ${error.message}`,'error');return;}
  $('#task-dialog').close();toast('Task created');await loadTasks();
  if(payload.team_id) notifyTeam(payload.team_id,`New task: ${payload.title}`,'A teammate added a task to your team.');
}
async function notifyTeam(teamId,title,body) {
  // Optional notification dispatch. The Edge Function validates the caller and sends to subscribed team members.
  try { await supabase.functions.invoke('send-push',{body:{title,body,url:'/',team_id:teamId}}); } catch(e) { console.info('Push dispatch not configured:',e.message); }
}
async function changeStatus(id,status) {
  const t=tasks.find(x=>x.id===id); if(!t)return;
  const {error}=await supabase.from('tasks').update({status}).eq('id',id);
  if(error){notice(error.message,'error');return;}
  toast('Task updated');await loadTasks();
}
async function removeTask(id) {
  const t=tasks.find(x=>x.id===id);if(!t||!confirm(`Delete “${t.title}”?`))return;
  const {error}=await supabase.from('tasks').delete().eq('id',id);
  if(error){notice(error.message,'error');return;}toast('Task deleted');await loadTasks();
}
async function createTeam(e) {
  e.preventDefault();const name=$('#team-name').value.trim(),description=$('#team-description').value.trim();if(!name)return;
  const {data,error}=await supabase.from('teams').insert({name,description,created_by:user.id}).select().single();
  if(error){notice(`Could not create team: ${error.message}`,'error');return;}
  const {error:memberError}=await supabase.from('team_members').insert({team_id:data.id,user_id:user.id,role:'owner'});
  if(memberError){notice(`Team created, but membership failed: ${memberError.message}`,'error');return;}
  $('#create-team-form').reset();await loadTeams();toast('Team created');notice(`Share invite code ${data.invite_code} with your teammates.`,'success');
}
async function joinTeam(e) {
  e.preventDefault();const code=$('#invite-code').value.trim().toUpperCase();if(!code)return;
  const {error}=await supabase.rpc('join_team_by_code',{code});
  if(error){notice(`Could not join team: ${error.message}`,'error');return;}
  $('#join-team-form').reset();await loadTeams();toast('You joined the team!');
}
async function saveProfile(e) {
  e.preventDefault();const changes={display_name:$('#profile-name').value.trim(),job_title:$('#profile-title').value.trim(),bio:$('#profile-bio').value.trim(),updated_at:new Date().toISOString()};
  const {error}=await supabase.from('profiles').upsert({id:user.id,...changes});
  if(error){notice(`Could not save profile: ${error.message}`,'error');return;}
  await loadProfile();toast('Profile saved');
}
async function enablePush() {
  if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window)){notice('This browser does not support Web Push. Try a recent version of Chrome, Edge, Firefox or Safari.','error');return;}
  const publicKey=import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if(!publicKey||publicKey.includes('YOUR_')){notice('Push setup is incomplete. Add VITE_VAPID_PUBLIC_KEY to .env and configure the send-push Edge Function using the README.','info');return;}
  try {
    const permission=await Notification.requestPermission();
    if(permission!=='granted'){toast('Notification permission was not granted.');return;}
    const reg=await navigator.serviceWorker.register('/sw.js');
    const subscription=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64ToBytes(publicKey)});
    const {error}=await supabase.from('push_subscriptions').upsert({user_id:user.id,endpoint:subscription.endpoint,subscription:subscription.toJSON()},{onConflict:'endpoint'});
    if(error)throw error;
    toast('Push notifications enabled on this device');notice('Push is enabled. A deployed server-side function can now send notifications to this device.','success');
  } catch(err){notice(`Could not enable push: ${err.message||err}`,'error');}
}
function base64ToBytes(s){const pad='='.repeat((4-s.length%4)%4),raw=atob((s+pad).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));}
async function signOut(){await supabase.auth.signOut();if(channel)supabase.removeChannel(channel);user=null;$('#workspace').classList.add('hidden');$('#auth').classList.remove('hidden');}
function bind() {
  $('#auth-switch').addEventListener('click',()=>setAuthMode(authMode==='signin'?'signup':'signin'));
  $('#auth-form').addEventListener('submit',async e=>{
    e.preventDefault();$('#auth-error').classList.add('hidden');const email=$('#email').value.trim(),password=$('#password').value;
    let result;
    if(authMode==='signup')result=await supabase.auth.signUp({email,password,options:{data:{display_name:$('#display-name').value.trim()}}});
    else result=await supabase.auth.signInWithPassword({email,password});
    if(result.error){$('#auth-error').textContent=result.error.message;$('#auth-error').classList.remove('hidden');return;}
    if(authMode==='signup'&&!result.data.session){$('#auth-error').textContent='Account created. Check your email to confirm, then sign in.';$('#auth-error').classList.remove('hidden');return;}
    await enterApp(result.data.user||result.data.session?.user);
  });
  document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>setView(el.dataset.view)));
  $('#signout').addEventListener('click',signOut);
  $('#quick-add').addEventListener('click',openTaskDialog);$('#new-task').addEventListener('click',openTaskDialog);$('#focus-action').addEventListener('click',()=>tasks.some(t=>t.status!=='done')?setView('tasks'):openTaskDialog);
  $('#close-task').addEventListener('click',()=>$('#task-dialog').close());$('#cancel-task').addEventListener('click',()=>$('#task-dialog').close());
  $('#task-form').addEventListener('submit',saveTask);
  $('#search').addEventListener('input',renderTasks);$('#filter').addEventListener('change',renderTasks);$('#priority-filter').addEventListener('change',renderTasks);
  $('#create-team-form').addEventListener('submit',createTeam);$('#join-team-form').addEventListener('submit',joinTeam);$('#profile-form').addEventListener('submit',saveProfile);
  $('#push-btn').addEventListener('click',enablePush);$('#profile-push').addEventListener('click',enablePush);
  document.addEventListener('click',async e=>{
    const complete=e.target.closest('[data-complete]');if(complete){const t=tasks.find(x=>x.id===complete.dataset.complete);if(t)await changeStatus(t.id,t.status==='done'?'todo':'done');}
    const status=e.target.closest('[data-status]')||e.target.closest('[data-status]');
    if(status)await changeStatus(status.dataset.status,status.value);
    const del=e.target.closest('[data-delete]');if(del)await removeTask(del.dataset.delete);
    const newTask=e.target.closest('[data-new-task]');if(newTask)openTaskDialog();
    const copy=e.target.closest('[data-copy]');if(copy){await navigator.clipboard.writeText(copy.dataset.copy);toast('Invite code copied');}
    const team=e.target.closest('[data-team]');if(team){activeTeam=team.dataset.team;setView('tasks');await loadTasks();}
  });
  $('#today-date').textContent=new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
}
async function enterApp(signedUser) {
  if(!signedUser)return;user=signedUser;$('#auth').classList.add('hidden');$('#workspace').classList.remove('hidden');
  $('#connection-state').textContent='Connected';await loadProfile();await loadTeams();await loadTasks();
  if(channel)supabase.removeChannel(channel);
  channel=supabase.channel('campus-live-'+user.id).on('postgres_changes',{event:'*',schema:'public',table:'tasks'},()=>loadTasks()).subscribe();
  await supabase.from('app_events').insert({user_id:user.id,event_name:'session_started',details:{source:'web'}});
}
renderShell();bind();
if(!cfg){$('#auth-error').textContent='Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file, then restart the dev server.';$('#auth-error').classList.remove('hidden');}
else supabase.auth.getSession().then(({data})=>{if(data.session)enterApp(data.session.user);});
