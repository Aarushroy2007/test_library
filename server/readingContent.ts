import { db } from './db.ts';

export interface ChapterData {
  title: string;
  subtitle?: string;
  content: string;
  readingMinutes?: number;
}

// Curated full chapters for iconic library masterworks
const CURATED_BOOK_CHAPTERS: Record<string, ChapterData[]> = {
  bk_meditations: [
    {
      title: 'Book I: Debts and Lessons',
      subtitle: 'Reflections on Mentors, Kinship, and the Virtues of the Good Life',
      content: `1. From my grandfather Verus: I learned good morals and the government of my temper.

2. From the reputation and remembrance of my father: modesty and a manly character.

3. From my mother: piety and beneficence, and abstinence, not only from evil deeds, but even from evil thoughts; and further, simplicity in my way of living, far removed from the habits of the rich.

4. From my great-grandfather: not to have frequented public schools, and to have had good teachers at home, and to have learned that on such things a man should spend liberally.

5. From my governor: to be neither of the green nor of the blue party at the games in the Circus, nor a partizan either of the Parmularius or the Scutarius at the gladiators' fights; from him too I learned endurance of labour, and to want little, and to work with my own hands, and not to meddle with other people's affairs, and not to be ready to listen to slander.

6. From Diognetus: not to busy myself about trifling things, and not to give credit to what was said by miracle-workers and jugglers about incantations and the driving away of daemons and such things; and not to breed quails for fighting, nor to give myself up to such passions; and to endure freedom of speech; and to have become intimate with philosophy; and to have been a hearer, first of Bacchius, then of Tandasis and Marcianus; and to have written dialogues in my youth; and to have desired a plank bed and skin, and whatever else of the kind belongs to the Grecian training.

7. From Rusticus: I received the impression that my character required improvement and discipline; and from him I learned not to be led astray to sophistic emulation, nor to writing on speculative subjects, nor to delivering little hortatory orations, nor to showing myself off as a man who does much discipline, or does benevolent acts in order to make a display; and to abstain from rhetoric, and poetry, and fine writing; and not to walk about the house in my outdoor dress, nor to do other things of the kind; and to write my letters with simplicity, like the letter which Rusticus wrote from Sinuessa to my mother; and with respect to those who have offended me by words, or done me any wrong, to be easily disposed to be pacified and reconciled, as soon as they have shown a readiness to be reconciled.

8. From Apollonius: I learned freedom of will and undeviating steadiness of purpose; to look to nothing else, not even for a moment, except to reason; and to be always the same, in sharp pains, on the occasion of the loss of a child, and in long illness; and to see clearly in a living example that the same man can be both the most resolute and yielding, and not peevish in giving his instruction; and to have had before my eyes a man who clearly considered his experience and his skill in expounding philosophical principles as the smallest of his merits; and from him also I learned how to receive from friends what are esteemed favours, without being either humbled by them or letting them pass unnoticed.`,
    },
    {
      title: 'Book II: On the River Granua Among the Quadi',
      subtitle: 'The Morning Salutation and the Inviolable Inner Citadel',
      content: `When you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous, and surly. They are like this because they cannot distinguish good from evil. But I have seen the beauty of good, and the ugliness of evil, and have recognized that the wrongdoer has a nature related to my own—not of the same blood or birth, but the same mind, and possessing a share of the divine.

And so none of them can hurt me. No one can implicate me in ugliness. Nor can I feel angry at my kin, or hate him. We were made to work together like hands, like feet, like the rows of the upper and lower teeth. To obstruct each other is unnatural. To be angry at someone, to turn your back on him: these are obstructions.

Whatever this is that I am, it is a little flesh and breath, and the ruling part. Despise the flesh: blood and bones and a network, a jumble of nerves, veins, and arteries. Consider the breath: wind, always changing, expelled and sucked back in. The third part is the ruling master. You are an old man. Do not let it be enslaved any longer, pulled this way and that by selfish impulses, complaining of present fortune or dreading the future.

What comes from the gods is full of Providence. People look for retreats for themselves, in the country, by the coast, or in the hills. There is nowhere that a person can find a more peaceful and trouble-free retreat than in his own mind. So constantly give yourself this retreat, and renew yourself. Let your basic principles be brief and fundamental, the kind that will immediately wash away all pain and send you back without irritation to the life to which you must return.`,
    },
    {
      title: 'Book IV: The Universe and Impermanence',
      subtitle: 'Time as a Rushing Torrent and Reason as Sovereign Guide',
      content: `Time is a river, a violent current of events, glimpsed once and already carried past us, and another follows and is gone.

Everything you see will soon alter and cease to be. Think constantly of the changes of all things and their perpetual succession. For being itself is like a river in continual flow, its activities constantly changing, its causes infinitely varied; scarcely anything is stable, even what is close at hand.

Alexander the Great and his mule driver both died and the same thing happened to both. They were absorbed back into the life-giving principles of the universe, or scattered without distinction into atoms.

Do not act as if you were going to live ten thousand years. Death hangs over you. While you live, while it is in your power, be good.

How much peace of mind he gains who does not look to see what his neighbour says or does or thinks, but only at what he does himself, to make it just and holy. Do not look around at the dark characters of others, but run straight toward the mark, looking neither right nor left.

Live out your life in truth and justice, tolerant of those who are neither true nor just.`,
    },
  ],

  bk_computable_numbers: [
    {
      title: 'Section 1: Computing Machines and Computable Sequences',
      subtitle: 'Definitions of Discrete State Automata and Paper Tape Formulation',
      content: `The "computable" numbers may be described briefly as the real numbers whose expressions as a decimal are calculable by finite means. Although the subject of this paper is ostensibly the computable numbers, it is almost equally easy to define and investigate computable functions of an integral variable or a real or computable variable, computable predicates, and so forth.

We may compare a man in the process of computing a real number to a machine which is only capable of a finite number of conditions q₁, q₂, ..., qᵣ which will be called "m-configurations". The machine is supplied with a "tape" running through it, and divided into sections (called "squares") each capable of bearing a "symbol". At any moment there is just one square, say the r-th, which is "in the machine". We may call this square the "scanned square". The symbol on the scanned square may be called the "scanned symbol". The "scanned symbol" is the only one of which the machine is, so to speak, "directly aware".

However, by altering its m-configuration the machine can effectively remember some of the symbols which it has "seen" (scanned) previously. The possible behaviour of the machine at any moment is determined by the m-configuration qₙ and the scanned symbol Sᵣ. This pair qₙ, Sᵣ will be called the "configuration": thus the configuration determines the possible behaviour of the machine.

In some of the configurations in which the scanned square is blank (i.e. bears no symbol) the machine writes down a new symbol on the scanned square: in other configurations it erases the scanned symbol. The machine may also change the square which is being scanned, but only by shifting it one place to the right or to the left. In addition to any of these operations the m-configuration may be changed. Some of the symbols written down will form the sequence of figures which is the decimal of the real number which is being computed. The others are merely rough notes to "assist the memory".`,
    },
    {
      title: 'Section 2: Universal Computing Machines',
      subtitle: 'The Inception of Stored-Program Architecture and Interpretive Execution',
      content: `It is possible to invent a single machine which can be used to compute any computable sequence. If this machine 𝒰 is supplied with a tape on the beginning of which is written the S.D of some computing machine ℳ, then 𝒰 will compute the same sequence as ℳ.

In this section, I explain in outline the behaviour of the engine. The instructions for ℳ are written down on the tape in standard descriptive form. Machine 𝒰 begins by scanning these descriptive tables, translating them into temporary internal representations, and advancing the calculation in exact parity with ℳ.

This foundational result establishes that hardware need not be reconfigured to solve disparate mathematical problems. A general-purpose discrete automata executing an inscribed program can reproduce any finite deterministic symbolic manipulation.

This leads directly to the core resolution of the Hilbert Entscheidungsproblem: there can be no general decision method to determine whether a given formula of the first-order predicate calculus is provable, because such a method would entail solving the termination problem for all universal machines—a manifest contradiction.`,
    },
  ],

  bk_taocp_v1: [
    {
      title: 'Chapter 1: Fundamental Concepts',
      subtitle: 'Algorithm Definition, Precision, and Mathematical Rigour',
      content: `The notion of an algorithm is basic to all of computer programming, so we should begin with a careful analysis of this concept.

The word "algorithm" itself is quite interesting; at first glance it may look as though someone intended to write "logarithm" and jumbled up the first four letters. The word did not appear in Webster's New World Dictionary until 1957; we find only the older form "algorism" with its meaning, the process of doing arithmetic using Arabic numerals. In the Middle Ages, abacists computed on the abacus and algorists computed by algorism. By the time of the Renaissance, the origin of this word was in doubt, and early linguists attempted to guess at its derivation by making combinations like algiros [painful] + arithmos [number]; others said such nonsense as "the king of the Arabs, Algor." Finally, historians of mathematics found the true origin of the word algorism: it comes from the name of a famous Persian textbook author, Abu 'Abd Allah Muhammad ibn Musa al-Khwarizmi (c. 825)—literally, "Father of Abdullah, Mohammed, son of Moses, native of Khwarizm."

An algorithm has five essential properties:

1. **Finiteness**: An algorithm must always terminate after a finite number of steps.
2. **Definiteness**: Each step of an algorithm must be precisely defined; the actions to be carried out must be rigorously and unambiguously specified for each case.
3. **Input**: An algorithm has zero or more inputs: quantities that are given to it initially before the algorithm begins.
4. **Output**: An algorithm has one or more outputs: quantities that have a specified relation to the inputs.
5. **Effectiveness**: An algorithm is also generally expected to be effective, in the sense that all of the operations to be performed in the algorithm must be sufficiently basic that they can in principle be done exactly and in a finite length of time by someone using pencil and paper.`,
    },
    {
      title: 'Chapter 2: Mathematical Induction and Asymptotics',
      subtitle: 'Proof Methods and Algorithmic Correctness Invariants',
      content: `The reader is undoubtedly familiar with the technique of mathematical induction, which is used to prove assertions that depend on an integer n. Because of the pervasive role that induction plays in algorithmic analysis, let us formalize the inductive paradigm.

Let P(n) be a statement involving the positive integer n. If:
(a) P(1) is true;
(b) The truth of P(k) implies the truth of P(k + 1) for every positive integer k;
Then P(n) is true for all positive integers n.

In algorithm design, the analog of mathematical induction is the "loop invariant"—an assertion regarding the state of data structures that remains invariant prior to and following every execution of an iteration body. Proving an algorithm correct consists of establishing an invariant, demonstrating its preservation under iteration, and deducing termination upon reaching finite boundary conditions.`,
    },
  ],

  bk_cosmos: [
    {
      title: 'Chapter 1: The Shores of the Cosmic Ocean',
      subtitle: 'Grandeur of the Macrocosm and the Position of the Earth',
      content: `The Cosmos is all that is or ever was or ever will be. Our feeblest contemplations of the Cosmos stir us—there is a tingling in the spine, a catch in the voice, a faint sensation, as if a distant memory, of falling from a height. We know we are approaching the greatest of mysteries.

The size and age of the Cosmos are beyond ordinary human understanding. Lost somewhere between immensity and eternity is our tiny planetary home. In a cosmic perspective, most human concerns seem insignificant, even petty. And yet our species is young and curious and brave and shows much promise.

In the last few millennia we have made the most astonishing and unexpected discoveries about the Cosmos and our place within it, explorations that are exhilarating to consider. They remind us that humans have evolved to wonder, that understanding is a joy, that knowledge is prerequisite to survival.

I believe our future depends powerfully on how well we understand this Cosmos in which we float like a mote of dust in the morning sky.

We wish to pursue the truth, no matter where it leads. But to find the truth, we need imagination and skepticism both. We will not be afraid to speculate, but we will be careful to distinguish speculation from fact. The cosmos is full beyond measure of elegant truths; of exquisite interrelationships; of the awesome machinery of nature.`,
    },
  ],

  bk_sapiens: [
    {
      title: 'Chapter 1: An Animal of No Significance',
      subtitle: 'The Emergence of Homo Sapiens on the African Savannah',
      content: `About 13.5 billion years ago, matter, energy, time and space came into being in what is known as the Big Bang. The story of these fundamental features of our universe is called physics.

About 300,000 years after their appearance, matter and energy started to coalesce into complex structures, called atoms, which then combined into molecules. The story of atoms, molecules and their interactions is called chemistry.

About 3.8 billion years ago, on a planet called Earth, certain molecules combined to form particularly large and intricate structures called organisms. The story of organisms is called biology.

About 70,000 years ago, organisms belonging to the species Homo sapiens started to frame even more elaborate structures called cultures. The subsequent development of these human cultures is called history.

Three important revolutions shaped the course of history: the Cognitive Revolution kick-started history about 70,000 years ago. The Agricultural Revolution sped it up about 12,000 years ago. The Scientific Revolution, which got under way only 500 years ago, may well end history and start something completely different. This book tells the story of how these three revolutions have affected humans and their fellow organisms.`,
    },
  ],

  bk_clean_code: [
    {
      title: 'Chapter 1: Clean Code Philosophy',
      subtitle: 'The Cost of Chaos and the Boy Scout Rule',
      content: `You are reading this book for two reasons. First, you are a programmer. Second, you want to be a better programmer. Good. We need better programmers.

What is clean code? Bjarne Stroustrup, inventor of C++, writes: "I like my code to be elegant and efficient. The logic should be straightforward to make it hard for bugs to hide, the dependencies minimal to ease maintenance, error handling complete according to an articulated strategy, and performance close to optimal so as not to tempt people to make code messy with unprincipled optimizations."

Grady Booch, author of Object Oriented Analysis and Design with Applications: "Clean code is simple and direct. Clean code never obscures the designer's intent but rather is full of crisp abstractions and straightforward lines of control."

The Boy Scout Rule: "Leave the campground cleaner than you found it." If we all checked-in our code a little cleaner than when we checked it out, the code simply could not rot. The cleanup does not have to be something big. Change one variable name for the better, break up one even mildly large function, eliminate a little duplication, clean up one composite if statement.`,
    },
  ],
};

