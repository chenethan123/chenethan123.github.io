/* ==========================================================================
   Project content: edit this file to change what shows in the list and
   in each case study.

   Images: drop files into images/<slug>/ using the filenames below.
   Any image that's missing shows a labeled placeholder telling you the path.
   Screenshots look best at 16:10 or 4:3, ~1600px wide (PNG, JPG or WebP).
   ========================================================================== */
window.PROJECTS = [
  {
    slug: 'exchangelab',
    title: 'ExchangeLab',
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
    cover: { src: 'images/exchangelab/cover.png', alt: 'ExchangeLab trading dashboard for NVDA next to a benchmark terminal: the v2 order book handles 174,124 orders/s vs 641/s for v1', w: 2000, h: 1000 },
    overview:
      'Every exchange runs on a matching engine: the code that decides which buy meets which sell, and at what price. I built one from scratch. The CLI, bots and dashboard all go through its public API and never touch the order book directly. In the dashboard you pick a real stock and trade against the bots, starting from its Yahoo Finance price.',
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
      { src: 'images/exchangelab/dashboard.png', caption: 'An NVDA market seeded from the Yahoo Finance quote. The blue and red dots on the price chart are my own market orders against the bots, and my resting limit order is marked in the book.', w: 2000, h: 2427 },
      { src: 'images/exchangelab/cli.png', caption: 'The CLI: a sell crosses the resting buy at the maker’s price, and a market buy sweeps the best ask.', w: 2000, h: 1250 },
      { src: 'images/exchangelab/benchmark.png', caption: 'Benchmark run on my laptop: same orders and same 82,675 trades on both books; v2 is 272× faster at 100,000 orders.', w: 2000, h: 1250 },
    ],
  },
  {
    slug: 'scraping',
    title: 'Scraping Pipelines',
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
    cover: { src: 'images/scraping/cover.png', alt: 'Terminal run of the scraper next to the spreadsheet it produced: 50 articles with relevance scores and links', w: 2000, h: 1000 },
    overview:
      'You pick one or more categories; the scraper fetches their feeds, cleans the HTML, scores each article against the category’s keywords, removes duplicates and writes the best ones to a spreadsheet. It started finance-only, so I moved feeds and keywords into category definitions over one shared pipeline. The export logic came from my Python scraper for 2,000+ senior-home contacts.',
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
      { src: 'images/scraping/live-demo.png', caption: 'The live demo: pick a category, scrape today’s feeds in your browser, and download the sheet as .xlsx or .csv.', w: 2000, h: 2221 },
    ],
  },
  {
    slug: 'cluster',
    title: 'Distributed Compute Cluster',
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
    cover: { src: 'images/cluster/cover.png', alt: 'Single node vs 4-node cluster: 8.81s vs 2.74s, both outputs verified sorted', w: 2000, h: 1000 },
    overview:
      'Sorting a large file on one small ARM board is slow, especially with an O(n²) algorithm. I wired five Orange Pi boards over Ethernet: a master that splits the input and four workers that each sort a piece in parallel. The master merges results as they come back, so merging overlaps with sorting instead of waiting until the end.',
    built: [
      'Master node splits the input into 5,000-integer binary chunks and schedules each as a job with dispy',
      'Four worker nodes bubble-sort their chunks and write sorted files to a shared NFS mount',
      'Master merges sorted files two at a time as soon as they arrive, streaming in 10,000-int buffers',
      'Verification on every run: sort -n -c checks order, and diff against sort -n checks no number was lost',
      'Local simulation: real dispynode processes on four loopback IPs (127.0.0.10 to .40), each limited to one CPU',
    ],
    outcome:
      'In the local simulation, 100,000 integers took 2.74s on the 4-node cluster vs 8.81s on one node, and dispy reports 3.62× speedup. Both outputs passed the sort checks. That matches the ~3.5× speedup measured on the original hardware.',
    gallery: [
      { src: 'images/cluster/side-by-side.png', caption: 'Real run, side by side: one node (left) vs four (right). Jobs complete on node1 to node4 while the master merges.', w: 2000, h: 1635 },
      { src: 'images/cluster/submit.png', caption: 'The master splits 100,000 integers into 20 binary chunks and submits one job per chunk.', w: 2000, h: 823 },
      { src: 'images/cluster/live-demo.png', caption: 'The live demo runs the same pipeline in your browser, with Web Workers as nodes.', w: 2000, h: 1736 },
    ],
  },
  {
    slug: 'formula-quizzer',
    title: 'Formula Quizzer',
    year: '2026',
    tags: ['Swift', 'iOS', 'Education'],
    summary:
      'An iOS study app for AP classes that quizzes you on your weakest subjects first, with AI-written questions when the hand-written ones run out.',
    role: 'Design & engineering',
    stack: ['Swift', 'SwiftUI', 'SwiftData', 'Swift Charts', 'OpenAI API', 'XCTest'],
    links: [{ label: 'GitHub', href: 'https://github.com/chenethan123/FormulaQuizzer' }],
    cover: { src: 'images/formula-quizzer/cover.png', alt: 'Formula Quizzer on three iPhones: the Today screen with its daily goal, a calculus question answered correctly, and the Progress screen', w: 2000, h: 1000 },
    overview:
      'You pick your AP courses and Formula Quizzer builds quizzes around them, leaning toward the subjects you miss most. I first built it in Flutter with Supabase sync, then rebuilt it as a native SwiftUI app because the UI looked like a template and offline mode needed the server. The questions, AP catalog and adaptive logic carried over.',
    built: [
      'Adaptive quizzes: each question’s subject is picked at random, weighted by 1 − accuracy (kept between 0.1 and 1), so weak subjects come up more often',
      '70 hand-written questions with explanations, 35 AP subjects and their official course units, with answer choices shuffled every time',
      'AI questions from gpt-4o-mini once a subject’s questions run out, using a strict JSON format and a rule against repeating recent questions; the API key lives in the Keychain',
      'Timed quizzes: notifications at random times between two intervals that open a 3-question quiz',
      'Daily goal, streaks, a 14-day chart and accuracy by subject, all stored on device with SwiftData',
      'A UI test that taps through every screen and saves the screenshots on this page',
    ],
    outcome:
      'The SwiftUI version builds with no warnings and runs on iOS 17 and later. Its UI test walks through a full quiz, the subject catalog, Progress and Settings. The screenshots here come from that test on an iPhone 17 Pro simulator, with two weeks of sample study history loaded.',
    gallery: [
      { src: 'images/formula-quizzer/quiz.png', caption: 'A quiz: pick an answer, check it, see why it’s right or wrong, and review everything at the end.', w: 2000, h: 1250 },
      { src: 'images/formula-quizzer/subjects.png', caption: 'Your subjects with accuracy, the searchable AP catalog, and a subject’s official course units.', w: 2000, h: 1250 },
      { src: 'images/formula-quizzer/progress.png', caption: 'Today’s goal and focus list, two weeks of progress, and timed quizzes in Settings.', w: 2000, h: 1250 },
    ],
  },
  {
    slug: 'autonomous-robot',
    title: 'Autonomous Robot',
    year: '2024',
    tags: ['Python', 'OpenCV', 'Robotics'],
    summary:
      'A tracked robot with a webcam that finds the two lines of a lane, straight or curved, draws the midpoint path between them, and follows it.',
    role: 'Design & engineering',
    stack: ['Python', 'OpenCV', 'NumPy'],
    links: [],
    cover: { src: 'images/autonomous-robot/cover.png', alt: 'The tracked robot with its webcam mast, next to a road frame with both lane lines, the midpoint path and the turn readout drawn on', w: 2000, h: 1000 },
    overview:
      'The goal was a robot that drives itself down a lane: see the two lines, work out the middle, and stay on it through straights and curves. The vision code turns every camera frame into a left line, a right line, a center path and a turn reading. The screenshots here run it on a public highway test video.',
    built: [
      'Paint mask: each frame goes to HLS color, keeping white paint (lightness 190+) and yellow paint (hue 15 to 40), plus strong left-to-right brightness edges from a Sobel filter to catch faded paint',
      'Region of interest: a wedge below the vanishing point is the only area searched, which cuts out the sky, signs, walls and most other cars',
      'Hough lines: Canny edges that sit on paint go into HoughLinesP. Near-flat segments (slope under 0.4) are dropped as shadows or crosswalks, the rest are split into left and right by slope, and each side gets a straight line weighted by segment length',
      'Vanishing point: for the first 30 frames, where the left and right Hough lines meet is recorded, and the median becomes the vanishing point that places the search area and the bird’s-eye view',
      'Bird’s-eye view: a perspective warp makes the lane look as if seen from above, so its lines are parallel. Nine stacked sliding windows climb each line, starting where the Hough line hits the bottom of the frame, and the found pixels are fitted with a curve x = Ay² + By + C, which is what lets it follow bends',
      'Steadying: a fit is rejected if the two lines aren’t a lane-width apart and roughly parallel, or if it jumps more than 8% of the frame from the last one. The last 8 fits are averaged, and if one line disappears it is rebuilt from the other using the remembered lane width',
      'Midpoint path: no hexagon or other shape. At 40 heights in the bird’s-eye view it applies the midpoint formula to the two curves, x = (x_left + x_right) / 2, giving a curved center line that is then projected back onto the camera image. The green lane fill is only drawn for display',
      'Turning: pixels are converted to meters (a 3.7 m lane, about 30 m ahead), the center path gets its own curve, and its radius comes from R = (1 + (2Ay + B)²)^1.5 / |2A|. The sign of A says left or right, over 1,500 m counts as straight, and the gap between the frame’s center and the path at the bottom says how far off-center it is and which way to correct',
    ],
    outcome:
      'On the 50-second, 1,260-frame test video it found the lane in every frame and processed about 170 frames per second on a laptop. It read 455 frames as straight, 525 as curving right and 280 as curving left, with the tightest bend at a 559 m radius and the car never more than 0.64 m off-center.',
    gallery: [
      { src: 'images/autonomous-robot/pipeline.png', caption: 'The four stages on one frame. In the bird’s-eye view, each yellow dot is the midpoint of a grey rung between the two lane curves.', w: 2000, h: 1250 },
      { src: 'images/autonomous-robot/before-after.png', caption: 'Raw frame and the finished overlay: left line in red, right line in blue, midpoint path in yellow, with the curve radius and offset.', w: 2000, h: 1250 },
      { src: 'images/autonomous-robot/robot.png', caption: 'The robot: a tracked chassis with a webcam mast, an 18 V battery and a controller board, on a taped lane.', w: 2000, h: 1250 },
    ],
  },
];
