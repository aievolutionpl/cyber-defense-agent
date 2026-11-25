/* The panel renders server data as text, never as executable HTML. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const lang = document.documentElement.lang;
  const t = (pl, en) => lang === 'en' ? en : pl;
  const token = document.querySelector('meta[name="cda-token"]').content;
  const state = { workflow: 'demo', view: 'overview', runs: [], reports: [], agents: {}, sessions: [], activeRunId: sessionStorage.getItem('cda-active-run'), bridge: null, busy: false, offline: true, pdf: null };
  const signatures = {};
  state.projects = [];
  state.projectId = localStorage.getItem('cda-project') || '';
  let draftReviewId = sessionStorage.getItem('cda-draft-review') || '';
  let draftProjectId = sessionStorage.getItem('cda-draft-project') || '';
  let briefReview, retainedRun, comparisonProject;
  const projectName = id => state.projects.find(project => project.id === id)?.name || t('Bez projektu', 'Unassigned');
  function startConversation(projectId = '', reviewId = '') {
    draftReviewId = reviewId;
    draftProjectId = projectId;
    sessionStorage.setItem('cda-draft-review', reviewId);
    sessionStorage.setItem('cda-draft-project', projectId);
    saveChatSelection(null);
    $('chat-title').value = '';
    $('chat-archived').checked = false;
    $('chat-plan').hidden = true;
    renderChat();
    showView('terminal');
    $('chat-message').focus();
  }
  function conversationContext() {
    const session = state.sessions.find(item => item.sessionId === chatSessionId);
    const associated = session && state.runs.find(run => run.conversationId === (session.conversationId || session.sessionId));
    return {
      projectId: session ? session.projectId || '' : draftProjectId,
      reviewId: session ? associated?.runId || session.reviewId || '' : draftReviewId,
      report: session?.reportName
    };
  }
  const animated = new Set();
  let statusTimer, statusFlight, refreshQueued = false, bridgeSequence = 0, generation;
  const node = (tag, text, className) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; };
  const statusName = (value) => ({ running: t('W trakcie', 'Running'), completed: t('Gotowe', 'Completed'), pending: t('Oczekuje', 'Waiting'), awaiting_approval: t('Potrzebna Twoja zgoda', 'Your approval needed'), failed: t('Wymaga ponowienia', 'Needs a retry'), cancelled: t('Zatrzymane', 'Stopped'), auth_error: t('Zaloguj agenta', 'Sign in to your agent'), not_installed: t('Nie jest zainstalowany', 'Not installed') })[value] || value;
  const workflowName = (value) => ({ demo: t('Przykładowe sprawdzenie', 'Sample review'), web: t('Strona internetowa', 'Website'), project: t('Projekt i kod', 'Project & code'), pc: t('Ten komputer', 'This computer') })[value] || t('Sprawdzenie', 'Review');
  const stepName = (step) => ({ demo: t('Sprawdzenie przykładowego projektu', 'Review sample project'), dashboard: t('Zapisanie wyników', 'Save results'), report: t('Przygotowanie raportu', 'Prepare report'), 'report-after': t('Raport po poprawce', 'Report after the fix'), inventory: t('Lista programów i portów', 'Software and port inventory'), advisories: t('Porównanie z bazami znanych luk', 'Compare with known vulnerability sources'), scope: t('Przygotowanie listy plików', 'Prepare the file list'), approve: t('Zatwierdzenie zakresu', 'Approve the scope'), review: t('Sprawdzenie wybranych plików', 'Review selected files'), deps: t('Lista zależności projektu', 'Project dependency inventory'), web: t('Sprawdzenie zabezpieczeń strony', 'Check website protections') })[step.id] || step.label;
  const errorName = (error) => {
    const raw = String(error?.message || error);
    const code = raw.match(/CDA:\s*([A-Z_]+)/)?.[1] || raw;
    const map = {
      REVIEW_INTERRUPTED: t('Panel zamknięto podczas sprawdzenia. Możesz wznowić od przerwanego kroku.', 'The panel closed during the review. Resume from the interrupted step.'),
      INVALID_PROJECT_NAME: t('Wpisz nazwę projektu (1–80 znaków).', 'Enter a project name (1–80 characters).'),
      CHAT_BUSY: t('Codex już pracuje. Poczekaj na odpowiedź lub zatrzymaj bieżącą sesję.', 'Codex is already working. Wait for the response or stop the current session.'),
      SESSION_TIMEOUT: t('Sesja przekroczyła limit czasu. Możesz wznowić rozmowę.', 'The session timed out. You can resume the conversation.'),
      SESSION_INTERRUPTED: t('Sesja została przerwana restartem. Wznów rozmowę.', 'The session was interrupted by a restart. Resume the conversation.'),
      INVALID_MODEL: t('Wpisz poprawny identyfikator modelu lub pozostaw pole puste.', 'Enter a valid model ID or leave the field empty.'),
      REPORT_CHANGED: t('Podsumowanie zmieniło się od podglądu. Otwórz je ponownie i sprawdź przed wysłaniem.', 'The summary changed since preview. Open and review it again before sharing.'),
      INVALID_SESSION: t('Nie można wznowić tej sesji. Wybierz rozmowę z historii lub zacznij nową.', 'This session cannot be resumed. Select a saved conversation or start a new one.'),
      NO_SUPPORTED_REPORTS: t('Ten plik nie ma obsługiwanego podsumowania. Otwórz oryginalny raport.', 'This file has no supported summary. Open the original report.'),
      CONSENT_REQUIRED: t('Zaznacz zgodę, aby uruchomić to sprawdzenie.', 'Approve this review before starting.'),
      EXPLICIT_FILES_REQUIRED: t('Wpisz przynajmniej jeden plik do sprawdzenia.', 'Enter at least one file to review.'),
      INVALID_TARGET_PATH: t('Nie znaleźliśmy tego katalogu. Sprawdź jego ścieżkę.', 'That directory was not found. Check the path.'),
      INVALID_URL: t('Wpisz pełny adres, zaczynając od https://.', 'Enter a full address starting with https://.'),
      TARGET_UNREACHABLE: t('Nie udało się połączyć ze stroną. Sprawdź jej adres i dostępność, a następnie ponów sprawdzenie.', 'The website could not be reached. Check its address and availability, then retry the review.'),
      REDIRECT_HOST_NOT_AUTHORIZED: t('Strona przekierowuje do innego hosta. Potrzebny jest osobno zatwierdzony adres docelowy.', 'The website redirects to a different host. That destination needs separate authorization.'),
      SCOPE_PROPOSAL_CHANGED: t('Lista plików zmieniła się od zatwierdzenia. Przygotuj nowy zakres i sprawdź go ponownie.', 'The file scope changed after approval. Prepare and approve a new scope.'),
      NO_CHROMIUM_BROWSER_FOUND: t('Nie znaleźliśmy lokalnego Chrome ani Edge. Otwórz raport i wybierz Drukuj → Zapisz jako PDF.', 'No local Chrome or Edge was found. Open the report and choose Print → Save as PDF.'),
      PDF_PRINT_FAILED: t('Nie udało się utworzyć PDF. Spróbuj ponownie lub otwórz raport i wybierz Drukuj → Zapisz jako PDF.', 'The PDF could not be created. Try again or open the report and choose Print → Save as PDF.'),
      PDF_EXPORT_BUSY: t('Inny PDF jest właśnie tworzony. Spróbuj za chwilę.', 'Another PDF is being created. Please try again shortly.'),
      INVALID_SESSION_TOKEN: t('Panel został uruchomiony ponownie. Odśwież tę stronę.', 'The panel was restarted. Refresh this page.'),
    };
    return map[code] || t('Nie udało się wykonać działania. Sprawdź połączenie z panelem i spróbuj ponownie.', 'The action could not be completed. Check the panel connection and try again.');
  };
  async function request(url, data) {
    const response = await fetch(url, data === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CDA-Token': token }, body: JSON.stringify(data) });
    const body = await response.json();
    if (!response.ok || body.ok === false) throw new Error(body.error || body.session?.error || 'ACTION_FAILED');
    return body;
  }
  function notice(text) { $('notice').textContent = text; $('notice').hidden = !text; }
  function button(text, action, className = 'secondary') { const el = node('button', text, 'button ' + className); el.type = 'button'; el.onclick = async () => { el.disabled = true; try { await action(); } catch (error) { notice(errorName(error)); } finally { el.disabled = false; } }; return el; }
  function date(value) { const valueDate = new Date(value); return Number.isFinite(valueDate.getTime()) ? valueDate.toLocaleString(lang === 'pl' ? 'pl-PL' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : ''; }
  function showView(view) {
    if (!$('view-' + view)) view = 'overview';
    state.view = view;
    history.replaceState(null, '', '#' + view);
    for (const el of document.querySelectorAll('.view')) el.hidden = el.id !== 'view-' + view;
    for (const el of document.querySelectorAll('.nav-item[data-view]')) { const active = el.dataset.view === ({ start: 'projects', detail: 'projects', compare: 'reports', guide: 'overview' }[view] || view); el.classList.toggle('active', active); if (active) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); }
    $('view-label').textContent = ({ overview: t('Przegląd', 'Overview'), start: t('Nowe sprawdzenie', 'New review'), reports: t('Moje raporty', 'My reports'), guide: t('Jak to działa', 'How it works'), agents: t('Ustawienia agenta', 'Agent settings') })[view];
    if (view === 'overview') $('view-label').textContent = t('Start', 'Home');
    if (view === 'projects') {
      $('view-label').textContent = t('Projekty', 'Projects');
      renderProjects();
      loadProjectHistory();
    }
    if (view === 'detail') {
      $('view-label').textContent = t('Szczegóły wyniku', 'Review details');
      $('review-detail').append($('active-run-box'));
    }
    if (view === 'agents') refreshBridge();
    if (view === 'terminal') {
      $('view-label').textContent = 'Agent';
      if (chatSessionId) loadStatus();
    }
    if (view === 'compare') { $('view-label').textContent = t('Porównaj wyniki', 'Compare results'); loadCatalog().catch(error => notice(errorName(error))); }
    if (view === 'terminal') $('terminal-workflow').append($('active-run-box'));
    if (view === 'start') $('view-start').append($('active-run-box'));
    renderActiveRun();
  }
  document.querySelectorAll('[data-view]').forEach((el) => el.onclick = () => { if (el.dataset.view === 'compare') comparisonProject = undefined; showView(el.dataset.view); $('main').focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); });
  for (const trigger of document.querySelectorAll('[data-connection]')) trigger.onclick = () => {
    showView('agents');
    $('connection-settings').open = true;
    $('codex-check').focus();
  };
  const configurations = {
    demo: [t('BEZPIECZNY PIERWSZY KROK', 'A SAFE FIRST STEP'), t('Zobacz przykład od początku do końca.', 'See a complete example.'), t('Demo pracuje na przykładowych danych. Nie sprawdza Twoich plików ani komputera.', 'The demo uses sample data. It does not inspect your files or computer.'), '', t('Uruchom demo', 'Run demo')],
    web: [t('TWOJA STRONA', 'YOUR WEBSITE'), t('Sprawdź podstawowe zabezpieczenia.', 'Review basic website protections.'), t('Sprawdzimy HTTPS, nagłówki i ustawienia cookies. Bez logowania, ataków ani skanowania całej witryny.', 'We will check HTTPS, headers and cookie settings. No login, attacks or site crawling.'), t('Mam prawo sprawdzić tę stronę i zgadzam się na wysłanie do niej zwykłych zapytań.', 'I am authorized to review this website and approve ordinary requests to it.'), t('Sprawdź stronę', 'Review website')],
    project: [t('WYBRANE PLIKI', 'SELECTED FILES'), t('Sprawdź konkretny zakres projektu.', 'Review a specific project scope.'), t('Przejrzymy tylko wskazane pliki. Pokażemy dokładną listę przed ich odczytem. Kod projektu nie będzie uruchamiany.', 'Only listed files will be reviewed. You will see the exact list before reading. Project code will not be executed.'), t('Mam prawo sprawdzić ten projekt. Przygotuj zakres do mojego zatwierdzenia.', 'I am authorized to review this project. Prepare the scope for my approval.'), t('Przygotuj sprawdzenie', 'Prepare review')],
    pc: [t('TEN KOMPUTER', 'THIS COMPUTER'), t('Zacznij od listy programów.', 'Start with your software inventory.'), t('Odczytamy obsługiwane programy i nasłuchujące porty TCP. W kolejnym kroku osobno zapytamy o zgodę na sprawdzenie znanych luk.', 'We will list supported software and listening TCP ports. A separate permission is required to look up known vulnerabilities.'), t('Zgadzam się na lokalny odczyt listy programów i portów tego komputera.', 'I approve reading this computer’s local software and port inventory.'), t('Sprawdź komputer', 'Review computer')],
  };
  function selectWorkflow(workflow) {
    state.workflow = workflow;
    document.querySelectorAll('[data-workflow]').forEach(el => { const selected = el.dataset.workflow === workflow; el.classList.toggle('selected', selected); el.setAttribute('aria-pressed', String(selected)); });
    const c = configurations[workflow];
    $('selection-tag').textContent = c[0]; $('selection-title').textContent = c[1]; $('selection-description').textContent = c[2]; $('consent-label').textContent = c[3];
    $('start-workflow-btn').replaceChildren(node('span', c[4]), node('span', '→'));
    $('target-field').hidden = !['web', 'project'].includes(workflow); $('files-field').hidden = workflow !== 'project'; $('workflow-consent').hidden = workflow === 'demo';
    $('target-label').textContent = workflow === 'web' ? t('Adres strony', 'Website URL') : t('Katalog projektu', 'Project directory');
    $('target-help').textContent = workflow === 'web' ? t('Pełny adres Twojej strony, np. https://twoja-strona.pl.', 'Your full website address, e.g. https://your-site.example.') : t('Pełna ścieżka do folderu na tym komputerze.', 'The full path to a folder on this computer.');
    $('wf-target').placeholder = workflow === 'web' ? 'https://twoja-strona.pl' : t('np. C:\\Projekty\\moja-aplikacja', 'e.g. C:\\Projects\\my-app');
    $('wf-target').value = ''; $('consent-check').checked = false; $('form-error').hidden = true;
    $('action-note').textContent = workflow === 'demo' ? t('Bez konta. Bez zmieniania Twoich plików.', 'No account. No changes to your files.') : t('Tylko odczyt. Zmiany wymagają Twojej decyzji.', 'Read-only. Changes need your decision.');
  }
  document.querySelectorAll('[data-workflow]').forEach(el => el.onclick = () => selectWorkflow(el.dataset.workflow));
  document.querySelectorAll('[data-start]').forEach(el => el.onclick = () => { selectWorkflow(el.dataset.start); showView('start'); $('main').focus(); window.scrollTo({ top: 0, behavior: 'instant' }); });
  function updateStartButton() { $('start-workflow-btn').disabled = state.busy || state.offline || state.runs.some(run => run.workflow === state.workflow && run.status === 'running'); }
  $('review-form').onsubmit = async (event) => {
    event.preventDefault(); if ($('start-workflow-btn').disabled) return;
    const target = $('wf-target').value.trim(); const files = $('wf-files').value.split('\n').map(file => file.trim()).filter(Boolean);
    let error;
    if (state.workflow !== 'demo' && !$('consent-check').checked) error = new Error('CONSENT_REQUIRED');
    else if (state.workflow === 'project' && !target) error = new Error('INVALID_TARGET_PATH');
    else if (state.workflow === 'project' && !files.length) error = new Error('EXPLICIT_FILES_REQUIRED');
    else if (state.workflow === 'web') { try { const url = new URL(target); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error(); } catch { error = new Error('INVALID_URL'); } }
    if (error) { $('form-error').textContent = errorName(error); $('form-error').hidden = false; return; }
    state.busy = true; updateStartButton(); $('form-error').hidden = true; notice('');
    try {
      const data = await request('/api/workflows/start', { workflow: state.workflow, projectId: state.projectId, target, files, consent: $('consent-check').checked, lang });
      state.activeRunId = data.run.runId; sessionStorage.setItem('cda-active-run', data.run.runId); state.runs.unshift(data.run); openRun(data.run);
      $('active-run-box').scrollIntoView({ behavior: 'smooth', block: 'start' });
      await loadStatus();
    } catch (error) { $('form-error').textContent = errorName(error); $('form-error').hidden = false; }
    finally { state.busy = false; updateStartButton(); }
  };
  function reportLink(name, label) { const el = node('a', label || name, 'button secondary'); el.href = '/report/' + encodeURIComponent(name); el.target = '_blank'; el.rel = 'noopener'; return el; }
  function reportActions(name, label) { const el = node('div', undefined, 'form-actions'); el.append(reportLink(name, label || t('Otwórz raport', 'Open report')), button(t('Pobierz PDF', 'Download PDF'), () => openPdf(name), 'primary'), button(t('Wyjaśnij mi to', 'Explain this'), () => openBrief(name))); return el; }
  const reportNames = run => (run.reports || []).filter(name => name.endsWith('.html') && name !== 'dashboard.html');
  function technical(run) {
    const details = node('details', undefined, 'advanced'); details.append(node('summary', t('Szczegóły techniczne', 'Technical details')));
    details.append(node('p', run.runId, 'quiet'));
    for (const step of run.steps || []) { const section = node('details'); section.append(node('summary', stepName(step)), node('pre', step.output || step.error || statusName(step.status))); details.append(section); }
    return details;
  }
  async function runAction(action, run, extra = {}) { await request('/api/workflows/' + action, { runId: run.runId, ...extra }); delete signatures.active; await loadStatus(); }
  async function reveal(card, runId) {
    if (animated.has(runId) || state.view !== 'start' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    animated.add(runId);
    try { const runtime = await import('/assets/vendor/ui-generation.js'); await document.fonts.ready; if (!card.isConnected) return; generation?.cancel(); generation = runtime.generate(card, { mode: 'skeleton', variant: 'ui' }); } catch { /* The finished result stays usable when optional animation is unavailable. */ }
  }
  function renderActiveRun() {
    const id = state.view === 'terminal' ? conversationContext().reviewId : state.activeRunId;
    const run = state.runs.find(item => item.runId === id) || (retainedRun?.runId === id ? retainedRun : null);
    if (!run) { $('active-run-box').hidden = true; signatures.active = null; return; }
    const signature = JSON.stringify(run); if (signatures.active === signature) return; signatures.active = signature;
    generation?.cancel();
    const box = $('active-run-box'); box.hidden = false; box.replaceChildren();
    const header = node('div', undefined, 'result-header'); const heading = node('div'); const title = node('h2', t('Twoje sprawdzenie', 'Your review')); title.id = 'result-title'; heading.append(title, node('span', workflowName(run.workflow) + ' · ' + date(run.createdAt), 'quiet')); header.append(heading, node('span', statusName(run.status), 'status ' + run.status)); box.append(header);
    const card = node('div', undefined, 'result-card'); const completed = run.status === 'completed';
    card.append(node('h3', completed ? t('Raport jest gotowy.', 'Your report is ready.') : run.status === 'awaiting_approval' ? t('Następny krok należy do Ciebie.', 'The next step is yours.') : run.status === 'running' ? t('Sprawdzamy wybrany zakres.', 'Reviewing the selected scope.') : t('Zatrzymaliśmy się na tym kroku.', 'We stopped at this step.')));
    if (completed) {
      card.append(button(t('Omów wynik z agentem', 'Discuss this review'), () => startConversation(run.projectId || '', run.runId)));
      card.append(node('p', run.workflow === 'demo' ? t('To przykład: wykryliśmy starą wersję biblioteki, a potem potwierdziliśmy poprawkę. Twoje pliki pozostały bez zmian.', 'This is a sample: an outdated library was detected and the fix was verified. Your own files were not changed.') : t('Otwórz raport, żeby zobaczyć ustalenia, zakres sprawdzenia i zalecane działania.', 'Open the report to see findings, coverage and recommended actions.')));
      if (run.workflow !== 'demo' && run.findingsSummary?.counts) { const metrics = node('div', undefined, 'result-metrics'); const counts = run.findingsSummary.counts; for (const [value, label] of [[(counts.P0 || 0) + (counts.P1 || 0), t('Pilne ustalenia', 'High priority')], [(counts.P2 || 0) + (counts.P3 || 0), t('Pozostałe ustalenia', 'Other findings')]]) { const metric = node('div'); metric.append(node('strong', String(value)), node('span', label)); metrics.append(metric); } card.append(metrics); }
      for (const name of reportNames(run)) card.append(reportActions(name, name.includes('after-report') ? t('Raport po poprawce', 'Report after the fix') : run.workflow === 'demo' ? t('Raport przed poprawką', 'Report before the fix') : t('Otwórz raport', 'Open report')));
      if (!reportNames(run).length) card.append(node('p', t('Nie ma jeszcze raportu do pobrania. Sprawdź szczegóły poniżej.', 'No downloadable report is available yet. Check the details below.')));
      card.append(node('p', t('Brak ustaleń nie jest gwarancją bezpieczeństwa. Raport pokazuje też obszary niesprawdzone.', 'No findings is not a guarantee of security. The report also lists unchecked areas.'), 'quiet'));
    }
    const steps = node('ol', undefined, 'progress-list');
    for (const step of run.steps || []) { const row = node('li', undefined, step.status); row.append(node('span', step.status === 'completed' ? '✓' : step.status === 'running' ? '•' : '−', 'step-symbol'), node('span', stepName(step), 'step-copy'), node('span', statusName(step.status), 'step-label')); steps.append(row); }
    if (!completed) card.append(steps);
    if (run.pendingApproval) {
      const approval = run.pendingApproval; const area = node('div', undefined, 'approval');
      area.append(node('p', approval.kind === 'scope' ? t('Zatwierdź odczyt dokładnie tych plików:', 'Approve reading exactly these files:') : t('Czy możemy wysłać nazwy, wersje i ekosystemy pakietów do OSV.dev oraz pobrać publiczną listę CISA KEV?', 'May we send package names, versions and ecosystems to OSV.dev and download the public CISA KEV list?')));
      if (approval.kind === 'scope') area.append(node('pre', approval.root + '\n' + approval.files.join('\n')));
      area.append(button(t('Zatwierdź ten krok', 'Approve this step'), () => runAction('approve', run, { approvalToken: approval.token }), 'primary')); card.append(area);
    }
    if (['failed', 'cancelled'].includes(run.status)) { card.append(node('p', run.error ? errorName(run.error) : t('Możesz kontynuować od przerwanego kroku.', 'You can continue from the interrupted step.'))); card.append(button(t('Spróbuj ponownie', 'Try again'), () => runAction('resume', run), 'primary')); }
    if (['running', 'awaiting_approval'].includes(run.status)) card.append(button(t('Zatrzymaj sprawdzenie', 'Stop review'), () => runAction('cancel', run), 'secondary'));
    box.append(card, technical(run)); if (completed) reveal(card, run.runId);
    document.querySelectorAll('.journey li').forEach((el, i) => el.classList.toggle('current', i === (completed ? 2 : 1)));
  }
  function titleForReport(name) {
    if (name.startsWith('comparison-')) return t('Porównanie wyników', 'Result comparison');
    if (name.includes('after-report') || name.includes('retest')) return t('Wynik po poprawce', 'Result after the fix');
    const run = state.runs.find(item => (item.reports || []).includes(name));
    if (run) return workflowName(run.workflow);
    if (name.startsWith('demo')) return t('Raport demonstracyjny', 'Demo report');
    return name.replace(/\.html$/, '');
  }
  function renderReports() {
    const signature = JSON.stringify([state.runs, state.reports]); if (signatures.reports === signature) return; signatures.reports = signature;
    const history = $('runs-history'); history.replaceChildren();
    for (const run of state.runs.slice(0, 12)) { const row = node('div', undefined, 'history-row'); const copy = node('div'); const select = node('button', workflowName(run.workflow), 'history-button'); select.type = 'button'; select.onclick = () => openRun(run); copy.append(select, node('div', date(run.createdAt) + (run.target ? ' · ' + run.target : ''), 'quiet')); row.append(copy, node('span', statusName(run.status), 'status ' + run.status)); history.append(row); }
    if (!state.runs.length) history.append(node('p', t('Jeszcze niczego nie sprawdzano. Zacznij od demo.', 'No reviews yet. Start with the demo.'), 'empty-state'));
    const box = $('reports-list'); box.replaceChildren(); const raw = $('raw-reports'); raw.replaceChildren();
    const reports = state.reports.filter(report => report.ext === 'html' && report.name !== 'dashboard.html');
    for (const report of reports) { const row = node('article', undefined, 'report-row'); const copy = node('div'); copy.append(node('h3', titleForReport(report.name)), node('p', date(report.updatedAt), 'quiet')); row.append(copy, reportActions(report.name)); box.append(row); }
    if (!reports.length) box.append(node('p', t('Tutaj pojawią się raporty gotowe do otwarcia i pobrania.', 'Reports ready to open and download will appear here.'), 'empty-state'));
    state.reports.filter(report => report.ext !== 'html').forEach(report => { const link = node('a', report.name); link.href = '/report/' + encodeURIComponent(report.name); link.target = '_blank'; link.rel = 'noopener'; raw.append(link); });
  }
  function openRun(run) {
    retainedRun = run;
    state.activeRunId = run.runId;
    sessionStorage.setItem('cda-active-run', run.runId);
    selectProject(run.projectId || '');
    showView('detail');
    $('main').focus();
    window.scrollTo(0, 0);
  }
  function renderOverview() {
    const reports = state.reports.filter(report => report.ext === 'html' && report.name !== 'dashboard.html');
    const signature = JSON.stringify([state.runs, reports]); if (signatures.overview === signature) return; signatures.overview = signature;
    const metrics = $('overview-metrics'); metrics.replaceChildren();
    for (const [label, value, hint] of [
      [t('Zapisane sprawdzenia', 'Saved reviews'), state.runs.length, t('Ostatnie 25 uruchomień', 'Latest 25 runs')],
      [t('W trakcie', 'In progress'), state.runs.filter(run => run.status === 'running').length, t('Uruchomione kontrole', 'Running checks')],
      [t('Wymaga zgody', 'Awaiting approval'), state.runs.filter(run => run.status === 'awaiting_approval').length, t('Decyzja należy do Ciebie', 'Your decision comes next')],
      [t('Raporty w historii', 'Reports in history'), reports.length, t('Wśród ostatnich plików', 'Among recent files')],
    ]) { const metric = node('div', undefined, 'overview-metric'); metric.append(node('span', label), node('strong', String(value)), node('small', hint), node('i', undefined, 'metric-mark')); metrics.append(metric); }
    const latest = state.runs[0];
    const done = latest?.steps?.filter(step => step.status === 'completed').length || 0, total = latest?.steps?.length || 0;
    const percent = total ? Math.round(done / total * 100) : null;
    $('overview-progress').textContent = percent === null ? '—' : percent + '%';
    $('overview-progress-label').textContent = total ? `${done} / ${total} ` + t('ukończonych kroków', 'steps completed') : t('Uruchom pierwsze sprawdzenie', 'Start your first review');
    $('overview-run-kind').textContent = latest?.workflow === 'demo' ? 'DEMO' : latest ? workflowName(latest.workflow) : '';
    $('gauge-progress').setAttribute('stroke-dasharray', `${percent || 0} 100`);
    $('overview-run-status').textContent = latest ? statusName(latest.status) + ' · ' + date(latest.createdAt) : t('Twoje wyniki pojawią się tutaj.', 'Your results will appear here.');
    $('overview-open-run').hidden = !latest; $('overview-open-run').onclick = () => latest && openRun(latest);
    const latestResult = state.runs.find(run => run.status === 'completed' && run.findingsSummary?.counts);
    const priorities = $('overview-priorities'); priorities.replaceChildren();
    if (!latestResult) priorities.append(node('p', t('Brak wyniku z oceną priorytetów. Rozpocznij sprawdzenie, aby zobaczyć ustalenia.', 'No result with priority counts yet. Run a review to see the findings.'), 'priority-note'));
    else {
      const counts = latestResult.findingsSummary.counts; const max = Math.max(1, ...['P0','P1','P2','P3'].map(key => counts[key] || 0));
      for (const [key,label] of [['P0',t('Krytyczne','Critical')],['P1',t('Wysokie','High')],['P2',t('Średnie','Medium')],['P3',t('Niskie','Low')]]) { const row = node('div', undefined, 'priority-row'); const bar = node('div'); const fill = node('i'); fill.style.width = `${(counts[key] || 0) / max * 100}%`; bar.append(fill); row.append(node('span', `${key} · ${label}`),bar,node('strong',String(counts[key] || 0))); priorities.append(row); }
      priorities.append(node('p', (latestResult.workflow === 'demo' ? t('Demo · wynik po poprawce', 'Demo · result after the fix') : workflowName(latestResult.workflow)) + ' · ' + date(latestResult.createdAt), 'priority-note'));
      if (latestResult.findingsSummary.verdict === 'incomplete') priorities.append(node('p', t('Niepełne pokrycie. Sprawdź ograniczenia w raporcie.', 'Incomplete coverage. See the report limitations.'), 'priority-note coverage-gap'));
    }
    const activity = $('overview-activity'); activity.replaceChildren();
    for (const run of state.runs.slice(0, 5)) { const row = node('div',undefined,'activity-row'); const name = node('strong',workflowName(run.workflow)); if(run.workflow==='demo') name.append(node('span','DEMO','demo-label')); row.append(name,node('span',date(run.createdAt)),node('span',statusName(run.status),'status '+run.status)); const open = node('button', t('Otwórz','Open')+' ↗','text-button'); open.type='button';open.onclick=()=>openRun(run);row.append(open);activity.append(row); }
    if (!state.runs.length) activity.append(node('p',t('Nie ma jeszcze historii. Wypróbuj demo lub wybierz swój obszar sprawdzenia.','No history yet. Try the demo or select your review area.'),'empty-state'));
  }
  function renderSessions() {
    const signature = JSON.stringify(state.sessions); if (signatures.sessions === signature) return; signatures.sessions = signature;
    const box = $('agent-sessions-box'); box.replaceChildren();
    for (const session of state.sessions.slice(0, 3)) { const article = node('article', undefined, 'session'); article.append(node('h3', session.hostName + ' · ' + statusName(session.status)));
      if (session.authHint) article.append(node('p', session.authHint, 'error-text'));
      else if (session.status === 'failed') article.append(node('p', t('Agent nie ukończył zadania. Sprawdź szczegóły sesji lub skopiuj zadanie do jego aplikacji.', 'The agent did not finish the task. Check session details or copy the task into its app.'), 'error-text'));
      const details = node('details', undefined, 'advanced'); details.append(node('summary', t('Przebieg sesji', 'Session details')), node('pre', session.output || t('Oczekiwanie na odpowiedź…', 'Waiting for a response…'))); article.append(details);
      if (!session.endedAt) article.append(button(t('Zatrzymaj sesję', 'Stop session'), async () => { await request('/api/agent-sessions/stop', { sessionId: session.sessionId }); await loadStatus(); })); box.append(article);
    }
  }
  function loadStatus() {
    refreshQueued = true;
    if (!statusFlight) {
      statusFlight = (async () => {
        while (refreshQueued) {
          refreshQueued = false;
          await readStatus();
        }
      })().finally(() => { statusFlight = null; });
    }
    return statusFlight;
  }
  async function readStatus() {
    try { const data = await request('/api/status?session=' + encodeURIComponent(chatSessionId || '')); Object.assign(state, { projects: data.projects || [], runs: data.runs || [], reports: data.reports || [], agents: data.agents || {}, sessions: data.sessions || [], offline: false }); $('connection').textContent = t('Połączono lokalnie', 'Connected locally'); $('connection').classList.remove('offline');
      renderProjects(); renderActiveRun(); renderReports(); renderOverview(); renderSessions(); updateAgentState(); renderChat();
    } catch { state.offline = true; $('connection').textContent = t('Brak połączenia · ponawiamy', 'Disconnected · retrying'); $('connection').classList.add('offline'); }
    finally {
      updateStartButton();
      renderChat();
      clearTimeout(statusTimer);
      const busy = chatSending || state.sessions.some(s => s.status === 'running') || state.runs.some(run => run.status === 'running');
      if (!document.hidden) statusTimer = setTimeout(loadStatus, busy ? 1000 : 8000);
    }
  }
  function updateAgentState() { const agent = state.agents[$('agent-host').value]; $('agent-state').textContent = agent?.installed ? t('Gotowy do uruchomienia', 'Ready to start') + (agent.version ? ' · ' + agent.version : '') : t('Nie wykryto lokalnego programu. Możesz skopiować zadanie do swojego agenta.', 'No local executable found. You can copy the task into your agent.'); $('launch-agent-btn').disabled = !agent?.installed || state.offline; }
  async function refreshBridge() { const sequence = ++bridgeSequence; try { const params = new URLSearchParams({ host: $('agent-host').value, mission: $('mission-select').value, target: $('target-input').value, lang }); const data = await request('/api/bridge?' + params); if (sequence !== bridgeSequence) return; state.bridge = data; $('bridge-command').textContent = data.cliCommand + '\n\n' + data.prompt; updateAgentState(); } catch (error) { state.bridge = null; notice(errorName(error)); } }
  $('agent-host').onchange = refreshBridge; $('mission-select').onchange = refreshBridge; $('target-input').onchange = refreshBridge;
  async function copy(kind) { try { await refreshBridge(); if (!state.bridge) return; await navigator.clipboard.writeText(state.bridge[kind]); notice(t('Skopiowano do schowka.', 'Copied to clipboard.')); } catch { notice(t('Schowek jest niedostępny. Rozwiń szczegóły i skopiuj tekst ręcznie.', 'Clipboard is unavailable. Expand the details and copy the text manually.')); } }
  $('copy-prompt').onclick = () => copy('prompt'); $('copy-command').onclick = () => copy('cliCommand');
  $('launch-agent-btn').onclick = async () => { const el = $('launch-agent-btn'); el.disabled = true; try { await request('/api/launch-agent', { host: $('agent-host').value, mission: $('mission-select').value, target: $('target-input').value, lang }); notice(t('Zadanie przekazane. Przebieg sesji znajdziesz poniżej.', 'Task sent. Session details are below.')); await loadStatus(); } catch (error) { notice(errorName(error)); } finally { updateAgentState(); } };
  function openPdf(name) { if (state.pdf?.busy) return; state.pdf = { name, busy: false }; $('pdf-name').textContent = titleForReport(name); $('pdf-status').textContent = ''; $('pdf-confirm').hidden = false; $('pdf-confirm').disabled = false; $('pdf-download').hidden = true; $('pdf-fallback').hidden = true; $('pdf-fallback').href = '/report/' + encodeURIComponent(name); $('pdf-dialog').showModal(); }
  $('pdf-dialog').addEventListener('cancel', event => { if (state.pdf?.busy) event.preventDefault(); });
  $('pdf-dialog').querySelector('form').onsubmit = event => { if (state.pdf?.busy) event.preventDefault(); };
  $('pdf-confirm').onclick = async () => {
    if (!state.pdf || state.pdf.busy) return; state.pdf.busy = true; $('pdf-confirm').disabled = true; $('pdf-status').textContent = t('Tworzymy PDF. To może potrwać kilkanaście sekund…', 'Creating your PDF. This may take a few moments…');
    try { const data = await request('/api/reports/pdf', { report: state.pdf.name, consent: true }); $('pdf-download').href = '/report/' + encodeURIComponent(data.name) + '?download=1'; $('pdf-download').download = data.name; $('pdf-download').hidden = false; $('pdf-confirm').hidden = true; $('pdf-status').textContent = t('Gotowe. Twój PDF można już pobrać.', 'Ready. Your PDF can now be downloaded.'); $('pdf-download').focus(); await loadStatus(); }
    catch (error) { $('pdf-status').textContent = errorName(error); $('pdf-fallback').hidden = false; }
    finally { state.pdf.busy = false; $('pdf-confirm').disabled = false; }
  };
  let chatSessionId = localStorage.getItem('cda-chat-session') || sessionStorage.getItem('cda-chat-session'), chatSending = false;
  let catalog = [], planWorkflow = 'demo', briefLoading = false;
  const saveChatSelection = id => { chatSessionId = id; if (id) { localStorage.setItem('cda-chat-session', id); sessionStorage.setItem('cda-chat-session', id); } else { localStorage.removeItem('cda-chat-session'); sessionStorage.removeItem('cda-chat-session'); } };
  function richText(text) {
    const wrap = node('div', undefined, 'message-content');
    const pieces = String(text).split(/```[^\n]*\n([\s\S]*?)```/g);
    pieces.forEach((piece, index) => {
      if (index % 2) { const code = node('pre'); code.append(node('code', piece)); wrap.append(code, button(t('Kopiuj kod', 'Copy code'), async () => { try { await navigator.clipboard.writeText(piece); notice(t('Kod skopiowany.', 'Code copied.')); } catch { notice(t('Zaznacz kod i skopiuj ręcznie.', 'Select and copy the code manually.')); } })); }
      else { const paragraph = node('p'); for (const [i, part] of piece.split(/\*\*([^*]+)\*\*/g).entries()) paragraph.append(i % 2 ? node('strong', part) : document.createTextNode(part)); wrap.append(paragraph); }
    }); return wrap;
  }
  function renderChatHistory() {
    const latest = new Map();
    for (const session of state.sessions.filter(item => item.chat)) {
      const id = session.conversationId || session.sessionId;
      if (!latest.has(id)) latest.set(id, session);
    }
    const query = $('chat-search').value.trim().toLocaleLowerCase();
    const sessions = [...latest.values()].filter(item =>
      Boolean(item.archived) === $('chat-archived').checked && item.title.toLocaleLowerCase().includes(query));
    const signature = JSON.stringify(sessions.map(item => [item.sessionId, item.title]));
    if (signatures.chatHistory !== signature) {
      signatures.chatHistory = signature;
      const select = $('chat-history');
      select.replaceChildren(new Option(t('Wybierz rozmowę', 'Select conversation'), ''));
      for (const session of sessions) select.add(new Option(session.title + ' · ' + date(session.startedAt), session.sessionId));
    }
    $('chat-history').value = chatSessionId || '';
  }
  $('chat-search').oninput = renderChatHistory;
  $('chat-archived').onchange = renderChatHistory;
  $('chat-archive').onclick = async () => {
    const session = state.sessions.find(item => item.sessionId === chatSessionId);
    if (!session) return;
    try {
      await request('/api/conversations/archive', { sessionId: chatSessionId, archived: !session.archived });
      await loadStatus();
    } catch (error) { notice(errorName(error)); }
  };
  function renderChat() {
    renderChatHistory();
    const session = state.sessions.find(item => item.sessionId === chatSessionId);
    const context = conversationContext();
    const review = state.runs.find(run => run.runId === context.reviewId) || (retainedRun?.runId === context.reviewId ? retainedRun : null);
    const summary = [projectName(context.projectId), review ? workflowName(review.workflow) + ' · ' + statusName(review.status) : '', context.report ? t('Udostępniono podsumowanie raportu', 'Report summary shared') : ''];
    $('chat-context').textContent = summary.filter(Boolean).join(' / ');
    $('chat-archive').disabled = !session || session.status === 'running';
    $('chat-archive').textContent = session?.archived ? t('Przywróć z archiwum', 'Restore conversation') : t('Archiwizuj', 'Archive conversation');
    const running = chatSending || session?.status === 'running';
    $('chat-send').disabled = running || state.offline || !state.agents.codex?.installed;
    $('chat-stop').hidden = session?.status !== 'running';
    $('chat-new').disabled = running;
    $('chat-rename').disabled = running || !session;
    $('chat-history').disabled = chatSending;
    const elapsed = session ? Math.max(0, Math.floor(((session.endedAt ? Date.parse(session.endedAt) : Date.now()) - Date.parse(session.startedAt)) / 1000)) : 0;
    $('terminal-status').textContent = state.offline ? t('Brak połączenia', 'Offline') : !state.agents.codex?.installed ? t('Zainstaluj Codex CLI', 'Install Codex CLI') : running ? t('Codex pracuje…', 'Codex is working…') : session ? statusName(session.status) : t('Gotowy', 'Ready');
    document.querySelector('.cyber-terminal').classList.toggle('is-working', Boolean(running));
    if (session) $('terminal-status').textContent += ' · ' + elapsed + 's' + (running ? ' · ' + ({starting:t('Łączenie','Connecting'),thinking:t('Analiza','Thinking'),tool:t('Narzędzie','Tool'),complete:t('Kończenie','Finishing')}[session.phase] || '') : '');
    const signature = JSON.stringify(session || null); if (signatures.chat === signature) return; signatures.chat = signature;
    const box = $('chat-output'); const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80; box.replaceChildren();
    if (!session) { const welcome = node('div', undefined, 'terminal-welcome'); welcome.append(node('span', '>_', 'terminal-symbol'), node('h2', t('Od czego zaczynamy?', 'What would you like to review?')), node('p', t('Codex korzysta ze skilla Cyber Defense. Zapytaj o bezpieczeństwo, interpretację wyniku lub plan sprawdzenia.', 'Codex uses the Cyber Defense skill. Ask about security, interpreting a result or planning a review.'))); box.append(welcome); return; }
    if (!session.conversation) {
      box.append(node('p', t('Wczytywanie rozmowy…', 'Loading conversation…'), 'quiet'));
      return;
    }
    for (const message of session.conversation || []) { const article = node('article', undefined, 'chat-message ' + message.role); article.append(node('span', message.role === 'user' ? t('TY', 'YOU') : 'CODEX / CYBER DEFENSE', 'chat-author'), richText(message.text)); box.append(article); }
    const answer = node('article', undefined, 'chat-message assistant'); answer.append(node('span', 'CODEX / CYBER DEFENSE', 'chat-author'), node('p', session.answer || session.authHint || session.error || (running ? t('Analizuję Twoje pytanie…', 'Analyzing your question…') : t('Brak odpowiedzi. Sprawdź dziennik lub ponów wiadomość.', 'No response. Check the log or retry your message.')))); box.append(answer);
    const details = node('details', undefined, 'terminal-log'); details.append(node('summary', t('Dziennik Codex CLI', 'Codex CLI log')), node('pre', session.output || '…')); box.append(details);
    const response = answer.querySelector('p'); response.replaceWith(richText(response.textContent));
    if (session.status === 'failed' || session.status === 'auth_error' || session.status === 'cancelled') box.append(button(t('Wznów rozmowę', 'Resume conversation'), () => { $('chat-message').value = t('Kontynuuj od ostatniego pytania. Nie powtarzaj zakończonych działań.', 'Continue from the last question. Do not repeat completed actions.'); $('chat-message').focus(); }));
    if (nearBottom) box.scrollTop = box.scrollHeight;
  }
  $('chat-form').onsubmit = async event => {
    event.preventDefault(); const message = $('chat-message').value.trim(); if (!message || $('chat-send').disabled) return;
    const wantsReview = /^(sprawd[zź]|przeanalizuj|scan|review|check)(?:\s|$)/i.test(message);
    if (wantsReview) { const kind = /komputer|computer|machine/i.test(message) ? 'pc' : /stron|website|https?:/i.test(message) ? 'web' : /demo/i.test(message) ? 'demo' : 'project'; preparePlan(kind); const url = message.match(/https?:\/\/\S+/)?.[0]; if (url) $('chat-plan-target').value = url; return; }
    const parent = state.sessions.find(item => item.sessionId === chatSessionId);
    chatSending = true; renderChat();
    try { const result = await request('/api/launch-agent', { host: 'codex', message, consent: true, projectId: conversationContext().projectId, reviewId: conversationContext().reviewId, lang, model: $('codex-model').value.trim(), ...(parent && parent.status !== 'running' ? { parentId: parent.sessionId } : {}) }); saveChatSelection(result.session.sessionId); $('chat-message').value = ''; await loadStatus(); }
    catch (error) { notice(errorName(error)); }
    finally { chatSending = false; renderChat(); }
  };
  $('chat-message').onkeydown = event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('chat-form').requestSubmit(); } };
  $('chat-stop').onclick = async () => { try { await request('/api/agent-sessions/stop', { sessionId: chatSessionId }); await loadStatus(); } catch(error) { notice(errorName(error)); } };
  $('chat-new').onclick = () => startConversation(state.projectId);
  $('chat-history').onchange = () => { saveChatSelection($('chat-history').value || null); const selected = state.sessions.find(item=>item.sessionId===chatSessionId); $('chat-title').value=selected?.title || ''; $('codex-model').value=selected?.model || ''; $('chat-plan').hidden = true; renderChat(); renderActiveRun(); loadStatus(); };
  $('chat-rename').onclick = async () => { try { await request('/api/conversations/rename',{sessionId:chatSessionId,title:$('chat-title').value}); await loadStatus(); } catch(error) { notice(errorName(error)); } };
  $('codex-check').onclick = async () => { $('codex-check').disabled=true; $('codex-health').textContent=t('Sprawdzam lokalne CLI…','Checking local CLI…'); try { const health=await request('/api/codex/check',{consent:true}); $('codex-health').textContent=(health.authenticated?t('Połączono i zalogowano','Connected and signed in'):health.installed?t('CLI jest dostępne. Sprawdź logowanie: codex login','CLI available. Check sign-in: codex login'):t('Nie znaleziono Codex CLI w PATH.','Codex CLI was not found in PATH.'))+' · '+(health.version || '')+' · '+date(health.checkedAt); await loadStatus(); } catch(error) { $('codex-health').textContent=errorName(error); } finally { $('codex-check').disabled=false; } };
  $('project-compare').onclick = () => {
    comparisonProject = state.projectId;
    showView('compare');
  };
  let catalogRequest = 0;
  async function loadCatalog() {
    const seq = ++catalogRequest;
    $('compare-result').replaceChildren();
    $('compare-form').querySelector('button').disabled = true;
    const query = comparisonProject === undefined ? '' : '?project=' + encodeURIComponent(comparisonProject);
    const result = await request('/api/report-catalog' + query);
    if (seq !== catalogRequest) return;
    catalog = (result.reports || []).filter(item => item.comparable);
    $('compare-form').querySelector('button').disabled = catalog.length < 2;
    $('compare-error').textContent = catalog.length < 2 ? t('Potrzebujesz dwóch porównywalnych zapisanych wyników.', 'Two comparable saved results are required.') : '';
    for (const id of ['compare-before','compare-after']) { const select=$(id), prior=select.value; select.replaceChildren(); for(const report of catalog.filter(item=>item.comparable)){const option=node('option',sourceLabel(report));option.value=report.name;select.append(option);} if(prior)select.value=prior; }
    if (!$('compare-after').value && catalog.length) $('compare-after').selectedIndex=0;
    if ($('compare-before').value === $('compare-after').value) {
      const before=catalog.find(item=>item.comparable && item.name.endsWith('-before'));
      const after=before && catalog.find(item=>item.comparable && item.name===before.name.replace(/-before$/,'-after'));
      if(before && after){$('compare-before').value=before.name;$('compare-after').value=after.name;}
    }
  }
  function sourceLabel(report) {
    const kind = /demo/.test(report.name) ? 'Demo' : t('Raport', 'Report');
    const suffix = report.name.endsWith('-before') ? t('przed poprawką','before fix') : report.name.endsWith('-after') ? t('po poprawce','after fix') : report.name.endsWith('-import') ? t('import skanera','scanner import') : report.name.endsWith('-partial') ? t('częściowy zakres','partial coverage') : report.format.replace('cda.','').replace('.v1','');
    return kind+' · '+suffix+' · '+date(report.createdAt);
  }
  async function openBrief(htmlName) {
    briefReview = state.runs.find(run => reportNames(run).includes(htmlName)) || (retainedRun && reportNames(retainedRun).includes(htmlName) ? retainedRun : null);
    try { const sources=await request('/api/report-sources',{name:htmlName}); const select=$('brief-report');select.replaceChildren();for(const report of sources.reports){const option=node('option',sourceLabel(report));option.value=report.name;select.append(option);} $('brief-consent').checked=false;$('brief-send').disabled=true;$('brief-error').textContent='';$('brief-dialog').showModal();await previewBrief(); }
    catch(error){notice(errorName(error));}
  }
  let previewSequence = 0;
  async function previewBrief() {
    const seq = ++previewSequence;
    const name = $('brief-report').value;
    briefLoading = true;
    $('brief-send').disabled = true;
    $('brief-consent').checked = false;
    $('brief-preview').textContent = '';
    try {
      const brief = await request('/api/report-brief', { name });
      if (seq === previewSequence) $('brief-preview').textContent = JSON.stringify(brief, null, 2);
    } catch (error) { if (seq === previewSequence) $('brief-error').textContent = errorName(error); }
    finally { if (seq === previewSequence) briefLoading = false; }
  }
  $('brief-report').onchange=previewBrief;
  $('brief-consent').onchange=()=>{$('brief-send').disabled=briefLoading || !$('brief-consent').checked || !$('brief-preview').textContent;};
  $('brief-send').onclick=async()=>{if(!$('brief-consent').checked)return;$('brief-send').disabled=true;try{const result=await request('/api/launch-agent',{host:'codex',message:t('Wyjaśnij załączone podsumowanie raportu prostym językiem: co wiemy, czego nie wiemy i jaki jest następny krok.','Explain the attached report summary: what we know, what we do not know and the next step.'),consent:true,shareReport:true,projectId:briefReview?.projectId,reviewId:briefReview?.runId,reportName:$('brief-report').value,reportDigest:JSON.parse($('brief-preview').textContent).digest,lang,model:$('codex-model').value.trim()});saveChatSelection(result.session.sessionId);$('brief-dialog').close();showView('terminal');await loadStatus();}catch(error){$('brief-error').textContent=errorName(error);$('brief-send').disabled=false;}};
  function preparePlan(kind){planWorkflow=kind;$('chat-plan').hidden=false;$('chat-plan-consent').checked=false;$('chat-plan-description').textContent=workflowName(kind)+' · '+configurations[kind][2];$('chat-plan-consent-copy').textContent=configurations[kind][3];$('chat-plan-consent-label').hidden=kind==='demo';$('chat-plan-target').disabled=!['project','web'].includes(kind);$('chat-plan-files').disabled=kind!=='project';for(const id of ['chat-plan-target','chat-plan-files']){const hidden=$(id).disabled;$(id).hidden=hidden;document.querySelector('label[for="'+id+'"]').hidden=hidden;}$('chat-plan').scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  document.querySelectorAll('[data-chat-plan]').forEach(el=>el.onclick=()=>preparePlan(el.dataset.chatPlan));
  $('chat-plan-form').onsubmit=async event=>{event.preventDefault();$('chat-plan-run').disabled=true;try{const result=await request('/api/workflows/start',{workflow:planWorkflow,projectId:conversationContext().projectId,sessionId:chatSessionId,target:$('chat-plan-target').value.trim(),files:$('chat-plan-files').value.split('\n').map(x=>x.trim()).filter(Boolean),consent:$('chat-plan-consent').checked,lang});state.activeRunId=result.run.runId;sessionStorage.setItem('cda-active-run',state.activeRunId);if (!chatSessionId) { draftReviewId=state.activeRunId; sessionStorage.setItem('cda-draft-review',draftReviewId); }$('chat-plan').hidden=true;$('chat-message').value='';state.runs.unshift(result.run);renderActiveRun();await loadStatus();}catch(error){notice(errorName(error));}finally{$('chat-plan-run').disabled=false;}};
  $('compare-form').onsubmit=async event=>{event.preventDefault();$('compare-error').textContent='';try{const result=await request('/api/compare',{before:$('compare-before').value,after:$('compare-after').value,lang});const box=$('compare-result');box.replaceChildren();for(const [label,items]of [[t('Nowe','New'),result.added],[t('Nadal obecne','Still present'),result.existing],[t('Nieobserwowane — do weryfikacji','Not observed — verify'),result.noLongerObserved],[t('Potwierdzone w zapisanym reteście','Confirmed in saved retest'),result.confirmations || []]]){const section=node('section',undefined,'overview-card');section.append(node('h2',label+' · '+items.length));for(const item of items)section.append(node('p',item.priority+' · '+item.ruleId+' · '+item.path+':'+item.line));box.append(section);}box.append(node('p',t('To porównanie zapisanych wyników. Potwierdzenia dotyczą czasu i zakresu dopasowanego retestu, nie całego systemu.','This compares saved results. Confirmations apply to the time and scope of the matched retest, not the whole system.')),reportActions(result.name));await loadStatus();}catch(error){$('compare-error').textContent=t('Nie można porównać tych wyników. Wybierz dwa różne raporty tego samego projektu i skanera.','Cannot compare these results. Choose two different reports from the same project and scanner.');}};
  const { selectProject, renderProjects, loadProjectHistory } = window.mountProjectBrowser({
    $, state, signatures, request, projectName, t, errorName, notice, node, button, date,
    workflowName, statusName, openRun, startConversation, saveChatSelection, renderChat, showView
  });
  selectWorkflow('demo');
  showView(location.hash.slice(1) || 'overview');
  async function restoreWorkspace() {
    await loadStatus();
    const id = state.view === 'terminal' ? conversationContext().reviewId : state.activeRunId;
    if (!id || !['detail', 'terminal'].includes(state.view) || state.runs.some(run => run.runId === id)) return;
    try {
      const { run } = await request('/api/review?id=' + encodeURIComponent(id));
      retainedRun = run;
      renderActiveRun();
      renderChat();
    } catch (error) { notice(errorName(error)); }
  }
  restoreWorkspace();
  import('/assets/globe.js').then(module => module.mountGlobe($('scope-globe'))).catch(() => { /* Scope buttons work without the decorative canvas. */ });
  document.addEventListener('visibilitychange', () => {
    clearTimeout(statusTimer);
    if (!document.hidden) loadStatus();
  });
})();
