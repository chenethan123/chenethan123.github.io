/* ExchangeLab in the browser.
 *
 * A JavaScript port of the Python engine, order book, bots and simulator
 * (engine/, strategies/, simulation/) plus the FastAPI routes in api/server.py.
 * It answers the dashboard's fetch() calls, so app.js, charts.js, index.html and
 * styles.css run unchanged from the repo.
 *
 * Prices are integer micro-dollars (1e-6) so matching never compares floats,
 * mirroring the Python code's Decimal prices. Bots quote on the same 1-cent grid.
 *
 * Browsers can't call Yahoo Finance directly (no CORS), so quotes come from
 * quotes.json: real Yahoo quotes captured with marketdata.fetch_quote().
 */
(() => {
  "use strict";

  const realFetch = window.fetch.bind(window);

  /* ---------- Decimal helpers (micro-dollars) ---------- */
  const SCALE = 1_000_000;
  const TICK = 10_000; // $0.01

  function parsePrice(value) {
    if (value === null || value === undefined) return null;
    const s = String(value).trim();
    const m = /^([+-])?(\d*)(?:\.(\d*))?$/.exec(s);
    if (!m || (m[2] === "" && (m[3] === undefined || m[3] === ""))) throw new InvalidOrderError(`invalid price: ${value}`);
    const frac = (m[3] || "").padEnd(6, "0");
    if (frac.length > 6 && /[1-9]/.test(frac.slice(6))) throw new InvalidOrderError("price supports at most 6 decimal places in this demo");
    const micros = Number(m[2] || "0") * SCALE + Number(frac.slice(0, 6));
    if (!Number.isFinite(micros)) throw new InvalidOrderError("price must be a finite number");
    return m[1] === "-" ? -micros : micros;
  }

  // str(Decimal)-like: at least 2 decimals, trailing zeros beyond that trimmed
  function fmt(micros) {
    if (micros === null || micros === undefined) return null;
    const s = (micros / SCALE).toFixed(6).replace(/(\.\d\d\d*?)0+$/, "$1");
    return s === "-0.00" ? "0.00" : s;
  }

  function roundHalfEven(x) {
    const f = Math.floor(x);
    const d = x - f;
    if (d > 0.5 + 1e-9) return f + 1;
    if (d < 0.5 - 1e-9) return f;
    return f % 2 === 0 ? f : f + 1;
  }
  const ROUND = {
    HALF_EVEN: roundHalfEven,
    FLOOR: (x) => Math.floor(x + 1e-9),
    CEILING: (x) => Math.ceil(x - 1e-9),
  };
  // strategies/base.py to_tick
  const toTick = (price, rounding = "HALF_EVEN", tick = TICK) => ROUND[rounding](price / tick) * tick;

  /* ---------- engine/order.py ---------- */
  class InvalidOrderError extends Error {}

  class Order {
    constructor({ symbol, side, quantity, trader_id = "anonymous", order_type = "LIMIT", price = null, order_id = null }) {
      this.symbol = symbol;
      this.side = String(side || "").toUpperCase();
      if (this.side !== "BUY" && this.side !== "SELL") throw new InvalidOrderError(`unknown side: ${side}`);
      this.order_type = String(order_type || "").toUpperCase();
      if (this.order_type !== "LIMIT" && this.order_type !== "MARKET") throw new InvalidOrderError(`unknown order type: ${order_type}`);
      // Bots pass micro-dollar numbers; API bodies pass strings (like Decimal(str))
      this.price = typeof price === "number" ? price : parsePrice(price);
      this.quantity = quantity;
      this.trader_id = trader_id;
      this.order_id = order_id;
      this.remaining = quantity;
      this.timestamp = new Date();
      this.sequence = 0;
      this.status = "OPEN";
      this.validate();
    }

    validate() {
      if (typeof this.symbol !== "string" || !this.symbol.trim()) throw new InvalidOrderError("symbol must be a non-empty string");
      this.symbol = this.symbol.trim().toUpperCase();
      if (!Number.isInteger(this.quantity) || this.quantity <= 0) throw new InvalidOrderError("quantity must be a positive integer");
      if (this.order_type === "LIMIT") {
        if (this.price === null || this.price <= 0) throw new InvalidOrderError("limit price must be positive");
      } else if (this.price !== null) {
        throw new InvalidOrderError("market orders must not specify a price");
      }
    }

    get isActive() {
      return (this.status === "OPEN" || this.status === "PARTIAL") && this.remaining > 0;
    }
  }

  /* ---------- engine/order_book.py IndexedOrderBook ---------- */
  // Sorted price keys + FIFO queue per price + order_id index
  class PriceLevels {
    constructor() {
      this.prices = []; // ascending
      this.queues = new Map();
    }
    get size() { return this.prices.length; }
    get(price) { return this.queues.get(price); }
    add(price, order) {
      let q = this.queues.get(price);
      if (!q) {
        q = [];
        this.queues.set(price, q);
        let lo = 0, hi = this.prices.length;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (this.prices[mid] < price) lo = mid + 1; else hi = mid; }
        this.prices.splice(lo, 0, price);
      }
      q.push(order);
    }
    delete(price) {
      this.queues.delete(price);
      const i = this.prices.indexOf(price);
      if (i >= 0) this.prices.splice(i, 1);
    }
    peekPrice(fromEnd) { return fromEnd ? this.prices[this.prices.length - 1] : this.prices[0]; }
  }

  class IndexedOrderBook {
    constructor(symbol) {
      this.symbol = symbol;
      this.bids = new PriceLevels();
      this.asks = new PriceLevels();
      this.index = new Map();
    }
    add(order) {
      (order.side === "BUY" ? this.bids : this.asks).add(order.price, order);
      this.index.set(order.order_id, order);
    }
    cancel(orderId) {
      const order = this.index.get(orderId);
      if (!order || !order.isActive) return null;
      order.status = "CANCELLED";
      this.index.delete(orderId);
      const levels = order.side === "BUY" ? this.bids : this.asks;
      const q = levels.get(order.price);
      if (q) {
        const i = q.indexOf(order);
        if (i >= 0) q.splice(i, 1);
        if (!q.length) levels.delete(order.price);
      }
      return order;
    }
    bestBid() { return this._peek(this.bids, true); }
    bestAsk() { return this._peek(this.asks, false); }
    fillBest(side, quantity) {
      const fromEnd = side === "BUY";
      const levels = fromEnd ? this.bids : this.asks;
      const order = this._peek(levels, fromEnd);
      if (!order) return null;
      const filled = Math.min(quantity, order.remaining);
      order.remaining -= filled;
      if (order.remaining === 0) {
        order.status = "FILLED";
        const price = levels.peekPrice(fromEnd);
        const q = levels.get(price);
        q.shift();
        if (!q.length) levels.delete(price);
        this.index.delete(order.order_id);
      } else {
        order.status = "PARTIAL";
      }
      return order;
    }
    view() {
      const level = (q, price) => {
        const active = q.filter((o) => o.isActive);
        return active.length ? { price, quantity: active.reduce((s, o) => s + o.remaining, 0), order_count: active.length } : null;
      };
      const bids = [], asks = [];
      for (let i = this.bids.prices.length - 1; i >= 0; i--) {
        const p = this.bids.prices[i], l = level(this.bids.get(p), p);
        if (l) bids.push(l);
      }
      for (const p of this.asks.prices) {
        const l = level(this.asks.get(p), p);
        if (l) asks.push(l);
      }
      return bookView(this.symbol, bids, asks);
    }
    _peek(levels, fromEnd) {
      while (levels.size) {
        const price = levels.peekPrice(fromEnd);
        const q = levels.get(price);
        while (q.length && !q[0].isActive) q.shift();
        if (!q.length) { levels.delete(price); continue; }
        return q[0];
      }
      return null;
    }
  }

  // engine/trade.py OrderBookView
  function bookView(symbol, bids, asks) {
    const bestBid = bids.length ? bids[0].price : null;
    const bestAsk = asks.length ? asks[0].price : null;
    const both = bestBid !== null && bestAsk !== null;
    return { symbol, bids, asks, bestBid, bestAsk, spread: both ? bestAsk - bestBid : null, mid: both ? (bestBid + bestAsk) / 2 : null };
  }

  /* ---------- engine/matching_engine.py ---------- */
  class MatchingEngine {
    constructor() {
      this.books = new Map();
      this.knownIds = new Set();
      this.allTrades = [];
      this.sequence = 0;
      this.orderSeq = 0;
      this.tradeSeq = 0;
    }

    submit(order) {
      order.validate();
      if (order.order_id) {
        if (this.knownIds.has(order.order_id)) throw new InvalidOrderError(`duplicate order_id: ${order.order_id}`);
      } else {
        order.order_id = `O${++this.orderSeq}`;
      }
      this.knownIds.add(order.order_id);
      order.sequence = ++this.sequence;
      order.timestamp = new Date();
      order.status = "OPEN";
      order.remaining = order.quantity;

      const book = this._book(order.symbol);
      const trades = this._matchIncoming(order, book, order.side === "BUY" ? "SELL" : "BUY");

      if (order.remaining > 0) {
        if (order.order_type === "MARKET") {
          order.status = order.remaining === order.quantity ? "CANCELLED" : "PARTIAL";
        } else {
          if (order.remaining < order.quantity) order.status = "PARTIAL";
          book.add(order);
        }
      } else {
        order.status = "FILLED";
      }
      return trades;
    }

    cancel(orderId) {
      for (const book of this.books.values()) if (book.cancel(orderId)) return true;
      return false;
    }

    book(symbol) {
      symbol = symbol.trim().toUpperCase();
      return this.books.has(symbol) ? this.books.get(symbol).view() : bookView(symbol, [], []);
    }

    trades(symbol = null) {
      if (symbol === null) return this.allTrades.slice();
      symbol = symbol.trim().toUpperCase();
      return this.allTrades.filter((t) => t.symbol === symbol);
    }

    _book(symbol) {
      if (!this.books.has(symbol)) this.books.set(symbol, new IndexedOrderBook(symbol));
      return this.books.get(symbol);
    }

    _matchIncoming(incoming, book, restingSide) {
      const trades = [];
      while (incoming.remaining > 0) {
        const resting = restingSide === "BUY" ? book.bestBid() : book.bestAsk();
        if (!resting) break;
        if (incoming.order_type === "LIMIT") {
          if (restingSide === "SELL" && resting.price > incoming.price) break;
          if (restingSide === "BUY" && resting.price < incoming.price) break;
        }
        const quantity = Math.min(incoming.remaining, resting.remaining);
        const filled = book.fillBest(restingSide, quantity);
        if (!filled) break;
        incoming.remaining -= quantity;
        trades.push(this._recordTrade(incoming, filled, quantity, filled.price));
      }
      return trades;
    }

    _recordTrade(incoming, resting, quantity, price) {
      const [buy, sell] = incoming.side === "BUY" ? [incoming, resting] : [resting, incoming];
      const trade = Object.freeze({
        trade_id: `T${++this.tradeSeq}`,
        buy_order_id: buy.order_id || "",
        sell_order_id: sell.order_id || "",
        buyer_id: buy.trader_id,
        seller_id: sell.trader_id,
        symbol: incoming.symbol,
        quantity,
        price,
        timestamp: new Date(),
      });
      this.allTrades.push(trade);
      return trade;
    }
  }

  // api/server.py TimedMatchingEngine. One difference: browsers coarsen
  // performance.now() (~0.1 ms steps), so a single sub-microsecond submit
  // usually measures 0. The average of many coarse samples is still unbiased,
  // so latency is averaged over the whole session instead of the last 5 s.
  const STATS_WINDOW_MS = 5000;
  class TimedMatchingEngine extends MatchingEngine {
    constructor() {
      super();
      this.submitted = 0;
      this.lastLatencyMs = 0;
      this.started = performance.now();
      this.recent = [];
      this.totalLatencyMs = 0;
    }
    submit(order) {
      const t0 = performance.now();
      const trades = super.submit(order);
      const t1 = performance.now();
      this.submitted++;
      this.lastLatencyMs = t1 - t0;
      this.totalLatencyMs += this.lastLatencyMs;
      this.recent.push([t1, this.lastLatencyMs]);
      this._prune(t1);
      return trades;
    }
    windowStats() {
      const now = performance.now();
      this._prune(now);
      const span = Math.min(STATS_WINDOW_MS, now - this.started) / 1000;
      const n = this.recent.length;
      if (!n || span <= 0) return [0, 0];
      return [n / span, this.totalLatencyMs / this.submitted];
    }
    _prune(now) {
      while (this.recent.length && this.recent[0][0] < now - STATS_WINDOW_MS) this.recent.shift();
    }
  }

  /* ---------- strategies/ ---------- */
  const randint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  class MarketMaker {
    constructor({ trader_id = "mm", symbol, spread = 100_000, quantity = 10, inventory_tick = 10_000, max_inventory = 50, reference_price = 100 * SCALE }) {
      Object.assign(this, { trader_id, symbol, spread, quantity, inventory_tick, max_inventory, reference_price });
      this.liveIds = [];
      this.inventory = 0;
    }
    onTick(view) {
      const actions = this.liveIds.map((id) => ({ cancel: id }));
      this.liveIds = [];
      const mid = view.mid ?? view.lastPrice ?? this.reference_price;
      const skew = this.inventory_tick * this.inventory;
      // Long inventory -> lower both quotes to encourage selling.
      let bid = toTick(mid - this.spread / 2 - skew, "FLOOR");
      let ask = toTick(mid + this.spread / 2 - skew, "CEILING");
      if (bid <= 0) bid = TICK;
      if (ask <= bid) ask = toTick(bid + Math.max(this.spread, TICK), "CEILING");
      const bidId = `${this.trader_id}-bid-${view.tick}`;
      const askId = `${this.trader_id}-ask-${view.tick}`;
      this.liveIds = [bidId, askId];
      actions.push(
        { submit: new Order({ order_id: bidId, trader_id: this.trader_id, symbol: this.symbol, side: "BUY", quantity: this.quantity, price: bid }) },
        { submit: new Order({ order_id: askId, trader_id: this.trader_id, symbol: this.symbol, side: "SELL", quantity: this.quantity, price: ask }) },
      );
      return actions;
    }
  }

  class RandomTrader {
    constructor({ trader_id = "random", symbol, max_qty = 10, tick = 50_000, reference_price = 100 * SCALE }) {
      Object.assign(this, { trader_id, symbol, max_qty, tick, reference_price });
    }
    onTick(view) {
      const mid = view.mid ?? view.lastPrice ?? this.reference_price;
      const offset = randint(-4, 4) * this.tick;
      const side = Math.random() < 0.5 ? "BUY" : "SELL";
      let price = toTick(mid + offset);
      if (price <= 0) price = this.tick;
      const qty = randint(1, this.max_qty);
      return [{ submit: new Order({ trader_id: this.trader_id, symbol: this.symbol, side, quantity: qty, price }) }];
    }
  }

  class MomentumTrader {
    constructor({ trader_id = "momentum", symbol, lookback = 5, quantity = 5, offset = 50_000 }) {
      Object.assign(this, { trader_id, symbol, lookback, quantity, offset });
    }
    onTick(view) {
      const prices = view.recentTrades.slice(-this.lookback).map((t) => t.price);
      if (prices.length < 2) return [];
      const delta = prices[prices.length - 1] - prices[0];
      if (delta === 0) return [];
      const side = delta > 0 ? "BUY" : "SELL";
      const mid = view.mid ?? prices[prices.length - 1];
      const price = side === "BUY" ? toTick(mid + this.offset, "CEILING") : toTick(mid - this.offset, "FLOOR");
      if (price <= 0) return [];
      return [{ submit: new Order({ trader_id: this.trader_id, symbol: this.symbol, side, quantity: this.quantity, price }) }];
    }
  }

  // api/server.py scaled_bots: settings tuned for a $100 stock, scaled to the seed price
  function scaledBots(symbol, reference) {
    const k = reference / (100 * SCALE);
    const step = (base) => Math.max(TICK, toTick(base * k));
    return [
      new MarketMaker({ trader_id: "mm", symbol, spread: step(100_000), inventory_tick: 10_000 * k, reference_price: reference }),
      new RandomTrader({ trader_id: "rand", symbol, tick: step(50_000), reference_price: reference }),
      new MomentumTrader({ trader_id: "mom", symbol, offset: step(50_000) }),
    ];
  }

  /* ---------- simulation/simulator.py ---------- */
  class Simulator {
    constructor(engine, bots, symbol, startingCash) {
      this.engine = engine;
      this.bots = bots;
      this.symbol = symbol;
      this.tick = 0;
      this.botsRunning = true;
      this.startingCash = startingCash;
      this.states = new Map();
      for (const bot of bots) this.ensureTrader(bot.trader_id);
    }
    pause() { this.botsRunning = false; }
    resume() { this.botsRunning = true; }
    ensureTrader(traderId) {
      if (!this.states.has(traderId)) {
        this.states.set(traderId, { trader_id: traderId, cash: this.startingCash, inventory: new Map(), trade_count: 0, starting_cash: this.startingCash });
      }
      return this.states.get(traderId);
    }
    recordTrades(trades) { this._applyTrades(trades); }
    marketView() {
      const book = this.engine.book(this.symbol);
      const recentTrades = this.engine.trades(this.symbol).slice(-20);
      const lastPrice = recentTrades.length ? recentTrades[recentTrades.length - 1].price : null;
      return { tick: this.tick, symbol: this.symbol, book, recentTrades, lastPrice, bestBid: book.bestBid, bestAsk: book.bestAsk, mid: book.mid };
    }
    step() {
      if (!this.botsRunning) return [];
      const view = this.marketView();
      const produced = [];
      for (const bot of this.bots) {
        const state = this.states.get(bot.trader_id);
        if ("inventory" in bot) bot.inventory = state.inventory.get(this.symbol) || 0;
        for (const action of bot.onTick(view)) {
          if (action.cancel) { this.engine.cancel(action.cancel); continue; }
          let trades;
          try {
            trades = this.engine.submit(action.submit);
          } catch (e) {
            if (e instanceof InvalidOrderError) continue;
            throw e;
          }
          produced.push(...trades);
          this._applyTrades(trades);
        }
      }
      this.tick++;
      return produced;
    }
    snapshot() {
      const view = this.marketView();
      const mark = view.mid ?? view.lastPrice;
      const pnl = (s) => s.cash + (s.inventory.get(this.symbol) || 0) * (mark ?? 0) - s.starting_cash;
      return {
        tick: this.tick,
        symbol: this.symbol,
        bots_running: this.botsRunning,
        best_bid: fmt(view.bestBid),
        best_ask: fmt(view.bestAsk),
        spread: fmt(view.book.spread),
        last_price: fmt(view.lastPrice),
        bots: [...this.states.values()].map((s) => ({
          trader_id: s.trader_id,
          cash: fmt(s.cash),
          inventory: s.inventory.get(this.symbol) || 0,
          trades: s.trade_count,
          pnl: fmt(pnl(s)),
        })),
      };
    }
    _applyTrades(trades) {
      for (const t of trades) {
        const buyer = this.states.get(t.buyer_id);
        const seller = this.states.get(t.seller_id);
        const cost = t.price * t.quantity;
        if (buyer) {
          buyer.cash -= cost;
          buyer.inventory.set(t.symbol, (buyer.inventory.get(t.symbol) || 0) + t.quantity);
          buyer.trade_count++;
        }
        if (seller) {
          seller.cash += cost;
          seller.inventory.set(t.symbol, (seller.inventory.get(t.symbol) || 0) - t.quantity);
          seller.trade_count++;
        }
      }
    }
  }

  /* ---------- api/server.py ---------- */
  const STARTING_CASH = 100_000 * SCALE;
  const SYMBOL_RE = /^[A-Z0-9.^=\-]{1,15}$/;
  let sessionIds = 0;

  class Session {
    constructor(symbol, quote) {
      this.id = ++sessionIds;
      this.symbol = symbol;
      this.quote = quote;
      this.referencePrice = parsePrice(quote.price);
      this.engine = new TimedMatchingEngine();
      this.simulator = new Simulator(this.engine, scaledBots(symbol, this.referencePrice), symbol, STARTING_CASH);
      this.orders = new Map();
      this.startedAt = new Date();
    }
    toJSON() {
      return {
        session_id: this.id,
        symbol: this.symbol,
        reference_price: fmt(this.referencePrice),
        source: "yahoo",
        started_at: this.startedAt.toISOString(),
        quote: this.quote,
      };
    }
  }

  class HttpError extends Error {
    constructor(status, detail) { super(detail); this.status = status; this.detail = detail; }
  }

  const tradeJson = (t) => ({ ...t, price: fmt(t.price), timestamp: t.timestamp.toISOString() });
  const orderJson = (o) => ({
    order_id: o.order_id, trader_id: o.trader_id, symbol: o.symbol, side: o.side, order_type: o.order_type,
    price: fmt(o.price), quantity: o.quantity, remaining: o.remaining, status: o.status,
  });

  let QUOTES = {};
  let session = null;
  const ready = (async () => {
    const base = document.currentScript ? new URL(".", document.currentScript.src) : new URL(".", location.href);
    QUOTES = await (await realFetch(new URL("quotes.json", base))).json();
    session = new Session("AAPL", QUOTES.AAPL);
    // Same cadence as the server's background thread
    setInterval(() => session.simulator.step(), 250);
  })();

  function getBook(symbol) {
    const v = session.engine.book(symbol);
    return {
      symbol: v.symbol,
      best_bid: fmt(v.bestBid),
      best_ask: fmt(v.bestAsk),
      spread: fmt(v.spread),
      bids: v.bids.map((l) => ({ price: fmt(l.price), quantity: l.quantity })),
      asks: v.asks.map((l) => ({ price: fmt(l.price), quantity: l.quantity })),
    };
  }

  function getStats() {
    const s = session;
    const snap = s.simulator.snapshot();
    const [ordersPerSec, avgLatencyMs] = s.engine.windowStats();
    const trades = s.engine.trades(s.symbol);
    return Object.assign(snap, {
      session_id: s.id,
      reference_price: fmt(s.referencePrice),
      orders_submitted: s.engine.submitted,
      last_latency_ms: s.engine.lastLatencyMs,
      avg_latency_ms: avgLatencyMs,
      orders_per_sec: Math.round(ordersPerSec * 100) / 100,
      open_price: trades.length ? fmt(trades[0].price) : null,
      volume: trades.reduce((sum, t) => sum + t.quantity, 0),
      trade_count: trades.length,
    });
  }

  function createOrder(body) {
    if (!Number.isInteger(body.quantity) || body.quantity <= 0) {
      throw new HttpError(422, [{ loc: ["body", "quantity"], msg: "Input should be greater than 0" }]);
    }
    const traderId = body.trader_id ?? "human";
    if (!traderId || traderId.length > 32) {
      throw new HttpError(422, [{ loc: ["body", "trader_id"], msg: "String should have 1 to 32 characters" }]);
    }
    let order, trades;
    try {
      order = new Order({
        order_id: body.order_id ?? null,
        trader_id: traderId,
        symbol: body.symbol || session.symbol,
        side: body.side,
        quantity: body.quantity,
        price: body.price == null ? null : String(body.price),
        order_type: body.order_type ?? "LIMIT",
      });
      if (order.symbol !== session.symbol) {
        throw new InvalidOrderError(`this market trades ${session.symbol}; choose ${order.symbol} to trade it`);
      }
      session.simulator.ensureTrader(order.trader_id);
      trades = session.engine.submit(order);
      session.simulator.recordTrades(trades);
      if (order.order_type === "LIMIT" && order.isActive) session.orders.set(order.order_id, order);
    } catch (e) {
      if (e instanceof InvalidOrderError) throw new HttpError(400, e.message);
      throw e;
    }
    return { order_id: order.order_id, status: order.status, remaining: order.remaining, trader_id: order.trader_id, trades: trades.map(tradeJson) };
  }

  async function startSession(body) {
    const symbol = String(body.symbol || "").trim().toUpperCase();
    if (!SYMBOL_RE.test(symbol)) throw new HttpError(400, `not a valid ticker: '${symbol}'`);
    await new Promise((r) => setTimeout(r, 350)); // the real server makes a network call here
    const quote = QUOTES[symbol];
    if (!quote) {
      throw new HttpError(404, `${symbol}: not in this demo's quote snapshot. Try ${Object.keys(QUOTES).join(", ")}, or run ExchangeLab locally to trade any Yahoo ticker`);
    }
    session = new Session(symbol, quote);
    return session.toJSON();
  }

  async function route(method, url, body) {
    await ready;
    const path = url.pathname;
    const q = url.searchParams;
    if (path === "/session" && method === "GET") return session.toJSON();
    if (path === "/session" && method === "POST") return startSession(body);
    if (path === "/orders" && method === "POST") return createOrder(body);
    if (path === "/orders" && method === "GET") {
      for (const [id, o] of session.orders) if (!o.isActive) session.orders.delete(id);
      const traderId = q.get("trader_id");
      return [...session.orders.values()]
        .filter((o) => traderId === null || o.trader_id === traderId)
        .sort((a, b) => a.sequence - b.sequence)
        .map(orderJson);
    }
    let m = /^\/orders\/(.+)$/.exec(path);
    if (m && method === "DELETE") {
      const id = decodeURIComponent(m[1]);
      const ok = session.engine.cancel(id);
      session.orders.delete(id);
      if (!ok) throw new HttpError(404, "order not found");
      return { cancelled: true };
    }
    if (path === "/simulation/pause" && method === "POST") { session.simulator.pause(); return { bots_running: false }; }
    if (path === "/simulation/resume" && method === "POST") { session.simulator.resume(); return { bots_running: true }; }
    if (path === "/simulation" && method === "GET") {
      const s = session.simulator;
      return { bots_running: s.botsRunning, tick: s.tick, symbol: s.symbol, session_id: session.id };
    }
    m = /^\/book\/(.+)$/.exec(path);
    if (m && method === "GET") return getBook(decodeURIComponent(m[1]));
    if (path === "/trades" && method === "GET") {
      const symbol = q.get("symbol");
      const limit = Math.min(5000, Math.max(1, Number(q.get("limit") || 50)));
      return session.engine.trades(symbol).slice(-limit).map((t) => ({
        trade_id: t.trade_id, symbol: t.symbol, quantity: t.quantity, price: fmt(t.price),
        buy_order_id: t.buy_order_id, sell_order_id: t.sell_order_id, buyer_id: t.buyer_id, seller_id: t.seller_id,
        timestamp: t.timestamp.toISOString(),
      }));
    }
    if (path === "/stats" && method === "GET") return getStats();
    throw new HttpError(404, "Not Found");
  }

  /* ---------- fetch shim: answer the dashboard's API calls locally ---------- */
  const API = /^\/(session|orders|simulation|book|trades|stats)(\/|\?|$)/;
  window.fetch = async (input, init = {}) => {
    const raw = typeof input === "string" ? input : input.url;
    if (typeof raw !== "string" || !raw.startsWith("/") || !API.test(raw)) return realFetch(input, init);
    const url = new URL(raw, location.origin);
    const method = (init.method || "GET").toUpperCase();
    let body = null;
    try {
      body = init.body ? JSON.parse(init.body) : null;
    } catch {
      return json(422, { detail: "invalid JSON body" });
    }
    try {
      return json(200, await route(method, url, body || {}));
    } catch (e) {
      if (e instanceof HttpError) return json(e.status, { detail: e.detail });
      console.error(e);
      return json(500, { detail: "Internal error" });
    }
  };
  const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
})();
