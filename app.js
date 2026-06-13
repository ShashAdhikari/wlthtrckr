/**
 * WLTH - Wealth Intelligence Dashboard
 * Award-worthy design with Three.js, GSAP, and Chart.js
 *
 * Robust init: the UI works even if any CDN (Three.js / GSAP / Chart.js)
 * fails to load. Animations are pure enhancement and are always optional.
 */

(function() {
    'use strict';

    const hasGSAP = () => typeof window.gsap !== 'undefined';
    const hasTHREE = () => typeof window.THREE !== 'undefined';
    const hasChart = () => typeof window.Chart !== 'undefined';

    // ==================== STATE MANAGEMENT ====================
    const State = {
        data: {
            transactions: safeParse('wlth_transactions', []),
            investments: safeParse('wlth_investments', []),
            currency: localStorage.getItem('wlth_currency') || 'USD',
            theme: localStorage.getItem('wlth_theme') || 'dark'
        },

        save(key) {
            localStorage.setItem('wlth_' + key, JSON.stringify(this.data[key]));
        },

        get netWorth() {
            const income = this.sumByType('income');
            const expenses = this.sumByType('expense');
            return income - expenses + this.totalInvestments;
        },

        sumByType(type) {
            return this.data.transactions
                .filter(t => t.type === type)
                .reduce((sum, t) => sum + t.amount, 0);
        },

        sumByTypeThisMonth(type) {
            const now = new Date();
            const m = now.getMonth();
            const y = now.getFullYear();
            return this.data.transactions
                .filter(t => {
                    const d = new Date(t.date);
                    return t.type === type && d.getMonth() === m && d.getFullYear() === y;
                })
                .reduce((sum, t) => sum + t.amount, 0);
        },

        get monthlyIncome() { return this.sumByTypeThisMonth('income'); },
        get monthlyExpenses() { return this.sumByTypeThisMonth('expense'); },
        get totalInvestments() {
            return this.data.investments.reduce((sum, i) => sum + i.value, 0);
        },

        get savingsRate() {
            const income = this.monthlyIncome;
            if (income === 0) return 0;
            return Math.round(((income - this.monthlyExpenses) / income) * 100);
        }
    };

    function safeParse(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    // ==================== CURRENCY FORMATTER ====================
    const Currency = {
        symbols: { USD: '$', EUR: '€', GBP: '£', JPY: '¥', INR: '₹' },

        symbol() {
            return this.symbols[State.data.currency] || '$';
        },

        // Whole-number format for big headline figures.
        format(amount, showSign = false) {
            const formatted = Math.abs(amount).toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
            const sign = showSign && amount > 0 ? '+' : '';
            return sign + this.symbol() + formatted;
        },

        // Precise format for individual transaction line items (keeps cents).
        formatPrecise(amount) {
            const formatted = Math.abs(amount).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            return this.symbol() + formatted;
        }
    };

    // ==================== THREE.JS BACKGROUND ====================
    const Background3D = {
        renderer: null,
        rafId: null,

        init() {
            if (!hasTHREE()) return;
            const canvas = document.getElementById('bg-canvas');
            if (!canvas) return;

            try {
                this.scene = new THREE.Scene();
                this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
                this.camera.position.z = 50;

                this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

                this.createParticles();
                this.animate();

                window.addEventListener('resize', () => this.onResize());
            } catch (e) {
                // WebGL unavailable — fail silently, gradient orbs remain as backdrop.
                if (this.rafId) cancelAnimationFrame(this.rafId);
                if (canvas) canvas.style.display = 'none';
            }
        },

        createParticles() {
            const geometry = new THREE.BufferGeometry();
            const count = 2000;
            const positions = new Float32Array(count * 3);
            const colors = new Float32Array(count * 3);
            const palette = [[0, 1, 0.53], [0.31, 0.67, 1], [0.66, 0.33, 0.97]];

            for (let i = 0; i < count * 3; i += 3) {
                positions[i] = (Math.random() - 0.5) * 100;
                positions[i + 1] = (Math.random() - 0.5) * 100;
                positions[i + 2] = (Math.random() - 0.5) * 100;
                const c = palette[Math.floor(Math.random() * palette.length)];
                colors[i] = c[0]; colors[i + 1] = c[1]; colors[i + 2] = c[2];
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            this.particles = new THREE.Points(geometry, new THREE.PointsMaterial({
                size: 0.5, vertexColors: true, transparent: true, opacity: 0.6, sizeAttenuation: true
            }));
            this.scene.add(this.particles);
        },

        animate() {
            this.rafId = requestAnimationFrame(() => this.animate());
            if (this.particles) {
                this.particles.rotation.x += 0.0002;
                this.particles.rotation.y += 0.0003;
            }
            this.renderer.render(this.scene, this.camera);
        },

        onResize() {
            if (!this.renderer) return;
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    };

    // ==================== LOADER (robust, GSAP-optional) ====================
    const Loader = {
        done: false,

        hide() {
            if (this.done) return;
            this.done = true;

            const loader = document.getElementById('loader');
            const app = document.getElementById('app');
            if (app) app.classList.add('loaded');

            const finish = () => {
                if (loader) loader.classList.add('hidden');
                Animations.animateHero();
                Animations.runCounters();
            };

            if (hasGSAP() && loader) {
                gsap.to(loader, { opacity: 0, duration: 0.4, onComplete: finish });
            } else {
                finish();
            }
        }
    };

    // ==================== GSAP ANIMATIONS (all optional) ====================
    const Animations = {
        init() {
            if (!hasGSAP()) return;
            try {
                if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
                this.initScrollAnimations();
                this.initCursorGlow();
            } catch (e) { /* animations are non-critical */ }
        },

        animateHero() {
            if (!hasGSAP()) return;
            try {
                gsap.timeline()
                    .from('.hero-badge', { opacity: 0, y: 30, duration: 0.6 })
                    .from('.hero-title .title-line', { opacity: 0, y: 50, stagger: 0.2, duration: 0.8 }, '-=0.3')
                    .from('.hero-subtitle', { opacity: 0, y: 30, duration: 0.6 }, '-=0.4')
                    .from('.net-worth-display', { opacity: 0, y: 40, scale: 0.95, duration: 0.8 }, '-=0.3')
                    .from('.scroll-indicator', { opacity: 0, duration: 0.5 }, '-=0.2');
            } catch (e) {}
        },

        initScrollAnimations() {
            if (!window.ScrollTrigger) return;

            gsap.utils.toArray('.stat-card').forEach((card, i) => {
                gsap.from(card, {
                    scrollTrigger: { trigger: card, start: 'top 85%' },
                    opacity: 0, y: 50, duration: 0.6, delay: i * 0.1
                });
            });
            gsap.from('.portfolio-chart', {
                scrollTrigger: { trigger: '.portfolio-section', start: 'top 80%' },
                opacity: 0, x: -50, duration: 0.8
            });
            gsap.from('.asset-list', {
                scrollTrigger: { trigger: '.portfolio-section', start: 'top 80%' },
                opacity: 0, x: 50, duration: 0.8
            });
            gsap.from('.main-chart', {
                scrollTrigger: { trigger: '.analytics-section', start: 'top 80%' },
                opacity: 0, y: 50, duration: 0.8
            });
            gsap.utils.toArray('.insight-card').forEach((card, i) => {
                gsap.from(card, {
                    scrollTrigger: { trigger: card, start: 'top 90%' },
                    opacity: 0, x: 50, duration: 0.5, delay: i * 0.15
                });
            });
        },

        runCounters() {
            this.animateCounter('net-worth', State.netWorth, 1.6);
        },

        animateCounter(id, target, duration = 1) {
            const el = document.getElementById(id);
            if (!el) return;
            if (!hasGSAP()) {
                el.textContent = Math.round(Math.abs(target)).toLocaleString();
                return;
            }
            gsap.to({ val: 0 }, {
                val: Math.abs(target), duration, ease: 'power2.out',
                onUpdate: function() {
                    el.textContent = Math.round(this.targets()[0].val).toLocaleString();
                }
            });
        },

        initCursorGlow() {
            const glow = document.getElementById('cursor-glow');
            if (!glow || window.matchMedia('(max-width: 768px)').matches) return;
            document.addEventListener('mousemove', (e) => {
                gsap.to(glow, { x: e.clientX, y: e.clientY, duration: 0.3, ease: 'power2.out' });
            });
        }
    };

    // ==================== CHARTS (Chart.js optional) ====================
    const Charts = {
        portfolioChart: null,
        wealthChart: null,

        init() {
            if (!hasChart()) {
                document.querySelectorAll('.portfolio-chart, .main-chart').forEach(el => {
                    el.classList.add('chart-unavailable');
                });
                return;
            }
            this.initPortfolioDonut();
            this.initWealthChart();
        },

        initPortfolioDonut() {
            const ctx = document.getElementById('portfolio-donut');
            if (!ctx) return;
            this.portfolioChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Stocks & ETFs', 'Cryptocurrency', 'Real Estate', 'Bonds'],
                    datasets: [{
                        data: [45, 20, 25, 10],
                        backgroundColor: [
                            'rgba(79, 172, 254, 0.85)',
                            'rgba(168, 85, 247, 0.85)',
                            'rgba(0, 255, 136, 0.85)',
                            'rgba(0, 217, 255, 0.85)'
                        ],
                        borderWidth: 0,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    cutout: '70%',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(10, 10, 15, 0.9)',
                            titleColor: '#fff', bodyColor: 'rgba(255,255,255,0.7)',
                            padding: 12, cornerRadius: 8, displayColors: false,
                            callbacks: { label: (c) => c.label + ': ' + c.raw + '%' }
                        }
                    }
                }
            });
        },

        initWealthChart() {
            const ctx = document.getElementById('wealth-chart');
            if (!ctx) return;

            const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const assets = [80000,85000,82000,90000,95000,92000,100000,105000,108000,115000,120000,125000];
            const liabilities = [30000,28000,27000,26000,25000,24000,23000,22000,21000,20000,19000,18000];

            const g = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
            g.addColorStop(0, 'rgba(0, 255, 136, 0.3)');
            g.addColorStop(1, 'rgba(0, 255, 136, 0)');
            const gr = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
            gr.addColorStop(0, 'rgba(255, 71, 87, 0.2)');
            gr.addColorStop(1, 'rgba(255, 71, 87, 0)');

            this.wealthChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        { label: 'Assets', data: assets, borderColor: '#00ff88', backgroundColor: g,
                          fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 6,
                          pointHoverBackgroundColor: '#00ff88', borderWidth: 2 },
                        { label: 'Liabilities', data: liabilities, borderColor: '#ff4757', backgroundColor: gr,
                          fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 6,
                          pointHoverBackgroundColor: '#ff4757', borderWidth: 2 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(10, 10, 15, 0.9)',
                            titleColor: '#fff', bodyColor: 'rgba(255,255,255,0.7)',
                            padding: 12, cornerRadius: 8,
                            callbacks: { label: (c) => c.dataset.label + ': ' + Currency.format(c.raw) }
                        }
                    },
                    scales: {
                        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.4)' } },
                        y: { grid: { color: 'rgba(255,255,255,0.05)' },
                             ticks: { color: 'rgba(255,255,255,0.4)', callback: (v) => Currency.format(v) } }
                    }
                }
            });
        }
    };

    // ==================== TOAST NOTIFICATIONS ====================
    const Toast = {
        show(message, type = 'success') {
            const el = document.createElement('div');
            el.className = 'toast toast-' + type;
            el.textContent = message;
            document.body.appendChild(el);
            requestAnimationFrame(() => el.classList.add('visible'));
            setTimeout(() => {
                el.classList.remove('visible');
                setTimeout(() => el.remove(), 300);
            }, 2600);
        }
    };

    // ==================== UI ====================
    const UI = {
        init() {
            this.initNavigation();
            this.initMobileMenu();
            this.initModal();
            this.initThemeToggle();
            this.initCurrencySelect();
            this.initTimeFilter();
            this.initSearch();
            this.initDelegatedActions();   // single delegated handler (no double-binding)
            this.applyTheme(State.data.theme);
            this.updateDashboard();
            this.renderTransactions();
        },

        // ---- Single delegated click handler for every [data-action] in the app ----
        initDelegatedActions() {
            document.addEventListener('click', (e) => {
                const trigger = e.target.closest('[data-action]');
                if (!trigger) return;
                const action = trigger.dataset.action;
                if (['expense', 'income', 'transfer'].includes(action)) {
                    e.preventDefault();
                    this.openModal(action);
                }
            });

            const addAsset = document.getElementById('add-asset-btn');
            if (addAsset) {
                addAsset.addEventListener('click', () => this.openModal('investment'));
            }
            document.querySelectorAll('.insight-action').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('analytics')?.scrollIntoView({ behavior: 'smooth' });
                });
            });
        },

        initNavigation() {
            const links = document.querySelectorAll('.nav-link');
            links.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = link.getAttribute('href');
                    links.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                    document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
                    document.getElementById('nav-links')?.classList.remove('active');
                });
            });

            // Deterministic scroll-spy: highlight the section currently under
            // the upper third of the viewport; default to Dashboard at the top.
            const ids = ['dashboard', 'portfolio', 'analytics', 'transactions'];
            const sections = ids.map(id => document.getElementById(id)).filter(Boolean);
            if (!sections.length) return;

            let ticking = false;
            const spy = () => {
                ticking = false;
                const line = window.scrollY + window.innerHeight * 0.33;
                let currentId = sections[0].id;
                for (const s of sections) {
                    if (s.offsetTop <= line) currentId = s.id;
                }
                links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + currentId));
            };
            window.addEventListener('scroll', () => {
                if (!ticking) { ticking = true; requestAnimationFrame(spy); }
            }, { passive: true });
            spy();
        },

        initMobileMenu() {
            const toggle = document.getElementById('mobile-menu');
            const navLinks = document.getElementById('nav-links');
            toggle?.addEventListener('click', () => {
                const open = navLinks?.classList.toggle('active');
                toggle.classList.toggle('open', open);
            });
        },

        initModal() {
            const modal = document.getElementById('transaction-modal');
            const form = document.getElementById('transaction-form');
            const closeBtn = document.getElementById('modal-close');
            const backdrop = modal?.querySelector('.modal-backdrop');

            closeBtn?.addEventListener('click', () => this.closeModal());
            backdrop?.addEventListener('click', () => this.closeModal());
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.closeModal();
            });
            form?.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveTransaction();
            });

            const dateInput = document.getElementById('tx-date');
            if (dateInput) dateInput.valueAsDate = new Date();
        },

        openModal(type = 'expense') {
            const modal = document.getElementById('transaction-modal');
            const title = document.getElementById('modal-title');
            const typeInput = document.getElementById('tx-type');
            const prefix = document.querySelector('.input-prefix');
            const titles = {
                expense: 'Add Expense', income: 'Add Income',
                transfer: 'Add Transfer', investment: 'Add Investment'
            };
            if (title) title.textContent = titles[type] || 'Add Transaction';
            if (typeInput) typeInput.value = type === 'transfer' ? 'expense' : type;
            if (prefix) prefix.textContent = Currency.symbol();
            modal?.classList.add('active');
            document.body.style.overflow = 'hidden';
            setTimeout(() => document.getElementById('tx-description')?.focus(), 100);
        },

        closeModal() {
            const modal = document.getElementById('transaction-modal');
            const form = document.getElementById('transaction-form');
            if (!modal?.classList.contains('active')) return;
            modal.classList.remove('active');
            document.body.style.overflow = '';
            form?.reset();
            const dateInput = document.getElementById('tx-date');
            if (dateInput) dateInput.valueAsDate = new Date();
        },

        saveTransaction() {
            const description = document.getElementById('tx-description')?.value.trim();
            const amount = parseFloat(document.getElementById('tx-amount')?.value);
            const category = document.getElementById('tx-category')?.value;
            const date = document.getElementById('tx-date')?.value;
            let type = document.getElementById('tx-type')?.value || 'expense';

            if (!description || !(amount > 0) || !category || !date) {
                Toast.show('Please fill in all fields with a valid amount', 'error');
                return;
            }

            // Income categories save as income even if opened from a generic modal.
            if (category === 'salary') type = 'income';
            if (category === 'investment') type = 'investment';

            State.data.transactions.push({
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 9),
                description, amount, category, date, type,
                createdAt: new Date().toISOString()
            });
            State.save('transactions');

            this.closeModal();
            this.updateDashboard();
            this.renderTransactions();
            Animations.animateCounter('net-worth', State.netWorth, 0.8);
            Toast.show('Transaction saved');
        },

        initThemeToggle() {
            document.getElementById('theme-toggle')?.addEventListener('click', () => {
                const next = State.data.theme === 'dark' ? 'light' : 'dark';
                State.data.theme = next;
                localStorage.setItem('wlth_theme', next);
                this.applyTheme(next);
            });
        },

        applyTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute('content', theme === 'light' ? '#f4f5fb' : '#0a0a0f');
        },

        initCurrencySelect() {
            const select = document.getElementById('currency-select');
            if (!select) return;
            select.value = State.data.currency;
            select.addEventListener('change', (e) => {
                State.data.currency = e.target.value;
                localStorage.setItem('wlth_currency', e.target.value);
                this.updateDashboard();
                this.renderTransactions();
            });
        },

        initTimeFilter() {
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });
        },

        initSearch() {
            const input = document.getElementById('tx-search');
            if (!input) return;
            input.addEventListener('input', () => this.renderTransactions(input.value.trim().toLowerCase()));
        },

        updateDashboard() {
            const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
            set('stat-income', Currency.format(State.monthlyIncome));
            set('stat-expenses', Currency.format(State.monthlyExpenses));
            set('stat-investments', Currency.format(State.totalInvestments));
            set('stat-savings', State.savingsRate + '%');
            set('portfolio-total', Currency.format(State.totalInvestments || 100500));
            set('currency-symbol', Currency.symbol());

            const nw = document.getElementById('net-worth');
            if (nw) nw.textContent = Math.round(Math.abs(State.netWorth)).toLocaleString();

            // Reflect a negative net worth with a leading minus + red styling.
            const currencyEl = document.getElementById('currency-symbol');
            if (currencyEl) currencyEl.textContent = (State.netWorth < 0 ? '-' : '') + Currency.symbol();

            const change = document.getElementById('net-worth-change');
            if (change) {
                const positive = State.netWorth >= 0;
                change.classList.toggle('positive', positive);
                change.classList.toggle('negative', !positive);
            }
        },

        renderTransactions(query = '') {
            const container = document.getElementById('transactions-list');
            if (!container) return;

            let list = State.data.transactions.slice().reverse();
            if (query) {
                list = list.filter(t =>
                    t.description.toLowerCase().includes(query) ||
                    t.category.toLowerCase().includes(query));
            }
            list = list.slice(0, 12);

            if (list.length === 0) {
                container.innerHTML = query
                    ? `<div class="empty-state"><div class="empty-icon">🔍</div>
                         <h3>No matches</h3><p>No transactions match "${escapeHtml(query)}".</p></div>`
                    : `<div class="empty-state"><div class="empty-icon">📊</div>
                         <h3>No transactions yet</h3>
                         <p>Start tracking your finances by adding your first transaction.</p>
                         <button class="btn-primary btn-glow" data-action="expense">
                           <span>Add Transaction</span><span class="btn-shimmer"></span></button></div>`;
                return;
            }

            const icons = {
                housing:'🏠', food:'🍔', transport:'🚗', utilities:'💡', entertainment:'🎬',
                healthcare:'🏥', shopping:'🛍️', salary:'💼', investment:'📈', other:'📦'
            };

            container.innerHTML = list.map(tx => {
                const icon = icons[tx.category] || '📦';
                const dateStr = new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const isExpense = tx.type === 'expense';
                const cls = isExpense ? 'expense' : 'income';
                const sign = isExpense ? '−' : '+';
                return `
                    <div class="transaction-item">
                        <div class="tx-icon">${icon}</div>
                        <div class="tx-info">
                            <span class="tx-description">${escapeHtml(tx.description)}</span>
                            <span class="tx-meta">${capitalize(tx.category)} • ${dateStr}</span>
                        </div>
                        <span class="tx-amount ${cls}">${sign}${Currency.formatPrecise(tx.amount)}</span>
                    </div>`;
            }).join('');
        }
    };

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // ==================== INIT ====================
    function init() {
        // Core UI first — never gated on any CDN.
        Charts.init();
        UI.init();
        Background3D.init();
        Animations.init();

        // Hide the loader on full load, with a hard fallback so it can never get stuck.
        if (document.readyState === 'complete') {
            setTimeout(() => Loader.hide(), 600);
        } else {
            window.addEventListener('load', () => setTimeout(() => Loader.hide(), 400));
        }
        setTimeout(() => Loader.hide(), 2500); // absolute safety net
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
