/** Deterministic, metadata-free intake. Never reads a target or grants permission. */
export const intake = [
  {
    id: "experience",
    title: "01 / YOUR WORKSPACE",
    explanation:
      "This is for experienced operators. You control host permissions and must have authorization to inspect the target. No warranty or security certification is provided.",
    question: "Where should we start?",
    options: [
      "I understand agent permissions and own the audit authorization",
      "Help me learn with the synthetic demo first",
    ],
  },
  {
    id: "goal",
    title: "02 / YOUR GOAL",
    explanation:
      "The shipped tools are local and read-only. Lab guidance does not run a network test.",
    question: "What are we protecting?",
    options: [
      "Local code and configuration",
      "An existing JSON / SARIF report",
      "An isolated lab architecture",
    ],
  },
  {
    id: "priority",
    title: "03 / YOUR OUTCOME",
    explanation:
      "A finding is a signal to investigate. A missing result is not proof of a fix.",
    question: "What do you need next?",
    options: [
      "Review before release",
      "Prioritise existing findings",
      "Verify a proposed fix",
    ],
  },
  {
    id: "sharing",
    title: "04 / YOUR DATA",
    explanation:
      "The CLI makes no network or model calls. Your agent host may send conversation content to its provider. This answer is a preference, not permission to send data.",
    question: "How should the agent handle private output?",
    options: [
      "Keep report content local",
      "Ask before sharing a locally reviewed, redacted summary",
    ],
  },
];

export function createPlan(answers) {
  if (
    !Array.isArray(answers) ||
    answers.length !== intake.length ||
    answers.some(
      (answer, i) => !Number.isInteger(answer) || !intake[i].options[answer],
    )
  )
    throw new Error("INVALID_INTAKE");
  const [experience, goal, priority, sharing] = answers;
  const steps =
    experience === 1
      ? [
          "Run node tools/demo.mjs in this trusted repository.",
          "Inspect the generated Markdown locally. Learn the difference between a confirmed fix and insufficient data.",
          "Configure host permissions before selecting any private files.",
        ]
      : goal === 2
        ? [
            "Describe the isolated lab and its authorized boundaries in your own words.",
            "Ask the skill for isolation, egress and STOP-condition guidance.",
            "Active network tests remain unavailable in v0.1.",
          ]
        : [
            "Supply a canonical directory and exact relative files; do not scan to discover them.",
            goal === 1
              ? "Include the report and every referenced local file in the proposed allowlist."
              : "Start with the smallest useful manifest or configuration file.",
            "Review the scope proposal and explicitly approve it before content is read.",
            priority === 2
              ? "Create before/after reports and run a retest; missing evidence stays insufficient_data."
              : "Run the local review or import, then inspect the evidence and suggested fix.",
          ];
  return {
    format: "cda.intake.v1",
    answers: Object.fromEntries(intake.map((q, i) => [q.id, answers[i]])),
    steps,
    sharing: sharing === 0 ? "local-only" : "ask-after-local-review",
    scopeApproved: false,
    targetRead: false,
    providerCalled: false,
  };
}

/** Injected I/O makes the real conversation testable without a terminal or model. */
export async function runWelcome({ ask, write }) {
  write(
    "\n+-----------------------------------------+\n| CYBER DEFENSE AGENT / OPERATOR INTAKE    |\n| Local tools. Explicit scope. Evidence.  |\n+-----------------------------------------+\nType q at any step to stop. Nothing is approved or scanned here.\n",
  );
  const answers = [];
  for (const item of intake) {
    write(
      `\n${item.title}\n${item.explanation}\n\n${item.question}\n${item.options.map((option, i) => `  ${i + 1}. ${option}`).join("\n")}\n`,
    );
    while (true) {
      const value = (await ask("Choose a number (or q): "))?.trim();
      if (value == null || /^q$/i.test(value)) {
        write("\nStopped. No scope approval, target read or model call.\n");
        return null;
      }
      if (/^[1-3]$/.test(value) && Number(value) <= item.options.length) {
        answers.push(Number(value) - 1);
        break;
      }
      write("Please choose one of the displayed numbers, or q.\n");
    }
  }
  const plan = createPlan(answers);
  write(
    `\nYOUR NEXT STEPS\n${plan.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}\n\nData preference: ${plan.sharing}\nNo files read. No scope approved. No model called. Answers are not saved.\nOpen skills/cyber-defense/SKILL.md in your configured agent host to continue.\n`,
  );
  return plan;
}

export async function welcomeTerminal() {
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new Error("INTERACTIVE_TERMINAL_REQUIRED");
  const { createInterface } = await import("node:readline/promises");
  const terminal = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  terminal.on("SIGINT", () => terminal.close());
  try {
    await runWelcome({
      ask: (prompt) => terminal.question(prompt),
      write: (text) => process.stdout.write(text),
    });
  } catch (error) {
    if (error.code !== "ERR_USE_AFTER_CLOSE") throw error;
  } finally {
    terminal.close();
  }
}