// Generates cohesive, professional chapters tailored to any academic volume in the catalog
export function generateChaptersForGenericBook(book: any): ChapterData[] {
  const title = book.title || 'Academic Monograph';
  const category = (book.category_id || '').toLowerCase();
  const author = book.author_name || 'Department Faculty & Researchers';
  const pubYear = book.publication_year || 2025;

  let fieldScope = 'fundamental principles, mathematical formulations, and engineering implementations';
  if (category.includes('science') || category.includes('physics')) {
    fieldScope = 'experimental mechanics, quantum phenomena, wave-particle formalisms, and optical interactions';
  } else if (category.includes('compsci') || category.includes('comp')) {
    fieldScope = 'computational complexity, distributed algorithms, neural architectures, and software paradigms';
  } else if (category.includes('biomedical') || category.includes('health')) {
    fieldScope = 'biochemical pathways, cellular physiology, diagnostic imaging, and clinical therapeutics';
  } else if (category.includes('sports')) {
    fieldScope = 'biomechanical kinematics, cardiopulmonary adaptations, neuromuscular fatigue, and performance metrics';
  } else if (category.includes('math')) {
    fieldScope = 'linear transformations, spectral decompositions, probability spaces, and discrete topology';
  }

  return [
    {
      title: 'Chapter 1: Foundational Principles and Survey',
      subtitle: `Historical Milestones, Conceptual Frameworks, and Core Invariants`,
      readingMinutes: 7,
      content: `The historical trajectory of this discipline reveals a continuous pursuit of rigor, predictability, and systemic optimization. In this opening chapter of "${title}", we establish the essential definitions, dimensional units, and analytical foundations that govern subsequent derivations.

As observed in classical treatises, modern inquiry demands both empirical grounding and deductive consistency. When analyzing ${fieldScope}, investigator intuition must be reinforced by verified mathematical models.

Key Postulates of the Discipline:

1. **System Invariance**: Boundary conditions dictate the internal equilibrium of the observed domain. Under homogeneous field assumptions, localized fluctuations dissipate exponentially toward steady-state distributions.
2. **Conservation & Coupling**: Kinetic, informational, and thermodynamic transfers adhere to rigorous parity bounds. Dissipation mechanisms must be explicitly measured rather than neglected as idealized friction.
3. **Observability Limits**: Measurement apparatus inevitably perturbs microstate parameters. Analytical approximations must maintain bounded error margins under nominal operating spectra.

Through these baseline criteria, practitioners establish benchmark metrics suitable for verification across experimental laboratories and institutional archives.`,
    },
    {
      title: 'Chapter 2: Theoretical Formulation and Mathematical Architecture',
      subtitle: `Analytical Formulations, Governing Equations, and Invariant Metrics`,
      readingMinutes: 9,
      content: `Having formalized the preliminary nomenclature in Chapter 1, we now transition to the rigorous formulation of governing equations. In the domain of "${title}", mathematical clarity remains the definitive bulwark against erroneous extrapolation.

Let the generalized state vector be denoted by Ψ(t, x), defined over the continuous compact manifold Ω ⊂ ℝⁿ. The temporal evolution follows the differential operator:

    ∂Ψ/∂t = ∇ · [ D(Ψ) ∇Ψ ] + S(Ψ, x, t)

where D(Ψ) represents the nonlinear diffusivity or transfer tensor, and S(Ψ, x, t) embodies internal source-sink dynamics.

Solving this system requires attention to spectral boundaries. When eigenvalues λₖ reside strictly within the left half of the complex plane, asymptotic stability is guaranteed via Lyapunov's direct theorem. Conversely, bifurcations arise whenever critical parameter thresholds are crossed, producing complex periodic or chaotic trajectories.

Scholars at premier institutions, including the Technology and Engineering archives, consistently emphasize the necessity of non-dimensional scaling. By expressing length, velocity, and temporal variables relative to intrinsic physical constants, researchers eliminate unit-dependent artifacts and expose the universal similitude governing the phenomena.`,
    },
    {
      title: 'Chapter 3: Experimental Methodology, Instrumentation, and Protocols',
      subtitle: `Measurement Calibration, Error Analysis, and Apparatus Schematics`,
      readingMinutes: 8,
      content: `Empirical validation serves as the sole arbiter of theoretical efficacy. In this chapter, we detail the laboratory protocols, sensor instrumentation, and noise mitigation techniques required to reproduce the benchmark results reported throughout "${title}".

Apparatus Calibration Standard:

- **Signal Conditioning**: Analog signals acquired from piezo-transducers and optical detectors are routed through low-noise pre-amplifiers with total harmonic distortion below 0.005%.
- **Digital Sampling & Filtering**: Nyquist-Shannon criteria dictate a minimum sampling rate exceeding 2.5 times the upper cutoff frequency. Linear-phase Butterworth digital filters isolate higher-order harmonics without introducing phase distortion.
- **Environmental Stabilization**: Ambient temperature is maintained at 20.0 ± 0.2 °C, with relative humidity suppressed below 45% to prevent dielectric variation and hygroscopic expansion of mechanical specimens.

Repeated trials (N = 100) yield confidence intervals at the 99% significance level. Standard deviation analysis confirms that systemic drift accounts for less than 0.8% of total variance, ensuring high reproducibility across independent verification sites.`,
    },
    {
      title: 'Chapter 4: Empirical Findings, Case Studies, and Comparative Synthesis',
      subtitle: `Quantitative Results, Cross-Validation, and Tabulated Parametric Data`,
      readingMinutes: 10,
      content: `A thorough synthesis of the empirical data reveals striking agreement between theoretical predictions and measured responses. Across 12 distinct experimental regimes, the observed convergence rates adhere precisely to the asymptotic limits derived in Chapter 2.

Comparative Institutional Analysis:

When contrasting conventional heuristic approximations with the unified framework presented in this text, three decisive advantages emerge:

1. **Efficiency Gains**: Computational throughput improves by a factor of 3.4x, reducing iteration latencies across large-scale numerical simulations.
2. **Robustness to Perturbations**: Where legacy algorithms diverge under 5% Gaussian noise injection, the stabilized formulation maintains monotonic convergence.
3. **Generalization Breadth**: The methodology applies without structural modification across adjacent industrial sectors, from micro-scale fabrication to macroscopic infrastructure deployment.

These empirical breakthroughs confirm that theoretical rigor, far from being a purely academic exercise, delivers immediate pragmatic leverage to engineers, scientists, and researchers in modern digital library archives.`,
    },
    {
      title: 'Chapter 5: Epilogue, Unresolved Questions, and Future Horizons',
      subtitle: `Scholarly Synthesis, Open Conjectures, and Archival Research Directions`,
      readingMinutes: 6,
      content: `As we conclude this volume of "${title}", it is instructive to acknowledge the horizons that remain unexplored. Scientific and technological inquiry does not end with the resolution of current puzzles; rather, each solved equation illuminates deeper, more subtle questions.

Open Research Conjectures:

- The asymptotic behaviour of localized singular solutions under extreme non-equilibrium gradients remains an active area of contemporary investigation.
- Coupling continuous manifold mechanics with discrete machine-learning surrogate models offers unprecedented opportunities for real-time optimal control.
- Interdisciplinary cross-pollination between physical engineering and computational neuroscience promises to reshape next-generation autonomous architectures.

We invite students, faculty, and visiting scholars of the Athenaeum Digital Library to continue examining these stacks, verifying the theorems, and contributing novel discoveries to the perpetual body of human knowledge.`,
    },
  ];
}

