'use client';

import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import { auditMissions, buildAuditPrompt } from '@/lib/audit-missions';
import { github, type Locale } from '@/lib/config';
import { CopyButton } from './ui';

export function Missions({ locale }: { locale: Locale }) {
  const pl = locale === 'pl';
  const [missionId, setMissionId] = useState('project');
  const [host, setHost] = useState<'codex' | 'claude'>('codex');
  const mission = auditMissions.find(item => item.id === missionId) ?? auditMissions[0];
  const prompt = buildAuditPrompt(mission, locale, host);

  return (
    <section data-build-section className="missions-section section-shell" id="missions" aria-labelledby="missions-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">02 / {pl ? 'TWÓJ PIERWSZY RUCH' : 'YOUR FIRST MOVE'}</span>
          <h2 id="missions-title">{pl ? 'Od czego zaczynamy?' : 'Where should we start?'}<br />
            <span className="gradient-text">{pl ? 'Wybierz to, co ma znaczenie.' : 'Choose what matters to you.'}</span>
          </h2>
        </div>
        <p>{pl ? 'Wybierz obszar. Zobacz, czego się dowiesz, i zabierz gotowy brief do swojego agenta.' : 'Choose an area. See what you can learn, then take a ready brief to your agent.'}</p>
      </div>
      <div className="mission-workbench" data-agent-target="Architect" data-agent-label={pl ? 'Planowanie przeglądu' : 'Planning the review'}>
        <div className="mission-directory" role="group" aria-label={pl ? 'Cel przeglądu' : 'Review goal'}>
          {auditMissions.map((item, index) => (
            <button key={item.id} type="button" id={`mission-${item.id}`} aria-pressed={missionId === item.id}
              aria-controls="mission-detail" onClick={() => setMissionId(item.id)}>
              <span className="mission-number">{String(index + 1).padStart(2, '0')}</span>
              <span>{item.title[locale]}</span><ArrowRight size={17} aria-hidden="true" />
            </button>
          ))}
          <p className="mission-local-note">{pl ? 'To planer. Wybór nie uruchamia audytu ani nie udziela zgody na dostęp.' : 'This is a planner. A selection does not run an audit or grant access.'}</p>
        </div>
        <div className="mission-detail" id="mission-detail" role="region" aria-labelledby={`mission-${mission.id}`}>
          <span className="eyebrow">{mission.method[locale]}</span>
          <h3 aria-live="polite">{mission.question[locale]}</h3>
          <ul className="mission-evidence">
            {mission.evidence[locale].map(item => <li key={item}><Check size={17} aria-hidden="true" /><span>{item}</span></li>)}
          </ul>
          <div className="mission-boundary"><strong>{pl ? 'Zakres i ograniczenia' : 'Scope & limits'}</strong><p>{mission.boundary[locale]}</p></div>
          {mission.id === 'agents' && <p className="mission-sources">
            {pl ? 'Podstawa metody: ' : 'Method references: '}
            <a href="https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/">OWASP Agentic 2026</a>
            {' · '}<a href="https://asvs.owasp.org/">ASVS 5.0</a>
            {' · '}<a href="https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices">MCP</a>
          </p>}
          <div className="mission-prompt-heading">
            <label htmlFor="mission-host">{pl ? 'Brief dla' : 'Brief for'}
              <select id="mission-host" value={host} onChange={event => setHost(event.target.value as 'codex' | 'claude')}>
                <option value="codex">Codex</option><option value="claude">Claude Code</option>
              </select>
            </label>
            <CopyButton key={`${missionId}-${host}-${locale}`} locale={locale} text={prompt} label={pl ? 'Skopiuj brief audytu' : 'Copy audit brief'} />
          </div>
          <pre className="mission-prompt"><code>{prompt}</code></pre>
          <div className="mission-detail-footer">
            <a href="#install">{pl ? 'Jak uruchomić skilla' : 'How to start the skill'}<ArrowRight size={15} aria-hidden="true" /></a>
            <a href={github(`/blob/main/skills/cyber-defense/references/knowledge/${mission.playbook}`)}>{pl ? 'Metoda przeglądu' : 'Review method'}<ArrowUpRight size={15} aria-hidden="true" /></a>
          </div>
        </div>
      </div>
    </section>
  );
}
