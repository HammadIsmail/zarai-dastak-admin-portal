import Alpine from 'alpinejs';
import htmx from 'htmx.org';
import { initIcons } from './icons.js';
import {
  renderBookingTrendChart,
  renderStatusDonutChart,
  renderDailyRevenueChart,
  renderTopProvidersChart,
  renderCategoryChart,
  renderProviderMonthlyChart,
  destroyChart,
} from './charts.js';

// Expose HTMX 4 globally
window.htmx = htmx;

// HTMX 4 Configuration
// 1. Enable built-in morphing as default swap style for seamless DOM transitions
htmx.config.defaultSwapStyle = 'morph';
// 2. Set implicit inheritance for smooth compatibility
htmx.config.implicitInheritance = true;

// Automatically inject Authorization Bearer token into all HTMX 4 fetch requests
document.addEventListener('htmx:config:request', (event) => {
  const token = localStorage.getItem('haulistry_admin_token');
  if (token && event.detail && event.detail.headers) {
    event.detail.headers['Authorization'] = `Bearer ${token}`;
  }
});

// Re-render Lucide icons after any HTMX 4 DOM swap
document.addEventListener('htmx:after:swap', () => {
  initIcons();
});

export function adminApp() {
  return {
    // Auth State
    token: localStorage.getItem('haulistry_admin_token') || '',
    user: JSON.parse(localStorage.getItem('haulistry_admin_user') || '{}'),
    isLoggedIn: false,
    authTab: 'login', // 'login' | 'signup'
    loginForm: { username: 'admin', password: '', loading: false, error: '' },
    signupForm: { username: '', email: '', password: '', confirm: '', setup_code: 'haulistry-setup-2025', loading: false, error: '' },

    // Navigation & UI
    currentTab: 'dashboard',
    sidebarOpen: true,
    mobileMenuOpen: false,
    toasts: [],

    // Skeleton Loading States per view
    loading: {
      dashboard: false,
      verifications: false,
      providers: false,
      seekers: false,
      services: false,
      vehicles: false,
      bookings: false,
      transactions: false,
      analytics: false,
      notifications: false,
      complaints: false,
      audit: false,
      users: false,
    },
    stats: {
      totalUsers: 0,
      totalProviders: 0,
      totalSeekers: 0,
      pendingVerifications: 0,
      totalBookings: 0,
      completedBookings: 0,
      totalRevenue: 0,
      avgBookingValue: 0,
    },
    trendDays: 30,
    recentActivity: [],

    // Verifications
    pendingProviders: [],
    pendingVehicles: [],
    verifSubTab: 'providers', // 'providers' | 'vehicles'
    rejectModal: { open: false, providerId: null, providerName: '', reason: '' },

    // Providers
    providersList: [],
    providersFilter: { search: '', status: 'all', page: 0 },
    providerDetailModal: { open: false, data: null, performance: null, loading: false },

    // Seekers
    seekersList: [],
    seekersFilter: { search: '', status: 'all', page: 0 },
    seekerDetailModal: { open: false, data: null },

    // Services
    servicesList: [],
    categoriesList: [],
    servicesFilter: { search: '', category: 'All', status: 'All' },

    // Vehicles
    vehiclesList: [],
    vehiclesFilter: { search: '', type: 'All', avail: 'All', ver: 'All' },
    vehicleDetailModal: { open: false, data: null },

    // Bookings
    bookingsList: [],
    bookingsFilter: { search: '', status: 'All', page: 0 },
    bookingDetailModal: { open: false, data: null },
    cancelBookingModal: { open: false, bookingId: null, reason: '' },

    // Transactions & Earnings
    txTab: 'overview', // 'overview' | 'providers'
    txDays: 30,
    txOverview: {
      grossRevenue: 0,
      platformCommission: 0,
      netToProviders: 0,
      avgBookingValue: 0,
      completedBookings: 0,
      commissionRate: 0.10,
    },
    providersEarnings: [],
    providerEarningsModal: { open: false, summary: null, monthly: [], transactions: [] },

    // Analytics
    analyticsDays: 30,
    analyticsData: null,

    // Notifications
    notifsList: [],
    notifsFilter: { search: '', type: 'All', read: 'All' },
    sendNotifModal: { open: false, userId: '', title: '', body: '', type: 'admin_notification', loading: false },

    // Complaints
    complaintsTab: 'low_ratings', // 'low_ratings' | 'cancelled' | 'rejected'
    complaintsData: { lowRatings: [], cancelledBookings: [], rejectedBookings: [], counts: {} },

    // Audit Logs
    auditLimit: 50,
    auditLogs: [],

    // Admin Users & Settings
    adminUsersList: [],
    passwordForm: { current: '', new: '', confirm: '', loading: false },

    // Document Lightbox Modal
    lightbox: { open: false, title: '', src: '' },

    // ── Init Lifecycle ──────────────────────────────────────────────────────────
    init() {
      if (this.token) {
        this.isLoggedIn = true;
        this.loadCurrentUserData();
        this.loadTabData();
      }

      this.$nextTick(() => {
        initIcons();
      });

      // Periodic Lucide icon re-scan after DOM mutations
      window.addEventListener('icons-updated', () => {
        this.$nextTick(() => initIcons());
      });
    },

    // ── API Helper ────────────────────────────────────────────────────────────
    async api(path, options = {}) {
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      };
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      try {
        const res = await fetch(path, { ...options, headers });
        if (res.status === 401) {
          if (!path.includes('/auth/login')) {
            this.logout('Session expired. Please sign in again.');
          }
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || 'Invalid username or password');
        }
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || data.message || 'Request failed');
        }
        return data;
      } catch (err) {
        if (err.message !== 'Unauthorized') {
          console.error(`API Error on ${path}:`, err);
        }
        throw err;
      }
    },

    // ── Toast Alerts ──────────────────────────────────────────────────────────
    showToast(message, type = 'success') {
      const id = Date.now();
      this.toasts.push({ id, message, type });
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id);
      }, 4000);
      this.$nextTick(() => initIcons());
    },

    removeToast(id) {
      this.toasts = this.toasts.filter(t => t.id !== id);
    },

    // ── Formatters ────────────────────────────────────────────────────────────
    formatCurrency(val) {
      const num = Number(val) || 0;
      return 'PKR ' + num.toLocaleString();
    },

    formatNumber(val) {
      return (Number(val) || 0).toLocaleString();
    },

    formatDate(val) {
      if (!val) return '—';
      try {
        const d = new Date(val);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch {
        return String(val).slice(0, 10);
      }
    },

    formatDateTime(val) {
      if (!val) return '—';
      try {
        const d = new Date(val);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
               d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      } catch {
        return String(val);
      }
    },

    // ── Authentication ────────────────────────────────────────────────────────
    async handleLogin() {
      this.loginForm.loading = true;
      this.loginForm.error = '';
      try {
        const res = await this.api('/api/admin/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            username: this.loginForm.username,
            password: this.loginForm.password,
          }),
        });

        this.token = res.data.token;
        this.user = res.data;
        localStorage.setItem('haulistry_admin_token', this.token);
        localStorage.setItem('haulistry_admin_user', JSON.stringify(this.user));
        this.isLoggedIn = true;
        this.loginForm.password = '';
        this.showToast(`Welcome back, ${this.user.username}!`);
        this.loadTabData();
      } catch (err) {
        this.loginForm.error = err.message || 'Login failed';
      } finally {
        this.loginForm.loading = false;
        this.$nextTick(() => initIcons());
      }
    },

    async handleSignup() {
      this.signupForm.loading = true;
      this.signupForm.error = '';
      try {
        const res = await this.api('/api/admin/auth/signup', {
          method: 'POST',
          body: JSON.stringify(this.signupForm),
        });

        this.token = res.data.token;
        this.user = res.data;
        localStorage.setItem('haulistry_admin_token', this.token);
        localStorage.setItem('haulistry_admin_user', JSON.stringify(this.user));
        this.isLoggedIn = true;
        this.showToast('Admin account created successfully!');
        this.loadTabData();
      } catch (err) {
        this.signupForm.error = err.message || 'Signup failed';
      } finally {
        this.signupForm.loading = false;
        this.$nextTick(() => initIcons());
      }
    },

    async loadCurrentUserData() {
      try {
        const res = await this.api('/api/admin/auth/me');
        if (res.admin) {
          this.user = res.admin;
          localStorage.setItem('haulistry_admin_user', JSON.stringify(this.user));
        }
      } catch (err) {
        // ignore
      }
    },

    logout(msg = 'Logged out successfully') {
      this.token = '';
      this.user = {};
      this.isLoggedIn = false;
      localStorage.removeItem('haulistry_admin_token');
      localStorage.removeItem('haulistry_admin_user');
      this.showToast(msg, 'info');
      this.$nextTick(() => initIcons());
    },

    async handleChangePassword() {
      if (this.passwordForm.new !== this.passwordForm.confirm) {
        this.showToast('New passwords do not match.', 'error');
        return;
      }
      this.passwordForm.loading = true;
      try {
        await this.api('/api/admin/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({
            current_password: this.passwordForm.current,
            new_password: this.passwordForm.new,
            confirm_password: this.passwordForm.confirm,
          }),
        });
        this.showToast('Password updated successfully.');
        this.passwordForm = { current: '', new: '', confirm: '', loading: false };
      } catch (err) {
        this.showToast(err.message, 'error');
      } finally {
        this.passwordForm.loading = false;
      }
    },

    // ── Navigation ────────────────────────────────────────────────────────────
    setTab(tab) {
      this.currentTab = tab;
      this.mobileMenuOpen = false;
      this.loadTabData();
      this.$nextTick(() => {
        initIcons();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    },

    loadTabData() {
      if (!this.isLoggedIn) return;

      switch (this.currentTab) {
        case 'dashboard':
          this.loadDashboard();
          break;
        case 'verifications':
          this.loadVerifications();
          break;
        case 'providers':
          this.loadProviders();
          break;
        case 'seekers':
          this.loadSeekers();
          break;
        case 'services':
          this.loadServices();
          break;
        case 'vehicles':
          this.loadVehicles();
          break;
        case 'bookings':
          this.loadBookings();
          break;
        case 'transactions':
          this.loadTransactions();
          break;
        case 'analytics':
          this.loadAnalytics();
          break;
        case 'notifications':
          this.loadNotifications();
          break;
        case 'complaints':
          this.loadComplaints();
          break;
        case 'audit':
          this.loadAuditLogs();
          break;
        case 'users':
          this.loadAdminUsers();
          break;
        case 'settings':
          this.loadCurrentUserData();
          break;
      }
    },

    // ── Dashboard Data ────────────────────────────────────────────────────────
    async loadDashboard() {
      this.loading.dashboard = true;
      try {
        const statsRes = await this.api('/api/admin/stats');
        this.stats = statsRes.stats;

        const analyticsRes = await this.api(`/api/admin/analytics?days=${this.trendDays}`);
        this.recentActivity = (await this.api('/api/admin/audit-logs?limit=8')).logs;

        this.$nextTick(() => {
          renderBookingTrendChart(document.getElementById('chart-dashboard-trend'), analyticsRes.trend);
          renderStatusDonutChart(document.getElementById('chart-dashboard-status'), analyticsRes.statusDistribution);
          renderDailyRevenueChart(document.getElementById('chart-dashboard-revenue'), analyticsRes.dailyRevenue);
          renderTopProvidersChart(document.getElementById('chart-dashboard-top-prov'), analyticsRes.topProviders);
          initIcons();
        });
      } catch (err) {
        this.showToast('Failed to load dashboard data: ' + err.message, 'error');
      } finally {
        this.loading.dashboard = false;
        this.$nextTick(() => initIcons());
      }
    },

    // ── Verifications ─────────────────────────────────────────────────────────
    async loadVerifications() {
      this.loading.verifications = true;
      try {
        const provRes = await this.api('/api/admin/verifications/pending');
        this.pendingProviders = provRes.providers;

        const vehRes = await this.api('/api/admin/verifications/vehicles/pending');
        this.pendingVehicles = vehRes.vehicles;
        this.$nextTick(() => initIcons());
      } catch (err) {
        this.showToast('Failed to load verifications: ' + err.message, 'error');
      } finally {
        this.loading.verifications = false;
        this.$nextTick(() => initIcons());
      }
    },

    async approveProvider(id) {
      if (!confirm('Approve this provider? Their account will be activated and a verification notification dispatched.')) return;
      try {
        await this.api(`/api/admin/verifications/${id}/approve`, { method: 'POST' });
        this.showToast('Provider approved successfully.');
        this.loadVerifications();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    },

    openRejectModal(provider) {
      this.rejectModal = {
        open: true,
        providerId: provider.id,
        providerName: provider.name,
        reason: '',
      };
      this.$nextTick(() => initIcons());
    },

    async submitReject() {
      if (!this.rejectModal.reason.trim()) {
        this.showToast('Rejection reason is required.', 'error');
        return;
      }
      try {
        await this.api(`/api/admin/verifications/${this.rejectModal.providerId}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason: this.rejectModal.reason }),
        });
        this.showToast('Provider application rejected.');
        this.rejectModal.open = false;
        this.loadVerifications();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    },

    async reviewVehicle(id) {
      try {
        await this.api(`/api/admin/verifications/vehicles/${id}/review`, { method: 'POST' });
        this.showToast('Vehicle marked as reviewed.');
        this.loadVerifications();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    },

    // ── Providers ─────────────────────────────────────────────────────────────
    async loadProviders() {
      this.loading.providers = true;
      try {
        const { search, status, page } = this.providersFilter;
        let url = `/api/admin/providers?page=${page}&size=50`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (status && status !== 'all') url += `&status=${status}`;

        const res = await this.api(url);
        this.providersList = res.providers;
        this.$nextTick(() => initIcons());
      } catch (err) {
        this.showToast('Failed to load providers: ' + err.message, 'error');
      } finally {
        this.loading.providers = false;
        this.$nextTick(() => initIcons());
      }
    },

    async inspectProvider(id) {
      this.providerDetailModal = { open: true, data: null, performance: null, loading: true };
      try {
        const res = await this.api(`/api/admin/providers/${id}`);
        this.providerDetailModal.data = res.provider;
        this.providerDetailModal.performance = res.performance;
      } catch (err) {
        this.showToast('Failed to load provider details: ' + err.message, 'error');
        this.providerDetailModal.open = false;
      } finally {
        this.providerDetailModal.loading = false;
        this.$nextTick(() => initIcons());
      }
    },

    async toggleProviderStatus(id, active) {
      try {
        await this.api(`/api/admin/providers/${id}/toggle-status`, {
            method: 'POST',
            body: JSON.stringify({ active }),
        });
        this.showToast(`Provider ${active ? 'activated' : 'deactivated'}.`);
        if (this.providerDetailModal.open && this.providerDetailModal.data) {
          this.providerDetailModal.data.isActive = active;
        }
        this.loadProviders();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    },

    async deleteProvider(id) {
      if (!confirm('DANGER: Permanently delete this provider and all cascade data (vehicles, services, bookings, chat, feedback)?')) return;
      try {
        await this.api(`/api/admin/providers/${id}`, { method: 'DELETE' });
        this.showToast('Provider permanently deleted.');
        this.providerDetailModal.open = false;
        this.loadProviders();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    },

    // ── Seekers ───────────────────────────────────────────────────────────────
    async loadSeekers() {
      this.loading.seekers = true;
      try {
        const { search, status, page } = this.seekersFilter;
        let url = `/api/admin/seekers?page=${page}&size=50`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (status && status !== 'all') url += `&status=${status}`;

        const res = await this.api(url);
        this.seekersList = res.seekers;
        this.$nextTick(() => initIcons());
      } catch (err) {
        this.showToast('Failed to load seekers: ' + err.message, 'error');
      } finally {
        this.loading.seekers = false;
        this.$nextTick(() => initIcons());
      }
    },

    async inspectSeeker(id) {
      try {
        const res = await this.api(`/api/admin/seekers/${id}`);
        this.seekerDetailModal = { open: true, data: res.seeker };
        this.$nextTick(() => initIcons());
      } catch (err) {
        this.showToast('Failed to load seeker details: ' + err.message, 'error');
      }
    },

    async toggleSeekerStatus(id, active) {
      try {
        await this.api(`/api/admin/seekers/${id}/toggle-status`, {
          method: 'POST',
          body: JSON.stringify({ active }),
        });
        this.showToast(`Seeker ${active ? 'activated' : 'deactivated'}.`);
        if (this.seekerDetailModal.open && this.seekerDetailModal.data) {
          this.seekerDetailModal.data.isActive = active;
        }
        this.loadSeekers();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    },

    async deleteSeeker(id) {
      if (!confirm('DANGER: Permanently delete this seeker and cascade all data?')) return;
      try {
        await this.api(`/api/admin/seekers/${id}`, { method: 'DELETE' });
        this.showToast('Seeker permanently deleted.');
        this.seekerDetailModal.open = false;
        this.loadSeekers();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    },

    // ── Services ──────────────────────────────────────────────────────────────
    async loadServices() {
      this.loading.services = true;
      try {
        const { search, category, status } = this.servicesFilter;
        let url = `/api/admin/services?size=150`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (category && category !== 'All') url += `&category=${category}`;
        if (status && status !== 'All') url += `&status=${status}`;

        const res = await this.api(url);
        this.servicesList = res.services;
        this.categoriesList = res.categories;

        this.$nextTick(() => {
          renderCategoryChart(document.getElementById('chart-services-category'), res.categories);
          initIcons();
        });
      } catch (err) {
        this.showToast('Failed to load services: ' + err.message, 'error');
      } finally {
        this.loading.services = false;
        this.$nextTick(() => initIcons());
      }
    },

    async toggleServiceStatus(id, active) {
      try {
        await this.api(`/api/admin/services/${id}/toggle-status`, {
          method: 'POST',
          body: JSON.stringify({ active }),
        });
        this.showToast(`Service ${active ? 'activated' : 'deactivated'}.`);
        this.loadServices();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    },

    async deleteService(id) {
      if (!confirm('Delete this service from the catalogue?')) return;
      try {
        await this.api(`/api/admin/services/${id}`, { method: 'DELETE' });
        this.showToast('Service deleted.');
        this.loadServices();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    },

    // ── Vehicles ──────────────────────────────────────────────────────────────
    async loadVehicles() {
      this.loading.vehicles = true;
      try {
        const { search, type, avail, ver } = this.vehiclesFilter;
        let url = `/api/admin/vehicles?size=200`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (type && type !== 'All') url += `&type=${type}`;
        if (avail === 'Available') url += `&isAvailable=true`;
        if (avail === 'Unavailable') url += `&isAvailable=false`;
        if (ver === 'Verified') url += `&isVerified=true`;
        if (ver === 'Unverified') url += `&isVerified=false`;

        const res = await this.api(url);
        this.vehiclesList = res.vehicles;
        this.$nextTick(() => initIcons());
      } catch (err) {
        this.showToast('Failed to load vehicles: ' + err.message, 'error');
      } finally {
        this.loading.vehicles = false;
        this.$nextTick(() => initIcons());
      }
    },

    async inspectVehicle(id) {
      try {
        const res = await this.api(`/api/admin/vehicles/${id}`);
        this.vehicleDetailModal = { open: true, data: res.vehicle };
        this.$nextTick(() => initIcons());
      } catch (err) {
        this.showToast('Failed to load vehicle: ' + err.message, 'error');
      }
    },

    // ── Bookings ──────────────────────────────────────────────────────────────
    async loadBookings() {
      this.loading.bookings = true;
      try {
        const { search, status, page } = this.bookingsFilter;
        let url = `/api/admin/bookings?page=${page}&size=50`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (status && status !== 'All') url += `&status=${status}`;

        const res = await this.api(url);
        this.bookingsList = res.bookings;
        this.$nextTick(() => initIcons());
      } catch (err) {
        this.showToast('Failed to load bookings: ' + err.message, 'error');
      } finally {
        this.loading.bookings = false;
        this.$nextTick(() => initIcons());
      }
    },

    async inspectBooking(id) {
      try {
        const res = await this.api(`/api/admin/bookings/${id}`);
        this.bookingDetailModal = { open: true, data: res.booking };
        this.$nextTick(() => initIcons());
      } catch (err) {
        this.showToast('Failed to load booking: ' + err.message, 'error');
      }
    },

    openCancelBookingModal(id) {
      this.cancelBookingModal = { open: true, bookingId: id, reason: '' };
      this.$nextTick(() => initIcons());
    },

    async submitCancelBooking() {
      if (!this.cancelBookingModal.reason.trim()) {
        this.showToast('Cancellation reason is required.', 'error');
        return;
      }
      try {
        await this.api(`/api/admin/bookings/${this.cancelBookingModal.bookingId}/cancel`, {
          method: 'POST',
          body: JSON.stringify({ reason: this.cancelBookingModal.reason }),
        });
        this.showToast('Booking cancelled.');
        this.cancelBookingModal.open = false;
        if (this.bookingDetailModal.open && this.bookingDetailModal.data) {
          this.bookingDetailModal.data.status = 'cancelled';
        }
        this.loadBookings();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    },

    // ── Transactions & Earnings ───────────────────────────────────────────────
    async loadTransactions() {
      this.loading.transactions = true;
      try {
        if (this.txTab === 'overview') {
          const res = await this.api(`/api/admin/transactions/overview?days=${this.txDays}`);
          this.txOverview = res.overview;
          this.txOverview.recentTransactions = res.recentTransactions;

          this.$nextTick(() => {
            renderDailyRevenueChart(document.getElementById('chart-transactions-daily'), res.dailyRevenue);
            initIcons();
          });
        } else {
          const res = await this.api('/api/admin/transactions/providers?size=100');
          this.providersEarnings = res.earnings;
          this.$nextTick(() => initIcons());
        }
      } catch (err) {
        this.showToast('Failed to load transactions: ' + err.message, 'error');
      } finally {
        this.loading.transactions = false;
        this.$nextTick(() => initIcons());
      }
    },

    async inspectProviderEarnings(id) {
      try {
        const res = await this.api(`/api/admin/transactions/providers/${id}`);
        this.providerEarningsModal = {
          open: true,
          summary: res.summary,
          monthly: res.monthlyEarnings,
          transactions: res.transactions,
        };
        this.$nextTick(() => {
          renderProviderMonthlyChart(document.getElementById('chart-provider-monthly'), res.monthlyEarnings);
          initIcons();
        });
      } catch (err) {
        this.showToast('Failed to load provider earnings: ' + err.message, 'error');
      }
    },

    // ── Analytics ─────────────────────────────────────────────────────────────
    async loadAnalytics() {
      this.loading.analytics = true;
      try {
        const res = await this.api(`/api/admin/analytics?days=${this.analyticsDays}`);
        this.analyticsData = res;

        this.$nextTick(() => {
          renderBookingTrendChart(document.getElementById('chart-analytics-trend'), res.trend);
          renderStatusDonutChart(document.getElementById('chart-analytics-status'), res.statusDistribution);
          renderDailyRevenueChart(document.getElementById('chart-analytics-revenue'), res.dailyRevenue);
          renderCategoryChart(document.getElementById('chart-analytics-services-cat'), res.servicesByCategory);
          renderTopProvidersChart(document.getElementById('chart-analytics-top-prov'), res.topProviders);
          initIcons();
        });
      } catch (err) {
        this.showToast('Failed to load analytics: ' + err.message, 'error');
      } finally {
        this.loading.analytics = false;
        this.$nextTick(() => initIcons());
      }
    },

    // ── Notifications ─────────────────────────────────────────────────────────
    async loadNotifications() {
      this.loading.notifications = true;
      try {
        const { search, type, read } = this.notifsFilter;
        let url = `/api/admin/notifications?limit=150`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (type && type !== 'All') url += `&type=${type}`;
        if (read === 'Read') url += `&isRead=true`;
        if (read === 'Unread') url += `&isRead=false`;

        const res = await this.api(url);
        this.notifsList = res.notifications;
        this.$nextTick(() => initIcons());
      } catch (err) {
        this.showToast('Failed to load notifications: ' + err.message, 'error');
      } finally {
        this.loading.notifications = false;
        this.$nextTick(() => initIcons());
      }
    },

    async submitSendNotification() {
      const { userId, title, body, type } = this.sendNotifModal;
      if (!userId.trim() || !title.trim() || !body.trim()) {
        this.showToast('Recipient User ID, title and body are required.', 'error');
        return;
      }
      this.sendNotifModal.loading = true;
      try {
        await this.api('/api/admin/notifications/send', {
          method: 'POST',
          body: JSON.stringify({ userId, title, body, type }),
        });
        this.showToast('Push notification dispatched.');
        this.sendNotifModal.open = false;
        this.sendNotifModal.title = '';
        this.sendNotifModal.body = '';
        this.loadNotifications();
      } catch (err) {
        this.showToast(err.message, 'error');
      } finally {
        this.sendNotifModal.loading = false;
      }
    },

    // ── Complaints ────────────────────────────────────────────────────────────
    async loadComplaints() {
      this.loading.complaints = true;
      try {
        const res = await this.api('/api/admin/complaints');
        this.complaintsData = res;
        this.$nextTick(() => initIcons());
      } catch (err) {
        this.showToast('Failed to load complaints: ' + err.message, 'error');
      } finally {
        this.loading.complaints = false;
        this.$nextTick(() => initIcons());
      }
    },

    // ── Audit Logs ────────────────────────────────────────────────────────────
    async loadAuditLogs() {
      this.loading.audit = true;
      try {
        const res = await this.api(`/api/admin/audit-logs?limit=${this.auditLimit}`);
        this.auditLogs = res.logs;
        this.$nextTick(() => initIcons());
      } catch (err) {
        this.showToast('Failed to load audit logs: ' + err.message, 'error');
      } finally {
        this.loading.audit = false;
        this.$nextTick(() => initIcons());
      }
    },

    // ── Admin Users Management ────────────────────────────────────────────────
    async loadAdminUsers() {
      this.loading.users = true;
      try {
        const res = await this.api('/api/admin/users');
        this.adminUsersList = res.users;
        this.$nextTick(() => initIcons());
      } catch (err) {
        this.showToast('Failed to load admin users: ' + err.message, 'error');
      } finally {
        this.loading.users = false;
        this.$nextTick(() => initIcons());
      }
    },

    async toggleAdminUser(id, active) {
      try {
        await this.api(`/api/admin/users/${id}/toggle`, {
          method: 'POST',
          body: JSON.stringify({ active }),
        });
        this.showToast(`Admin account ${active ? 'activated' : 'deactivated'}.`);
        this.loadAdminUsers();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    },

    async deleteAdminUser(id) {
      if (!confirm('Are you sure you want to delete this admin account?')) return;
      try {
        await this.api(`/api/admin/users/${id}`, { method: 'DELETE' });
        this.showToast('Admin deleted.');
        this.loadAdminUsers();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    },

    // ── Lightbox ──────────────────────────────────────────────────────────────
    openLightbox(src, title = 'Document Preview') {
      if (!src) return;
      let finalSrc = src.trim();
      if (!finalSrc.startsWith('http') && !finalSrc.startsWith('data:')) {
        finalSrc = `data:image/jpeg;base64,${finalSrc}`;
      }
      this.lightbox = { open: true, title, src: finalSrc };
      this.$nextTick(() => initIcons());
    },
  };
}

// Register Alpine component and start
window.adminApp = adminApp;
Alpine.data('adminApp', adminApp);
Alpine.start();
