/* ==========================================================================
   Project content — edit this file to change what shows in the list and
   in each case study.

   Images: drop files into images/<slug>/ using the filenames below.
   Any image that's missing shows a labeled placeholder telling you the path.
   Screenshots look best at 16:10 or 4:3, ~1600px wide (PNG, JPG or WebP).
   ========================================================================== */
window.PROJECTS = [
  {
    slug: 'exchangelab',
    title: 'ExchangeLab',
    color: '#0f766e',
    year: '2026',
    tags: ['Python', 'Systems', 'Finance'],
    summary:
      'A stock exchange simulator whose matching engine I sped up nearly 300×, from 612 to 181,000 orders per second.',
    role: 'Solo developer',
    stack: ['Python', 'sortedcontainers', 'FastAPI', 'JavaScript', 'Yahoo Finance', 'pytest'],
    links: [
      { label: 'Live demo', href: 'demo/exchange/index.html' },
      { label: 'GitHub', href: 'https://github.com/chenethan123/ExchangeLab' },
    ],
    cover: { src: 'images/exchangelab/cover.png', alt: 'ExchangeLab trading dashboard for NVDA next to a benchmark terminal: the v2 order book handles 174,124 orders/s vs 641/s for v1' },
    overview:
      'Every exchange runs on a matching engine: the code that decides which buy meets which sell, at what price, and in what order. I built one from scratch to understand it. The engine is the product; the CLI, trading bots and dashboard all go through its public API and can never touch the order book directly. The dashboard turns it into something you can play with: pick any real stock, and you trade against the bots in a market that starts at that stock’s live Yahoo Finance price.',
    built: [
      'Matching engine with price-time priority: best price first, then first-come-first-served, executing at the resting order’s price',
      'Limit and market orders, partial fills, cancellation and a trade log, with Decimal prices instead of floats',
      'Two order books: v1 scans plain lists, v2 keeps a sorted map of price levels with FIFO queues for O(log P) inserts and O(1) best bid/ask',
      'Market-maker, momentum and random-trader bots that track their own cash, inventory and PnL',
      'pytest suite covering FIFO, partial fills, market orders across price levels, cancels and invalid input',
      'Live trading dashboard (FastAPI + JavaScript): search any Yahoo ticker, and the server fetches one real quote and starts a fresh simulated market at that price, so from then on only the bots and your orders move it',
      'Trade alongside the bots with limit or market orders: click a price in the order book to load it, cancel resting orders, pause the bots to trade against a still book, and track your cash, inventory and PnL on the same ledger as theirs',
      'Price, volume, market-depth and per-trader PnL charts, an order-book ladder, and a trade tape showing who traded with whom',
    ],
    outcome:
      'At 100,000 orders, the v2 book handled 181,374 orders/s against 612/s for v1, with the same 82,675 trades on both. v2 held about 198,000 orders/s at 1 million orders with a p99 latency of 0.016 ms; v1 couldn’t finish that run because every order rescans the whole book.',
    gallery: [
      { src: 'images/exchangelab/dashboard.png', caption: 'An NVDA market seeded from the Yahoo Finance quote. The blue and red dots on the price chart are my own market orders against the bots, and my resting limit order is marked in the book.' },
      { src: 'images/exchangelab/cli.png', caption: 'The CLI: a sell crosses the resting buy at the maker’s price, and a market buy sweeps the best ask.' },
      { src: 'images/exchangelab/benchmark.png', caption: 'Benchmark run on my laptop: same orders and same 82,675 trades on both books; v2 is 272× faster at 100,000 orders.' },
    ],
  },
  {
    slug: 'scraping',
    title: 'Scraping Pipelines',
    color: '#15803d',
    year: '2026',
    tags: ['Dart', 'Python', 'Data'],
    summary:
      'A Dart news scraper that pulls the articles I find useful on any of six topics, from finance and tech to science, health, sports and world news, and exports them to Excel or Google Sheets.',
    role: 'Solo developer',
    stack: ['Dart', 'RSS / XML', 'Google Sheets API', 'Excel (.xlsx)', 'Python'],
    links: [
      { label: 'Live demo', href: 'demo/articles.html' },
      { label: 'GitHub', href: 'https://github.com/chenethan123/article-scraper' },
    ],
    cover: { src: 'images/scraping/cover.png', alt: 'Terminal run of the scraper next to the spreadsheet it produced: 50 articles with relevance scores and links' },
    overview:
      'News on any topic is spread across dozens of feeds, and most of it isn’t what you’re looking for. You pick one or more categories; the scraper fetches that category’s feeds, cleans the HTML, scores each article against the category’s keywords, removes duplicates, and writes the most relevant ones to a spreadsheet with a link to each article. It started as a finance-only tool, so I split the feeds and vocabulary out into category definitions and kept one shared scoring and export pipeline. Adding a new topic means writing a keyword list and a few feed URLs, not new code. I built the export logic first for a Python scraper built to collect 2,000+ senior-home contacts, then ported it to Dart.',
    built: [
      'Six predefined categories (finance, technology, science, health, sports, world) covering 55 RSS feeds, chosen with --category and combinable in one run',
      'One scoring engine for every category: keyword and headline matches, topic coverage and density, plus priority tickers (AAPL, NVDA…) for finance',
      'RSS fetcher that logs and skips dead or blocked feeds instead of failing the run',
      'Tests that pin finance scores to their original values and check that each category ranks its own stories above the others',
      'Exports to JSON, Excel (.xlsx with clickable links and a run-info sheet) and Google Sheets (append-only, skips URLs already there)',
      'Fixed a date bug where every article was stamped with the scrape time instead of its publish time (RFC 822 parsing)',
      'Senior Home Scraper (Python): same pipeline shape for facility directories, with fuzzy dedupe under 5%',
    ],
    outcome:
      'A real finance run on Oct 9, 2026 pulled 216 articles from the live feeds and kept the 50 most relevant (97% average relevance) from 9 sources. Moving to categories left finance scores exactly as they were. In the live demo you pick any of the six categories and it runs the same scoring in your browser against today’s feeds.',
    gallery: [
      { src: 'images/scraping/live-demo.png', caption: 'The live demo: pick a category, scrape today’s feeds in your browser, and download the sheet as .xlsx or .csv.' },
    ],
  },
  {
    slug: 'cluster',
    title: 'Distributed Compute Cluster',
    color: '#1d4ed8',
    year: '2025',
    tags: ['Distributed', 'Linux', 'Python'],
    summary:
      'A 5-node ARM cluster built with Python, Linux and NFS that splits large sorting workloads across worker nodes. It runs 3.6× faster than a single node.',
    role: 'Design & engineering',
    stack: ['Python', 'dispy', 'Linux', 'NFS', 'Bash'],
    links: [
      { label: 'Live demo', href: 'demo/cluster.html' },
      { label: 'GitHub', href: 'https://github.com/chenethan123/Distributed-Computing-Cluster' },
    ],
    cover: { src: 'images/cluster/cover.png', alt: 'Single node vs 4-node cluster: 8.81s vs 2.74s, both outputs verified sorted' },
    overview:
      'Sorting a large file on one small ARM board is slow, especially with an O(n²) algorithm. I wired five Orange Pi boards over Ethernet: a master that splits the input and four workers that each sort a piece in parallel. The master merges results as they come back, so merging overlaps with sorting instead of waiting until the end.',
    built: [
      'Master node splits the input into 5,000-integer binary chunks and schedules each as a job with dispy',
      'Four worker nodes bubble-sort their chunks and write sorted files to a shared NFS mount',
      'Master merges sorted files two at a time as soon as they arrive, streaming in 10,000-int buffers',
      'Verification on every run: sort -n -c checks order, and diff against sort -n checks no number was lost',
      'Local simulation: real dispynode processes on four loopback IPs (127.0.0.10–.40), each limited to one CPU',
    ],
    outcome:
      'In the local simulation, 100,000 integers took 2.74s on the 4-node cluster vs 8.81s on one node, and dispy reports 3.62× speedup. Both outputs passed the sort checks. That matches the ~3.5× speedup measured on the original hardware.',
    gallery: [
      { src: 'images/cluster/side-by-side.png', caption: 'Real run, side by side: one node (left) vs four (right). Jobs complete on node1–node4 while the master merges.' },
      { src: 'images/cluster/submit.png', caption: 'The master splits 100,000 integers into 20 binary chunks and submits one job per chunk.' },
      { src: 'images/cluster/live-demo.png', caption: 'The live demo runs the same pipeline in your browser, with Web Workers as nodes.' },
    ],
  },
  {
    slug: 'formula-quizzer',
    title: 'Formula Quizzer',
    color: '#7c3aed',
    year: '2026',
    tags: ['Swift', 'iOS', 'Education'],
    summary:
      'An iOS study app for AP classes that quizzes you on your weakest subjects first, with AI-written questions when the hand-written ones run out.',
    role: 'Design & engineering',
    stack: ['Swift', 'SwiftUI', 'SwiftData', 'Swift Charts', 'OpenAI API', 'XCTest'],
    links: [{ label: 'GitHub', href: 'https://github.com/chenethan123/FormulaQuizzer' }],
    cover: { src: 'images/formula-quizzer/cover.png', alt: 'Formula Quizzer on three iPhones: the Today screen with a daily goal ring, a physics question answered correctly, and the Progress screen' },
    overview:
      'You pick the AP courses you’re taking and Formula Quizzer builds quizzes around them, leaning toward the subjects you get wrong most. I first built it in Flutter with Supabase sync. When I came back to it, the UI looked like a stock template and offline mode crashed without the server, so I rebuilt it as a native SwiftUI app. I kept the original questions, AP catalog and adaptive logic.',
    built: [
      'Adaptive quizzes: each question’s subject is picked at random, weighted by 1 − accuracy (kept between 0.1 and 1), so weak subjects come up more often',
      '70 hand-written questions with explanations, 35 AP subjects and their official course units, with answer choices shuffled every time',
      'AI questions from gpt-4o-mini once a subject’s questions run out, using a strict JSON format and a rule against repeating recent questions; the API key lives in the Keychain',
      'Timed quizzes: notifications at random times between two intervals that open a 3-question quiz',
      'Daily goal ring, streaks, a 14-day chart and accuracy by subject, all stored on device with SwiftData',
      'A UI test that taps through every screen and saves the screenshots on this page',
    ],
    outcome:
      'The SwiftUI version builds with no warnings and runs on iOS 17 and later. Its UI test walks through a full quiz, the subject catalog, Progress and Settings. The screenshots here come from that test on an iPhone 17 Pro simulator, with two weeks of sample study history loaded.',
    gallery: [
      { src: 'images/formula-quizzer/quiz.png', caption: 'A quiz: pick an answer, check it, see why it’s right or wrong, and review everything at the end.' },
      { src: 'images/formula-quizzer/subjects.png', caption: 'Your subjects with accuracy, the searchable AP catalog, and a subject’s official course units.' },
      { src: 'images/formula-quizzer/progress.png', caption: 'Today’s goal and focus list, two weeks of progress, and timed quizzes in Settings.' },
    ],
  },
];
