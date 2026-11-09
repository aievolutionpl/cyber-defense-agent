'use client';

import { useState } from 'react';
import { ArrowUpRight, Terminal } from 'lucide-react';
import { cloneCommand, github } from '@/lib/config';
import { CopyButton, TabBar } from './ui';

const environments = [{ id: 'codex', label: 'Codex', launch: 'codex', prompt: '$cyber-defense demo', anchor: '#codex' }, { id: 'claude', label: 'Claude Code', launch: 'claude', prompt: '/cyber-defense demo', anchor: '#claude-code' }];

export function Installation() {
  const [active, setActive] = useState('codex');
  return <div className="installation"><TabBar prefix="install" tabs={environments} value={active} onChange={setActive} label="Środowisko agenta"/>{environments.map(env => {
    const command = `${cloneCommand}\n${env.launch}`;
    return <div key={env.id} id={`install-panel-${env.id}`} role="tabpanel" aria-labelledby={`install-tab-${env.id}`} hidden={active !== env.id} tabIndex={0}><div className="install-requirements"><span className="status-dot"/>Node.js 22+ · Git · zainstalowany i zalogowany {env.label}</div><div className="command-block"><div className="command-header"><span><Terminal size={14} aria-hidden="true"/>01 / W terminalu</span><CopyButton text={command} label={`Skopiuj polecenia ${env.label}`}/></div><pre><code>{command}</code></pre></div><div className="command-block prompt-block"><div className="command-header"><span>02 / W czacie {env.label}</span><CopyButton text={env.prompt} label={`Skopiuj prompt ${env.label}`}/></div><pre><code>{env.prompt}</code></pre></div><div className="install-bottom"><p>Pierwszy audyt działa na kopii danych demo.<br/>Do narzędzi CLI nie potrzebujesz <code>npm install</code>.</p><a href={github(`/blob/main/README.md${env.anchor}`)}>Pełna instrukcja<ArrowUpRight size={15} aria-hidden="true"/></a></div></div>;
  })}</div>;
}
