/** Local project selection and history. Loaded before the panel controller. */
window.mountProjectBrowser = function mountProjectBrowser({
  $, state, signatures, request, projectName, t, errorName, notice, node, button, date,
  workflowName, statusName, openRun, startConversation, saveChatSelection, renderChat, showView
}) {
  function selectProject(id) {
    state.projectId = id;
    localStorage.setItem('cda-project', id);
    for (const el of [$('review-project'), $('project-list')]) el.value = id;
    $('project-heading').textContent = projectName(id);
  }
  let historyRequest = 0;
  async function loadProjectHistory() {
    const seq = ++historyRequest;
    const id = state.projectId;
    const box = $('project-history');
    box.textContent = t('Wczytywanie…', 'Loading…');
    try {
      const { runs } = await request('/api/project-history?id=' + encodeURIComponent(id));
      if (seq !== historyRequest) return;
      box.replaceChildren();
      if (!runs.length) box.textContent = t('Pierwsze sprawdzenie pojawi się tutaj.', 'Your first review will appear here.');
      for (const run of runs) {
        const row = node('div', undefined, 'history-row');
        row.append(button(workflowName(run.workflow), async () => {
          const { run: detail } = await request('/api/review?id=' + encodeURIComponent(run.runId));
          openRun(detail);
        }), node('span', date(run.createdAt)), node('span', statusName(run.status)));
        box.append(row);
      }
    } catch (error) { if (seq === historyRequest) box.textContent = errorName(error); }
  }
  function renderProjects() {
    if (state.offline) return;
    const signature = JSON.stringify(state.projects);
    if (signature !== signatures.projects) {
      signatures.projects = signature;
      for (const select of [$('review-project'), $('project-list')]) {
        select.replaceChildren(new Option(projectName(''), ''));
        for (const project of state.projects) select.add(new Option(project.name, project.id));
      }
      selectProject(state.projects.some(p => p.id === state.projectId) ? state.projectId : '');
    }
    if (state.view !== 'projects') return;
    const threads = state.sessions.filter(s => s.chat && !s.archived && (s.projectId || '') === state.projectId);
    const latest = [...new Map(threads.slice().reverse().map(s => [s.conversationId || s.sessionId, s])).values()].reverse();
    const signatureThreads = JSON.stringify([state.projectId, latest.map(s => [s.sessionId, s.title])]);
    if (signatures.threads !== signatureThreads) {
      signatures.threads = signatureThreads;
      const box = $('project-threads');
      box.replaceChildren();
      if (!latest.length) box.textContent = t('Brak zapisanych rozmów.', 'No saved conversations.');
      for (const session of latest) box.append(button(session.title, () => {
        saveChatSelection(session.sessionId);
        renderChat();
        showView('terminal');
      }));
    }
  }
  for (const el of [$('review-project'), $('project-list')]) el.onchange = () => {
    selectProject(el.value);
    renderProjects();
    if (state.view === 'projects') loadProjectHistory();
  };
  $('project-agent').onclick = () => startConversation(state.projectId);
  $('project-form').onsubmit = async event => {
    event.preventDefault();
    const submit = event.currentTarget.querySelector('button');
    submit.disabled = true;
    try {
      const { project } = await request('/api/projects', { name: $('project-name').value.trim() });
      state.projects.unshift(project);
      renderProjects();
      selectProject(project.id);
      renderProjects();
      $('project-name').value = '';
      await loadProjectHistory();
    } catch (error) { notice(errorName(error)); } finally { submit.disabled = false; }
  };
  return { selectProject, renderProjects, loadProjectHistory };
};
