/**
 * WLTH - Wealth Intelligence Dashboard
 * Award-worthy design with Three.js, GSAP, and Chart.js
 */

(function() {
    'use strict';

    // ==================== STATE MANAGEMENT ====================
    const State = {
        data: {
            transactions: JSON.parse(localStorage.getItem('wlth_transactions') || '[]'),
            investments: JSON.parse(localStorage.getItem('wlth_investments') || '[]'),
            currency: localStorage.getItem('wlth_currency') || 'USD',
            theme: localStorage.getItem('wlth_theme') || 'dark'
        },

        save(key) {
            localStorage.setItem('wlth_' + key, JSON.stringify(this.data[key]));
        },

        get netWorth() {
            const income = this.data.transactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);
            const expenses = this.data.transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);
            const investments = this.data.investments
                .reduce((sum, i) => sum + i.value, 0);
            return income - expenses + investments;
        },

        get monthlyIncome() {
            const now = new Date();
            const thisMonth = now.getMonth();
            const thisYear = now.getFullYear();
            return this.data.transactions
                .filter(t => {
                    const d = new Date(t.date);
                    return t.type === 'income' && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
                })
                .reduce((sum, t) => sum + t.amount, 0);
        },

        get monthlyExpenses() {
            const now = new Date();
            const thisMonth = now.getMonth();
            const thisYear = now.getFullYear();
            return this.data.transactions
                .filter(t => {
                    const d = new Date(t.date);
                    return t.type === 'expense' && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
                })
                .reduce((sum, t) => sum + t.amount, 0);
        },

        get totalInvestments() {
            return this.data.investments.reduce((sum, i) => sum + i.value, 0);
        },

        get savingsRate() {
            const income = this.monthlyIncome;
            if (income === 0) return 0;
            return Math.round(((income - this.monthlyExpenses) / income) * 100);
        }
    };

    // ==================== CURRENCY FORMATTER ====================
    const Currency = {
        symbols: { USD: '$', EUR: '€', GBP: '£', JPY: '¥', INR: '₹' },

        format(amount, showSign = false) {
            const symbol = this.symbols[State.data.currency] || '$';
            const formatted = Math.abs(amount).toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
            const sign = showSign && amount > 0 ? '+' : '';
            return sign + symbol + formatted;
        }
    };

    // ==================== THREE.JS BACKGROUND ====================
    const Background3D = {
        scene: null,
        camera: null,
        renderer: null,
        particles: null,

        init() {
            if (typeof THREE === 'undefined') return;

            const canvas = document.getElementById('bg-canvas');
            if (!canvas) return;

            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            this.camera.position.z = 50;

            this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            this.createParticles();
            this.animate();

            window.addEventListener('resize', () => this.onResize());
        },

        createParticles() {
            const geometry = new THREE.BufferGeometry();
            const count = 2000;
            const positions = new Float32Array(count * 3);
            const colors = new Float32Array(count * 3);

            const colorPalette = [
                [0, 1, 0.53],      // Green
                [0.31, 0.67, 1],   // Blue
                [0.66, 0.33, 0.97] // Purple
            ];

            for (let i = 0; i < count * 3; i += 3) {
                positions[i] = (Math.random() - 0.5) * 100;
                positions[i + 1] = (Math.random() - 0.5) * 100;
                positions[i + 2] = (Math.random() - 0.5) * 100;

                const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
                colors[i] = color[0];
                colors[i + 1] = color[1];
                colors[i + 2] = color[2];
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            const material = new THREE.PointsMaterial({
                size: 0.5,
                vertexColors: true,
                transparent: true,
                opacity: 0.6,
                sizeAttenuation: true
            });

            this.particles = new THREE.Points(geometry, material);
            this.scene.add(this.particles);
        },

        animate() {
            requestAnimationFrame(() => this.animate());

            if (this.particles) {
                this.particles.rotation.x += 0.0002;
                this.particles.rotation.y += 0.0003;
            }

            this.renderer.render(this.scene, this.camera);
        },

        onResize() {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    };

    // ==================== GSAP ANIMATIONS ====================
    const Animations = {
        init() {
            if (typeof gsap === 'undefined') return;

            gsap.registerPlugin(ScrollTrigger);

            this.initLoader();
            this.initScrollAnimations();
            this.initCounterAnimations();
            this.initCursorGlow();
        },

        initLoader() {
            const loader = document.getElementById('loader');
            const app = document.getElementById('app');

            gsap.to('.loader-progress', {
                width: '100%',
                duration: 2,
                ease: 'power2.out',
                onComplete: () => {
                    gsap.to(loader, {
                        opacity: 0,
                        duration: 0.5,
                        onComplete: () => {
                            loader.classList.add('hidden');
                            app.classList.add('loaded');
                            this.animateHero();
                        }
                    });
                }
            });
        },

        animateHero() {
            const tl = gsap.timeline();

            tl.from('.hero-badge', { opacity: 0, y: 30, duration: 0.6 })
              .from('.hero-title .title-line', { opacity: 0, y: 50, stagger: 0.2, duration: 0.8 }, '-=0.3')
              .from('.hero-subtitle', { opacity: 0, y: 30, duration: 0.6 }, '-=0.4')
              .from('.net-worth-display', { opacity: 0, y: 40, scale: 0.95, duration: 0.8 }, '-=0.3')
              .from('.scroll-indicator', { opacity: 0, duration: 0.5 }, '-=0.2');
        },

        initScrollAnimations() {
            // Stats cards
            gsap.utils.toArray('.stat-card').forEach((card, i) => {
                gsap.from(card, {
                    scrollTrigger: {
                        trigger: card,
                        start: 'top 85%'
                    },
                    opacity: 0,
                    y: 50,
                    duration: 0.6,
                    delay: i * 0.1
                });
            });

            // Portfolio section
            gsap.from('.portfolio-chart', {
                scrollTrigger: { trigger: '.portfolio-section', start: 'top 80%' },
                opacity: 0,
                x: -50,
                duration: 0.8
            });

            gsap.from('.asset-list', {
                scrollTrigger: { trigger: '.portfolio-section', start: 'top 80%' },
                opacity: 0,
                x: 50,
                duration: 0.8
            });

            // Asset items
            gsap.utils.toArray('.asset-item').forEach((item, i) => {
                gsap.from(item, {
                    scrollTrigger: { trigger: item, start: 'top 90%' },
                    opacity: 0,
                    x: 30,
                    duration: 0.5,
                    delay: i * 0.1
                });
            });

            // Analytics
            gsap.from('.main-chart', {
                scrollTrigger: { trigger: '.analytics-section', start: 'top 80%' },
                opacity: 0,
                y: 50,
                duration: 0.8
            });

            gsap.utils.toArray('.insight-card').forEach((card, i) => {
                gsap.from(card, {
                    scrollTrigger: { trigger: card, start: 'top 90%' },
                    opacity: 0,
                    x: 50,
                    duration: 0.5,
                    delay: i * 0.15
                });
            });
        },

        initCounterAnimations() {
            this.animateCounter('net-worth', State.netWorth, 2);
        },

        animateCounter(id, target, duration = 1) {
            const el = document.getElementById(id);
            if (!el) return;

            gsap.to({ val: 0 }, {
                val: target,
                duration,
                ease: 'power2.out',
                onUpdate: function() {
                    el.textContent = Math.round(this.targets()[0].val).toLocaleString();
                }
            });
        },

        initCursorGlow() {
            const glow = document.getElementById('cursor-glow');
            if (!glow || window.matchMedia('(max-width: 768px)').matches) return;

            document.addEventListener('mousemove', (e) => {
                gsap.to(glow, {
                    x: e.clientX,
                    y: e.clientY,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });
        }
    };

    // ==================== CHARTS ====================
    const Charts = {
        portfolioChart: null,
        wealthChart: null,

        init() {
            this.initPortfolioDonut();
            this.initWealthChart();
        },

        initPortfolioDonut() {
            const ctx = document.getElementById('portfolio-donut');
            if (!ctx) return;

            const data = {
                labels: ['Stocks & ETFs', 'Cryptocurrency', 'Real Estate', 'Bonds'],
                datasets: [{
                    data: [45, 20, 25, 10],
                    backgroundColor: [
                        'rgba(79, 172, 254, 0.8)',
                        'rgba(168, 85, 247, 0.8)',
                        'rgba(0, 255, 136, 0.8)',
                        'rgba(0, 217, 255, 0.8)'
                    ],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            };

            this.portfolioChart = new Chart(ctx, {
                type: 'doughnut',
                data,
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    cutout: '70%',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(10, 10, 15, 0.9)',
                            titleColor: '#fff',
                            bodyColor: 'rgba(255,255,255,0.7)',
                            padding: 12,
                            cornerRadius: 8,
                            displayColors: false
                        }
                    },
                    animation: {
                        animateRotate: true,
                        animateScale: true
                    }
                }
            });
        },

        initWealthChart() {
            const ctx = document.getElementById('wealth-chart');
            if (!ctx) return;

            const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const assets = [80000, 85000, 82000, 90000, 95000, 92000, 100000, 105000, 108000, 115000, 120000, 125000];
            const liabilities = [30000, 28000, 27000, 26000, 25000, 24000, 23000, 22000, 21000, 20000, 19000, 18000];

            const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(0, 255, 136, 0.3)');
            gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');

            const gradientRed = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
            gradientRed.addColorStop(0, 'rgba(255, 71, 87, 0.2)');
            gradientRed.addColorStop(1, 'rgba(255, 71, 87, 0)');

            this.wealthChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Assets',
                            data: assets,
                            borderColor: '#00ff88',
                            backgroundColor: gradient,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 6,
                            pointHoverBackgroundColor: '#00ff88',
                            borderWidth: 2
                        },
                        {
                            label: 'Liabilities',
                            data: liabilities,
                            borderColor: '#ff4757',
                            backgroundColor: gradientRed,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 6,
                            pointHoverBackgroundColor: '#ff4757',
                            borderWidth: 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(10, 10, 15, 0.9)',
                            titleColor: '#fff',
                            bodyColor: 'rgba(255,255,255,0.7)',
                            padding: 12,
                            cornerRadius: 8,
                            callbacks: {
                                label: (ctx) => ctx.dataset.label + ': ' + Currency.format(ctx.raw)
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: 'rgba(255,255,255,0.4)' }
                        },
                        y: {
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: {
                                color: 'rgba(255,255,255,0.4)',
                                callback: (val) => Currency.format(val)
                            }
                        }
                    }
                }
            });
        },

        update() {
            if (this.portfolioChart) this.portfolioChart.update();
            if (this.wealthChart) this.wealthChart.update();
        }
    };

    // ==================== UI INTERACTIONS ====================
    const UI = {
        init() {
            this.initNavigation();
            this.initMobileMenu();
            this.initModal();
            this.initQuickActions();
            this.initThemeToggle();
            this.initCurrencySelect();
            this.initTimeFilter();
            this.updateDashboard();
        },

        initNavigation() {
            const navLinks = document.querySelectorAll('.nav-link');

            navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const section = link.getAttribute('href');

                    navLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');

                    document.querySelector(section)?.scrollIntoView({ behavior: 'smooth' });

                    // Close mobile menu
                    document.getElementById('nav-links')?.classList.remove('active');
                });
            });
        },

        initMobileMenu() {
            const toggle = document.getElementById('mobile-menu');
            const navLinks = document.getElementById('nav-links');

            toggle?.addEventListener('click', () => {
                navLinks?.classList.toggle('active');
            });
        },

        initModal() {
            const modal = document.getElementById('transaction-modal');
            const form = document.getElementById('transaction-form');
            const closeBtn = document.getElementById('modal-close');
            const backdrop = modal?.querySelector('.modal-backdrop');

            closeBtn?.addEventListener('click', () => this.closeModal());
            backdrop?.addEventListener('click', () => this.closeModal());

            form?.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveTransaction();
            });

            // Set default date
            const dateInput = document.getElementById('tx-date');
            if (dateInput) {
                dateInput.valueAsDate = new Date();
            }
        },

        openModal(type = 'expense') {
            const modal = document.getElementById('transaction-modal');
            const title = document.getElementById('modal-title');
            const typeInput = document.getElementById('tx-type');

            const titles = {
                expense: 'Add Expense',
                income: 'Add Income',
                transfer: 'Add Transfer'
            };

            if (title) title.textContent = titles[type] || 'Add Transaction';
            if (typeInput) typeInput.value = type;

            modal?.classList.add('active');
            document.body.style.overflow = 'hidden';
        },

        closeModal() {
            const modal = document.getElementById('transaction-modal');
            const form = document.getElementById('transaction-form');

            modal?.classList.remove('active');
            document.body.style.overflow = '';
            form?.reset();
        },

        saveTransaction() {
            const description = document.getElementById('tx-description')?.value.trim();
            const amount = parseFloat(document.getElementById('tx-amount')?.value) || 0;
            const category = document.getElementById('tx-category')?.value;
            const date = document.getElementById('tx-date')?.value;
            const type = document.getElementById('tx-type')?.value || 'expense';

            if (!description || !amount || !category || !date) {
                return;
            }

            const transaction = {
                id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
                description,
                amount,
                category,
                date,
                type,
                createdAt: new Date().toISOString()
            };

            State.data.transactions.push(transaction);
            State.save('transactions');

            this.closeModal();
            this.updateDashboard();
            this.renderTransactions();

            // Animate counter update
            if (typeof gsap !== 'undefined') {
                Animations.animateCounter('net-worth', State.netWorth, 1);
            }
        },

        initQuickActions() {
            document.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const action = btn.dataset.action;
                    if (['expense', 'income', 'transfer'].includes(action)) {
                        this.openModal(action);
                    }
                });
            });
        },

        initThemeToggle() {
            const toggle = document.getElementById('theme-toggle');
            toggle?.addEventListener('click', () => {
                // Theme toggle logic (currently dark mode only)
                console.log('Theme toggle');
            });
        },

        initCurrencySelect() {
            const select = document.getElementById('currency-select');
            select?.addEventListener('change', (e) => {
                State.data.currency = e.target.value;
                localStorage.setItem('wlth_currency', e.target.value);
                this.updateDashboard();
            });

            // Set initial value
            if (select) select.value = State.data.currency;
        },

        initTimeFilter() {
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    // Filter logic would go here
                });
            });
        },

        updateDashboard() {
            // Update stat values
            const income = document.getElementById('stat-income');
            const expenses = document.getElementById('stat-expenses');
            const investments = document.getElementById('stat-investments');
            const savings = document.getElementById('stat-savings');
            const netWorth = document.getElementById('net-worth');
            const portfolioTotal = document.getElementById('portfolio-total');
            const currencySymbol = document.getElementById('currency-symbol');

            if (income) income.textContent = Currency.format(State.monthlyIncome);
            if (expenses) expenses.textContent = Currency.format(State.monthlyExpenses);
            if (investments) investments.textContent = Currency.format(State.totalInvestments);
            if (savings) savings.textContent = State.savingsRate + '%';
            if (netWorth) netWorth.textContent = Math.abs(State.netWorth).toLocaleString();
            if (portfolioTotal) portfolioTotal.textContent = Currency.format(State.totalInvestments || 100500);
            if (currencySymbol) currencySymbol.textContent = Currency.symbols[State.data.currency] || '$';

            // Update change indicator
            const changeEl = document.getElementById('net-worth-change');
            if (changeEl) {
                const isPositive = State.netWorth >= 0;
                changeEl.classList.toggle('positive', isPositive);
                changeEl.classList.toggle('negative', !isPositive);
            }
        },

        renderTransactions() {
            const container = document.getElementById('transactions-list');
            if (!container) return;

            const transactions = State.data.transactions.slice().reverse().slice(0, 10);

            if (transactions.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📊</div>
                        <h3>No transactions yet</h3>
                        <p>Start tracking your finances by adding your first transaction.</p>
                        <button class="btn-primary btn-glow" data-action="expense">
                            <span>Add Transaction</span>
                            <span class="btn-shimmer"></span>
                        </button>
                    </div>
                `;
                this.initQuickActions();
                return;
            }

            const categoryIcons = {
                housing: '🏠', food: '🍔', transport: '🚗', utilities: '💡',
                entertainment: '🎬', healthcare: '🏥', shopping: '🛍️',
                salary: '💼', investment: '📈', other: '📦'
            };

            container.innerHTML = transactions.map(tx => {
                const icon = categoryIcons[tx.category] || '📦';
                const dateStr = new Date(tx.date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric'
                });
                const amountClass = tx.type === 'expense' ? 'expense' : 'income';
                const sign = tx.type === 'expense' ? '-' : '+';

                return `
                    <div class="transaction-item">
                        <div class="tx-icon" style="background: var(--bg-card)">${icon}</div>
                        <div class="tx-info">
                            <span class="tx-description">${this.escapeHtml(tx.description)}</span>
                            <span class="tx-meta">${this.capitalizeFirst(tx.category)} • ${dateStr}</span>
                        </div>
                        <span class="tx-amount ${amountClass}">${sign}${Currency.format(tx.amount)}</span>
                    </div>
                `;
            }).join('');
        },

        escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },

        capitalizeFirst(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        }
    };

    // ==================== INITIALIZE ====================
    function init() {
        Background3D.init();
        Animations.init();

        // Wait for animations to complete
        setTimeout(() => {
            Charts.init();
            UI.init();
        }, 2500);
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
