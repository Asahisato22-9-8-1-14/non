export type Step = {
  id: string;
  phase: number;
  title: string;
  description: string;
  fullExplanation: string;
  insight: string;
  related: string[];
  emoji: string;
};

export type Phase = {
  n: number;
  name: string;
  keyword: string;
  goal: string;
};

export const PHASES: Phase[] = [
  { n: 1, name: "Prepare", keyword: "Prime", goal: "Set direction so your brain knows what to look for." },
  { n: 2, name: "Build the Big Picture", keyword: "Map", goal: "Organise ideas into a structure before diving into detail." },
  { n: 3, name: "Deepen Understanding", keyword: "Understand", goal: "Move from knowing what to knowing why and how." },
  { n: 4, name: "Retrieve from Memory", keyword: "Retrieve", goal: "Pull knowledge out of your head to make it stick." },
  { n: 5, name: "Decide What to Memorize", keyword: "Memorize", goal: "Memorise only what understanding can't carry." },
  { n: 6, name: "Apply the Knowledge", keyword: "Apply", goal: "Use what you know on real problems and learn from every error." },
  { n: 7, name: "Review Over Time", keyword: "Review", goal: "Revisit knowledge at expanding intervals so it lasts." },
  { n: 8, name: "Final Exam Preparation", keyword: "Reflect", goal: "Consolidate, simulate the exam, and reflect on your process." },
];

// [number, phase, emoji, title, description, fullExplanation, insight, related]
type Raw = [number, number, string, string, string, string, string, number[]];