// Ensures book chapters exist in the database, populating them if necessary
export function ensureBookChapters(bookId: string): any[] {
  const existing = db.prepare(`
    SELECT * FROM book_chapters 
    WHERE book_id = ? 
    ORDER BY chapter_index ASC
  `).all(bookId) as any[];

  if (existing && existing.length > 0) {
    return existing;
  }

  // Look up book info
  const book = db.prepare(`
    SELECT b.*, (SELECT a.name FROM authors a JOIN book_authors ba ON a.id = ba.author_id WHERE ba.book_id = b.id LIMIT 1) as author_name
    FROM books b
    WHERE b.id = ?
  `).get(bookId) as any;

  if (!book) return [];

  // Determine chapters to insert
  let chapterList: ChapterData[] = [];
  if (CURATED_BOOK_CHAPTERS[bookId]) {
    chapterList = CURATED_BOOK_CHAPTERS[bookId];
  } else {
    chapterList = generateChaptersForGenericBook(book);
  }

  const insertChapter = db.prepare(`
    INSERT OR REPLACE INTO book_chapters (
      id, book_id, chapter_index, title, subtitle, content, word_count, reading_minutes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  chapterList.forEach((c, idx) => {
    const chapterId = `ch_${bookId}_${idx}`;
    const wordCount = c.content.trim().split(/\s+/).length;
    const readingMins = c.readingMinutes || Math.max(2, Math.ceil(wordCount / 200));

    insertChapter.run(
      chapterId,
      bookId,
      idx,
      c.title,
      c.subtitle || null,
      c.content,
      wordCount,
      readingMins
    );
  });

  return db.prepare(`
    SELECT * FROM book_chapters 
    WHERE book_id = ? 
    ORDER BY chapter_index ASC
  `).all(bookId) as any[];
}
