'use client';
import { useState } from 'react';
import { ArrowUpRight, Sparkles, Terminal } from 'lucide-react';
import { cloneCommand, github, type Locale } from '@/lib/config';
import { CopyButton, TabBar } from './ui';

type MissionId = 'demo' | 'code' | 'pc' | 'web';

export function Installation({ locale }: { locale: Locale }) {
  const pl = locale === 'pl';
  const [active, setActive] = useState('claude');
  const [mission, setMission] = useState<MissionId>('demo');

  const missions: { id: MissionId; label: [string, string]; cmd: string; promptSuffix: [string, string] }[] = [
    {
      id: 'demo',
      label: ['Quick Demo', 'Szybkie Demo'],
      cmd: 'node tools/demo.mjs',
      promptSuffix: [
        'Run the bundled demo (node tools/demo.mjs) and summarize the finding, blocked out-of-scope file and retest.',
        'Uruchom lokalne demo (node tools/demo.mjs) i podsumuj wykrytą lukę, zablokowany plik poza zakresem oraz retest.',
      ],
    },
    {
      id: 'code',
      label: ['Code Audit', 'Audyt kodu'],
      cmd: 'node tools/cda.mjs scope --root . --git-staged --name audit',
      promptSuffix: [
        'Review my project before release. Propose an exact file scope first and wait for my approval.',
        'Przejrzyj mój projekt przed publikacją. Najpierw zaproponuj dokładny zakres plików i poczekaj na moją zgodę.',
      ],
    },
    {
      id: 'pc',
      label: ['Computer & CVEs', 'Komputer i CVE'],
      cmd: 'node tools/cda.mjs inventory --name pc --yes',
      promptSuffix: [
        'Check my computer for installed software, open ports and known vulnerabilities (OSV.dev + CISA KEV).',
        'Sprawdź mój komputer: zainstalowane programy, otwarte porty oraz znane luki w OSV.dev i CISA KEV.',
      ],
    },
    {
      id: 'web',
      label: ['Website Check', 'Strona WWW'],
      cmd: 'node tools/cda.mjs web --url https://your-site.pl --name site --authorized',
      promptSuffix: [
        'Passively check my website security headers (HTTPS, HSTS, CSP, cookies, CORS, TLS).',
        'Sprawdź pasywnie zabezpieczenia mojej strony WWW (HTTPS, HSTS, CSP, cookies, CORS, certyfikat TLS).',
      ],
    },
  ];

  const currentMission = missions.find(m => m.id === mission) || missions[0];
  const i = pl ? 1 : 0;

  const hosts = [
    {
      id: 'claude',
      label: 'Claude Code CLI',
      command: `node tools/cda.mjs agent --host claude --mission ${mission} --lang ${locale}\nclaude`,
      prompt: `/cyber-defense ${currentMission.promptSuffix[i]}`,
      anchor: '#claude-code',
    },
    {
      id: 'codex',
      label: 'Codex CLI',
      command: `node tools/cda.mjs agent --host codex --mission ${mission} --lang ${locale}\ncodex`,
      prompt: `$cyber-defense ${currentMission.promptSuffix[i]}`,
      anchor: '#codex',
    },
    {
      id: 'ui',
      label: pl ? 'Mini Interfejs GUI' : 'Mini Web UI',
      command: `node tools/cda.mjs ui --lang ${locale}`,
      prompt: currentMission.cmd,
      anchor: '#szybki-start-w-60-sekund',
    },
    {
      id: 'tui',
      label: pl ? 'Terminal Pro (PL/EN)' : 'Pro Terminal (PL/EN)',
      command: `node tools/cda.mjs start`,
      prompt: currentMission.cmd,
      anchor: '#szybki-start-w-60-sekund',
    },
  ];

  return (
    <div
      className="installation"
      data-agent-target="Builder"
      data-agent-label={pl ? 'Przygotowanie uruchomienia' : 'Preparing your workspace'}
    >
      <div className="window-bar">
        <Terminal size={15} />
        <span>~/cyber-defense-agent</span>
        <span className="mono">{pl ? 'MOSTEK AGENTÓW & CLI' : 'AGENT BRIDGE & CLI'}</span>
      </div>

      <TabBar
        prefix="install"
        tabs={hosts}
        value={active}
        onChange={setActive}
        label={pl ? 'Środowisko agenta' : 'Agent environment'}
      />

      <div className="mission-picker-bar" role="group" aria-label={pl ? 'Wybierz scenariusz' : 'Choose scenario'}>
        <span className="mission-picker-label">
          <Sparkles size={13} aria-hidden="true" />
          {pl ? 'Scenariusz:' : 'Mission:'}
        </span>
        {missions.map(m => (
          <button
            key={m.id}
            type="button"
            className="mission-pill-btn"
            aria-pressed={mission === m.id}
            onClick={() => setMission(m.id)}
          >
            {m.label[i]}
          </button>
        ))}
      </div>

      {hosts.map(host => (
        <div
          key={host.id}
          id={`install-panel-${host.id}`}
          role="tabpanel"
          aria-labelledby={`install-tab-${host.id}`}
          hidden={active !== host.id}
          tabIndex={0}
        >
          <div className="install-panel">
            <div className="command-caption">
              <span>01 / {pl ? 'SKLONUJ I URUCHOM' : 'CLONE & LAUNCH'}</span>
              <CopyButton
                locale={locale}
                text={`${cloneCommand.split('\n')[0]}\ncd cyber-defense-agent\n${host.command}`}
                label={`${pl ? 'Skopiuj polecenia' : 'Copy commands for'} ${host.label}`}
              />
            </div>
            <pre className="terminal-code">
              <code>
                <span className="terminal-prompt">$ </span>
                {cloneCommand.split('\n')[0]}
                {'\n'}
                <span className="terminal-prompt">$ </span>cd cyber-defense-agent
                {'\n'}
                {host.command.split('\n').map((line, idx) => (
                  <span key={idx}>
                    <span className="terminal-prompt">$ </span>
                    {line}
                    {idx < host.command.split('\n').length - 1 ? '\n' : ''}
                  </span>
                ))}
              </code>
            </pre>

            <div className="command-caption">
              <span>
                02 /{' '}
                {host.id === 'ui' || host.id === 'tui'
                  ? pl
                    ? 'LUB WYWOŁAJ BEZPOŚREDNIO KOMENDĘ'
                    : 'OR RUN DIRECT CLI COMMAND'
                  : pl
                    ? 'GOTOWY PROMPT DO CZATU AGENTA'
                    : 'READY PROMPT FOR AGENT CHAT'}
              </span>
              <CopyButton
                locale={locale}
                text={host.prompt}
                label={`${pl ? 'Skopiuj prompt' : 'Copy prompt for'} ${host.label}`}
              />
            </div>
            <pre className="prompt-code">
              <code>{host.prompt}</code>
            </pre>

            <p className="install-status">
              {pl
                ? 'Kolorowy terminal (PL/EN) oraz lokalny Mini Interfejs (127.0.0.1:3109) łączą się z Claude Code CLI i Codex CLI. Zero zewnętrznych zależności npm.'
                : 'The bilingual color TUI (PL/EN) and local Mini Web Interface (127.0.0.1:3109) bridge directly with Claude Code CLI and Codex CLI. Zero external npm dependencies.'}
            </p>
            <div className="install-footer">
              <span>Node.js 22+ · Git · MIT · AI Evolution Polska</span>
              <a href={github(`/blob/main/README.md${host.anchor}`)}>
                {pl ? 'Pełna instrukcja' : 'Full instructions'}
                <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
