import type { Locale } from "@/lib/config";

export function HeroSignal({ locale }: { locale: Locale }) {
  const pl = locale === "pl";
  return (
    <div className="hero-signal" data-motion-region aria-hidden="true">
      <div className="signal-top">
        <span>DEFENSE WORKSPACE</span>
        <span className="signal-mode">LOCAL / READ ONLY</span>
      </div>
      <svg viewBox="0 0 560 180" className="signal-circuit">
        <defs>
          <linearGradient id="signal-gradient">
            <stop stopColor="#78d5ff" />
            <stop offset="1" stopColor="#ab91ff" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="#354460">
          <path d="M52 46H165L221 90H280M52 90H280M52 134H165L221 90" />
          <path d="M280 90H340L390 46H508M280 90H508M340 90L390 134H508" />
          <circle cx="280" cy="90" r="63" strokeDasharray="2 7" />
          <circle cx="280" cy="90" r="47" />
        </g>
        <path
          className="signal-stream"
          d="M52 46H165L221 90H340L390 134H508"
          stroke="url(#signal-gradient)"
          strokeWidth="2"
          fill="none"
        />
        <g fill="#10182a" stroke="#5d7297">
          {[
            [52, 46],
            [52, 90],
            [52, 134],
            [508, 46],
            [508, 90],
            [508, 134],
          ].map(([x, y]) => (
            <rect
              key={`${x}-${y}`}
              x={x - 5}
              y={y - 5}
              width="10"
              height="10"
              rx="2"
            />
          ))}
        </g>
        <rect
          x="250"
          y="60"
          width="60"
          height="60"
          rx="16"
          fill="#161e34"
          stroke="#a69cff"
        />
        <path
          d="m267 88 10 10 17-19"
          stroke="#b7adff"
          strokeWidth="3"
          fill="none"
        />
        <text
          x="20"
          y="174"
          fill="#91a2bc"
          fontFamily="monospace"
          fontSize="10"
        >
          CODE / CONFIG / INVENTORY
        </text>
        <text
          x="371"
          y="174"
          fill="#afbcda"
          fontFamily="monospace"
          fontSize="10"
        >
          EVIDENCE / PLAN / RETEST
        </text>
      </svg>
      <div className="signal-caption">
        <span className="signal-pip" />
        {pl
          ? "Mniej domysłów. Więcej dowodów."
          : "Less assumption. More evidence."}
        <span>01 → 03</span>
      </div>
    </div>
  );
}