const RAW: Raw[] = [
  // ───────── Phase 1 · Prepare ─────────
  [1, 1, "🎯", "Define the outcome",
    "Write one sentence: 'By the end, I should be able to ___.'",
    "Before opening any material, decide what success looks like for this session. A concrete outcome — explain, solve, compare or apply — tells your brain what to pay attention to and what to ignore. It also gives you a yardstick to test yourself against at the end.",
    "Vague goals lead to vague learning. If you can't describe the outcome, you can't tell whether you reached it.",
    [4, 6, 24]],
  [2, 1, "🧭", "Gauge what you already know",
    "Spend two minutes writing down everything you already know about the topic.",
    "A quick pre-study brain dump activates prior knowledge so new information has something to attach to. It also exposes what you're missing, which shapes where you spend your effort. Don't look anything up — the gaps are the point.",
    "Prior knowledge is the hook new knowledge hangs on. The more hooks you activate, the less you need to memorise.",
    [19, 21, 4]],
  [3, 1, "👀", "Skim to prime",
    "Scan headings, diagrams and summaries for 5–10 minutes without trying to learn.",
    "Priming builds a rough mental outline before you dive into detail. Look at structure: chapter titles, bolded terms, figures and end-of-chapter questions. You're not trying to remember anything yet — just to see the shape of the territory.",
    "Priming should feel slightly incomplete. If you're taking detailed notes, you've stopped priming and started reading.",
    [7, 4, 8]],
  [4, 1, "❓", "Ask priming questions",
    "Write 3–5 questions you want this session to answer.",
    "Questions turn passive reading into active searching. When you read with a question in mind, relevant information stands out and irrelevant detail fades. Keep them visible while you study and answer them at the end.",
    "A good priming question starts with 'why' or 'how' — those force understanding instead of fact-collecting.",
    [1, 14, 24]],
  [5, 1, "🧘", "Set up your environment",
    "Remove distractions and commit to one task for the whole block.",
    "Deep processing needs sustained attention, and every notification costs minutes of refocusing. Put your phone in another room, close unrelated tabs and keep blank paper nearby for mapping. Let the environment do the discipline for you.",
    "Willpower is unreliable; friction is reliable. Make distractions harder to reach than your study material.",
    [6, 1]],
  [6, 1, "⏱️", "Time-box the session",
    "Plan focused blocks with short breaks, and stop on time.",
    "Fixed blocks — for example 45 minutes on, 10 off — keep intensity high and prevent the drift of open-ended sessions. Decide in advance what each block covers. Breaks are where consolidation begins, so don't skip them.",
    "Effort that feels hard but manageable is the sweet spot. If a block feels easy, raise the challenge rather than the hours.",
    [5, 39, 37]],

  // ───────── Phase 2 · Build the Big Picture ─────────
  [7, 2, "🧩", "Identify the main chunks",
    "Find the 3–7 big categories the topic breaks into.",
    "Before details, find the top-level structure. Ask: if this topic were a book, what would its chapters be? These chunks become the main branches of your mind map and the containers every detail will later fit into.",
    "Most people learn bottom-up and drown in detail. Learning top-down means each fact arrives with a home already waiting.",
    [3, 8, 9, 44]],
  [8, 2, "🗺️", "Start a non-linear mind map",
    "On a blank page, place the chunks first — keywords only, no sentences.",
    "A non-linear map forces you to decide where ideas sit relative to each other, which is real thinking rather than copying. Put the central topic in the middle and the chunks around it. Use as few words as possible; the structure carries the meaning.",
    "If your map could be read top-to-bottom like a list, it's linear notes in disguise. Spread out.",
    [7, 22, 42, 44]],
  [9, 2, "🫧", "Group related ideas",
    "Cluster concepts by meaning so each group tells one story.",
    "Grouping reduces the number of things your working memory has to juggle. Ask which ideas belong together and why, then cluster them visually. The act of deciding the groups is where much of the learning happens.",
    "If you can't name a group in one or two words, it's probably two groups.",
    [7, 10, 15]],
  [10, 2, "↔️", "Draw the relationships",
    "Connect ideas with arrows labelled by verbs: causes, requires, opposes.",
    "Knowledge lives in the relationships, not the isolated facts. Draw arrows between concepts and label each with how they connect. Cross-links between distant branches are the most valuable — they signal deep understanding.",
    "An arrow without a verb is a guess. Force yourself to name the relationship.",
    [9, 14, 16, 13]],
  [11, 2, "🎨", "Use images and symbols",
    "Replace words with simple drawings, icons and spatial cues.",
    "Non-verbal encoding gives your brain a second route to the memory and forces you to compress ideas. A quick sketch often captures a process better than a paragraph. Artistic quality doesn't matter; meaning does.",
    "Translating words into a picture is itself an act of understanding — you can't draw what you don't grasp.",
    [8, 12, 30]],
  [12, 2, "🔆", "Emphasise what matters most",
    "Use size, colour and weight to show priority at a glance.",
    "Not every idea is equally important. Make central principles big and bold and let minor details stay small. When you glance at the map later, its hierarchy should be obvious within seconds.",
    "Emphasis is a decision about importance — and making that decision is half of studying well.",
    [16, 11, 44]],
  [13, 2, "🔄", "Keep the map evolving",
    "Restructure and redraw the map as your understanding improves.",
    "Your first map will be wrong in places, and that's fine. As you learn more, move branches, merge groups and add cross-links. Each redraw reflects a better mental model of the topic.",
    "A map that never changes is a sign you've stopped thinking about the structure.",
    [10, 20, 42, 22]],

  // ───────── Phase 3 · Deepen Understanding ─────────
  [14, 3, "🤔", "Ask why and how",
    "Interrogate each idea until you understand its cause and mechanism.",
    "Facts become meaningful when you know why they're true and how they work. For every key point, ask why it happens, how it connects and what would change if it didn't hold. These answers build durable understanding.",
    "'What' questions build lists; 'why' and 'how' questions build models.",
    [4, 10, 16, 18]],
  [15, 3, "⚖️", "Compare and contrast",
    "Set similar concepts side by side and name their differences.",
    "Many errors come from confusing neighbouring ideas. Comparing them directly — in a table or on the map — sharpens the boundaries between them. Ask what they share, where they diverge and when you'd use each.",
    "You only truly know a concept when you can say what it is not.",
    [9, 35, 34]],
  [16, 3, "🧱", "Find the underlying principle",
    "Look for the single idea that explains many facts at once.",
    "Most topics rest on a few core principles. Once you find them, dozens of facts become predictable instead of arbitrary. Ask which rule, if you understood it, would let you rebuild the rest.",
    "One principle understood saves a hundred facts memorised.",
    [14, 12, 28, 10]],
  [17, 3, "💡", "Generate your own examples",
    "Create examples from your own life or field that fit the idea.",
    "Producing an example tests whether you can apply a concept beyond the textbook's framing. If you can only repeat the book's example, you've memorised it rather than understood it. Aim for examples that differ on the surface but match in principle.",
    "Edge cases are gold: an example that almost fits teaches you exactly where the concept ends.",
    [18, 36, 19]],
  [18, 3, "🗣️", "Explain it simply",
    "Explain the idea in plain language, as if to a beginner.",
    "The Feynman approach exposes gaps fast: wherever you reach for jargon or hand-wave, your understanding is thin. Explain from first principles, then return to the source to repair weak spots. Repeat until the explanation is short and clear.",
    "If your explanation needs the textbook's exact words, you're reciting, not understanding.",
    [14, 23, 25, 17]],
  [19, 3, "🔗", "Connect to prior knowledge",
    "Link new ideas to things you already understand well.",
    "New information sticks when it's tied to existing knowledge. Ask what this reminds you of — in this subject or others — and what's similar or different. Analogies are powerful, but note where they break down.",
    "The richer your web of connections, the more retrieval paths you'll have in the exam.",
    [2, 17, 10]],
  [20, 3, "🧯", "Resolve confusion immediately",
    "Mark anything unclear and fix it the same day.",
    "Unresolved confusion compounds: later material builds on it and the gap widens. Flag confusing points on your map with a symbol, then target them before the session ends using the source, a peer or a teacher.",
    "Confusion is a signal, not a failure. It shows you exactly where the learning is.",
    [13, 26, 47]],

  // ───────── Phase 4 · Retrieve from Memory ─────────
  [21, 4, "📝", "Close the book and brain-dump",
    "Write or draw everything you remember without looking.",
    "Retrieval is one of the strongest known ways to consolidate memory. Closing the material and dumping what you know forces effortful recall and immediately shows what didn't stick. Do it shortly after learning, then again later.",
    "Struggling to recall isn't wasted time — the struggle is what strengthens the memory.",
    [2, 22, 26, 45]],
  [22, 4, "🖊️", "Redraw the map from memory",
    "Recreate your mind map on a blank page, then compare.",
    "Redrawing tests more than facts — it tests structure, relationships and hierarchy. Compare with your original and note what you missed or misplaced. Those differences become your next study targets.",
    "Missing relationships matter more than missing facts. Check the arrows first.",
    [8, 21, 13, 42]],
  [23, 4, "🎙️", "Self-explain out loud",
    "Talk through a concept from start to finish without notes.",
    "Speaking forces sequence and completeness in a way silent thinking doesn't. Wherever you stall, you've found a gap. Record yourself if it helps and listen back for vague or circular explanations.",
    "Fluency in your head is deceptive. Saying it aloud reveals what you actually know.",
    [18, 25, 21]],
  [24, 4, "✅", "Answer your priming questions",
    "Return to your opening questions and answer them from memory.",
    "This closes the loop you opened during preparation. If you can answer every question clearly, the session met its outcome. If not, you know exactly what to revisit.",
    "Unanswered questions are the most efficient to-do list you'll ever write.",
    [4, 1, 26]],
  [25, 4, "🦆", "Teach someone",
    "Teach the topic to a friend, a study group or a rubber duck.",
    "Teaching requires organising knowledge for someone else, which deepens your own structure. Questions from a listener expose assumptions you never noticed. Even teaching an imaginary student forces clarity.",
    "When you teach, you discover the difference between familiarity and mastery.",
    [18, 23]],
  [26, 4, "🩹", "Check gaps and patch them",
    "Compare your recall with the source and fix only what was missing.",
    "After any retrieval attempt, check against the material. Spend your time on what you got wrong or left out rather than re-reading what you already know. Update the map or create cards for the gaps.",
    "Efficient studying is targeted studying. Spend your time where the gaps are.",
    [21, 24, 20, 29]],

  // ───────── Phase 5 · Decide What to Memorize ─────────
  [27, 5, "🔍", "Separate concepts from facts",
    "Sort information into things to understand and things to remember.",
    "Concepts can be reasoned about; raw facts — names, dates, constants — often can't. Separating them stops you memorising things you could simply understand. Only the true leftovers go to memorisation.",
    "Memorisation is the last resort, not the first strategy.",
    [28, 16, 29]],
  [28, 5, "🧮", "Ask: can I derive this?",
    "If a fact follows from a principle, learn the principle instead.",
    "Many 'facts' are consequences of a deeper rule. If you can derive something in under a minute from what you know, you don't need a card for it. This keeps your memorisation load small and your understanding strong.",
    "Every derivable fact you memorise is a missed chance to understand.",
    [27, 16, 32]],
  [29, 5, "🗂️", "Write high-quality flashcards",
    "One atomic idea per card, phrased as a clear question.",
    "Good cards are short, specific and unambiguous. Ask one thing, require active recall and avoid lists on a single card. Write them in your own words so you encode meaning, not copied text.",
    "If a card takes more than a few seconds to answer, split it.",
    [27, 31, 41, 26]],
  [30, 5, "🧠", "Use mnemonics for arbitrary facts",
    "Create vivid associations for information with no internal logic.",
    "Some information is genuinely arbitrary — sequences, labels, exceptions. Mnemonics such as acronyms, stories or memory palaces give it an artificial structure. Use them sparingly, and only once understanding can't help.",
    "The stranger and more vivid the image, the better it sticks.",
    [11, 29]],
  [31, 5, "📍", "Attach facts to the map",
    "Link every flashcard back to the concept it belongs to.",
    "Isolated facts fade; connected facts persist. When you write a card, note which branch of your map it belongs to. In review, recalling the fact should bring its context along with it.",
    "A fact with a home in your map is far easier to retrieve than one floating alone.",
    [29, 8, 44]],
  [32, 5, "✂️", "Limit your card count",
    "Keep the deck lean so daily reviews stay sustainable.",
    "Large decks create review debt that eventually breaks the habit. Be selective: only card what you truly need to recall verbatim. Delete or merge cards you now understand conceptually.",
    "A small deck you review every day beats a huge deck you abandon.",
    [28, 39]],

  // ───────── Phase 6 · Apply the Knowledge ─────────
  [33, 6, "🏋️", "Do practice questions early",
    "Start applying knowledge before you feel ready.",
    "Practice questions reveal how knowledge will actually be tested and where your understanding breaks. Waiting until you 'feel ready' wastes their diagnostic value. Attempt them early, accept mistakes and learn from them.",
    "Feeling ready is not a reliable signal. Performance is.",
    [34, 36, 46]],
  [34, 6, "🔬", "Analyse every error",
    "For each mistake, identify the real cause before moving on.",
    "Not all errors are equal: a missing fact needs a different fix from a misunderstood concept or a misread question. Categorise each error, then apply the matching remedy. Use the analyser in this phase to choose the fix.",
    "Marking an answer wrong isn't learning. Diagnosing why it was wrong is.",
    [33, 38, 47, 15]],
  [35, 6, "🔀", "Interleave problem types",
    "Mix different kinds of problems instead of practising them in blocks.",
    "Blocked practice lets you apply the same method on autopilot. Interleaving forces you to decide which method a problem needs — exactly what an exam demands. It feels harder, and that difficulty is productive.",
    "If practice feels smooth, you may be practising the method, not the decision.",
    [40, 15, 36]],
  [36, 6, "🧗", "Solve unseen problems",
    "Tackle novel questions you haven't seen worked examples for.",
    "Transfer — applying knowledge in new contexts — is the real goal of learning. Look for problems phrased differently or combining several topics. Struggle first, then check solutions and update your map.",
    "Exams reward transfer. Practise the thing you'll actually be tested on.",
    [17, 33, 35]],
  [37, 6, "⏳", "Time yourself",
    "Practise under realistic time pressure.",
    "Knowing how to solve something and solving it in time are different skills. Timed practice shows where you hesitate and trains decisiveness. Start untimed for new topics, then add pressure as competence grows.",
    "Slow answers often signal shaky understanding, not slow writing.",
    [6, 46, 34]],
  [38, 6, "📒", "Keep an error log",
    "Record each mistake, its cause and the fix you applied.",
    "An error log turns individual mistakes into visible patterns. Review it weekly to spot recurring weaknesses. Over time it becomes your most personalised study guide.",
    "Most mistakes repeat. A log helps you catch the pattern before the exam does.",
    [34, 48, 47]],

  // ───────── Phase 7 · Review Over Time ─────────
  [39, 7, "📅", "Schedule spaced reviews",
    "Revisit material at expanding intervals: 1, 3, 7, 14 and 30 days.",
    "Memory decays quickly after learning, but each well-timed review slows the decay. Spacing reviews out instead of cramming produces far more durable retention for the same effort. Put the dates in your calendar.",
    "Review just before you'd forget. That effortful recall is what resets the forgetting clock.",
    [6, 41, 32, 43]],
  [40, 7, "🎲", "Interleave your reviews",
    "Mix topics within each review session.",
    "Reviewing one topic at a time builds context-dependent memory. Mixing topics trains you to retrieve the right knowledge without cues — just like an exam. It also reveals links between topics you hadn't noticed.",
    "The exam won't tell you which chapter a question comes from. Your reviews shouldn't either.",
    [35, 39, 41]],
  [41, 7, "🔁", "Review by retrieval, not rereading",
    "Test yourself first, then check — never just reread.",
    "Rereading creates an illusion of mastery because familiar text feels known. Retrieval practice — flashcards, blank-page recall, questions — shows what you can actually produce. Always attempt recall before looking.",
    "Recognition is not recall, and the exam asks for recall.",
    [21, 29, 39, 40]],
  [42, 7, "🗺️", "Refresh the map",
    "Redraw or update your map instead of rereading notes.",
    "Revisiting the map strengthens structure, not just facts. Redraw it from memory, then add connections you've discovered since. Each refresh compresses and integrates the topic further.",
    "A refreshed map is shorter and denser than the original — a sign of growing mastery.",
    [13, 22, 8, 44]],
  [43, 7, "📊", "Track confidence per topic",
    "Rate each topic red, amber or green after every review.",
    "A simple confidence rating directs your limited time to weak areas. Base ratings on retrieval performance, not on how familiar the material feels. Re-rate after each review and watch topics move to green.",
    "Honest ratings beat optimistic ones. Use evidence, not feelings.",
    [39, 48, 49]],

  // ───────── Phase 8 · Final Exam Preparation ─────────
  [44, 8, "🌐", "Build a master map",
    "Combine every session map into one integrated overview.",
    "A master map shows how all the topics in the course connect. Building it forces you to find cross-topic relationships and prioritise across the whole syllabus. It becomes your single best revision tool.",
    "The connections between topics are often what separates top answers from average ones.",
    [7, 8, 42, 31, 12]],
  [45, 8, "🧠", "Do a full-course brain dump",
    "Write everything you know about the course from memory.",
    "A full brain dump tests whether you can access knowledge without prompts. Compare it with your master map to find forgotten topics and weak links. Repeat it a few days later to measure progress.",
    "What you can't recall unprompted is what you'll struggle with in the exam.",
    [21, 44, 49]],
  [46, 8, "📄", "Sit full practice papers",
    "Complete past papers under real exam conditions.",
    "Full papers train stamina, timing and question selection, not just knowledge. Recreate exam conditions: timed, closed-book, no interruptions. Mark strictly and analyse every lost mark.",
    "Your first full paper should never be the real exam.",
    [33, 37, 47]],
  [47, 8, "🛠️", "Repair every mistake",
    "Sort mistakes by cause and fix each one properly.",
    "Work through every error from your practice papers and apply the right fix: a flashcard, a map revision or targeted method practice. Then re-test the item days later to confirm it's genuinely fixed.",
    "A mistake is only repaired when you can get it right again, cold, days later.",
    [34, 38, 20, 46]],
  [48, 8, "🎯", "Fix recurring weaknesses",
    "Turn repeated errors into a targeted improvement plan.",
    "Patterns in your error log reveal systematic weaknesses — a topic, a skill or a habit. Assign a specific fix to each and schedule practice for it. Track whether the pattern disappears.",
    "Fix the pattern, not just the instance.",
    [38, 43, 47]],
  [49, 8, "🪞", "Reflect on your process",
    "Review what worked, what didn't and what you'll change next time.",
    "Reflection turns one exam into better studying for every future exam. Ask which methods gave the best return, where time was wasted and what you'd do differently. Write it down while it's fresh.",
    "The best learners don't just study harder — they study the way they study.",
    [43, 45, 1]],
];

export const STEPS: Step[] = RAW.map(
  ([n, phase, emoji, title, description, fullExplanation, insight, related]) => ({
    id: `step_${n}`,
    phase,
    title,
    description,
    fullExplanation,
    insight,
    related: related.map((r) => `step_${r}`),
    emoji,
  }),
);

export const TOTAL_STEPS = STEPS.length;

export function stepNumber(id: string): number {
  return Number(id.replace("step_", ""));
}

export const STEP_BY_ID: Record<string, Step> = Object.fromEntries(
  STEPS.map((s) => [s.id, s]),
);

/**
 * Bidirectional connection map: if step A lists B as related,
 * B is automatically connected back to A.
 */
export const connections: Record<string, string[]> = (() => {
  const map: Record<string, Set<string>> = {};
  for (const s of STEPS) {
    map[s.id] ??= new Set();
    for (const r of s.related) {
      if (!STEP_BY_ID[r] || r === s.id) continue;
      map[s.id].add(r);
      (map[r] ??= new Set()).add(s.id);
    }
  }
  return Object.fromEntries(
    Object.entries(map).map(([k, v]) => [
      k,
      [...v].sort((a, b) => stepNumber(a) - stepNumber(b)),
    ]),
  );
})();
