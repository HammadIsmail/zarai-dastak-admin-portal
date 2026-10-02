import ApexCharts from 'apexcharts';

const CHART_THEME = {
  mode: 'dark',
  palette: 'palette1',
  monochrome: {
    enabled: false,
  }
};

const CHART_FONTS = {
  fontFamily: 'Inter, system-ui, sans-serif',
};

// Store active chart instances so we can update or destroy them cleanly
const activeCharts = {};

export function destroyChart(key) {
  if (activeCharts[key]) {
    activeCharts[key].destroy();
    delete activeCharts[key];
  }
}

export function renderBookingTrendChart(el, trendData) {
  destroyChart('bookingTrend');
  if (!el || !trendData || !trendData.length) return;

  const dates = trendData.map(d => {
    const raw = d.date || '';
    if (typeof raw === 'object' && raw.year) {
      return `${raw.year}-${String(raw.month).padStart(2, '0')}-${String(raw.day).padStart(2, '0')}`;
    }
    return String(raw).slice(5); // MM-DD
  });
  const seriesData = trendData.map(d => d.bookings || 0);

  const options = {
    series: [{
      name: 'Bookings',
      data: seriesData
    }],
    chart: {
      type: 'area',
      height: 280,
      toolbar: { show: false },
      background: 'transparent',
      ...CHART_FONTS
    },
    colors: ['#FF6B35'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.5,
        opacityTo: 0.05,
        stops: [0, 90, 100]
      }
    },
    stroke: {
      curve: 'smooth',
      width: 3,
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: dates,
      labels: {
        style: { colors: '#94A3B8', fontSize: '11px' }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: '#94A3B8', fontSize: '11px' },
        formatter: (val) => Math.round(val)
      }
    },
    grid: {
      borderColor: 'rgba(255,255,255,0.06)',
      strokeDashArray: 4
    },
    tooltip: {
      theme: 'dark',
      y: { formatter: (val) => `${val} bookings` }
    }
  };

  const chart = new ApexCharts(el, options);
  chart.render();
  activeCharts['bookingTrend'] = chart;
}

export function renderStatusDonutChart(el, statusData) {
  destroyChart('statusDonut');
  if (!el || !statusData || !statusData.length) return;

  const labels = statusData.map(s => (s.status || 'unknown').replace('_', ' ').toUpperCase());
  const series = statusData.map(s => Number(s.count) || 0);

  const options = {
    series: series,
    labels: labels,
    chart: {
      type: 'donut',
      height: 280,
      background: 'transparent',
      ...CHART_FONTS
    },
    colors: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#64748B'],
    stroke: {
      show: true,
      colors: ['#1e293b'],
      width: 2
    },
    dataLabels: { enabled: false },
    legend: {
      position: 'bottom',
      labels: { colors: '#94A3B8' },
      fontSize: '11px'
    },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              color: '#F8FAFC',
              fontSize: '13px',
              fontWeight: 600,
              formatter: () => series.reduce((a, b) => a + b, 0)
            },
            value: {
              color: '#F8FAFC',
              fontSize: '22px',
              fontWeight: 700
            }
          }
        }
      }
    },
    tooltip: { theme: 'dark' }
  };

  const chart = new ApexCharts(el, options);
  chart.render();
  activeCharts['statusDonut'] = chart;
}

export function renderDailyRevenueChart(el, revenueData) {
  destroyChart('dailyRev');
  if (!el || !revenueData || !revenueData.length) return;

  const dates = revenueData.map(d => {
    const raw = d.date || '';
    if (typeof raw === 'object' && raw.year) {
      return `${raw.year}-${String(raw.month).padStart(2, '0')}-${String(raw.day).padStart(2, '0')}`;
    }
    return String(raw).slice(5);
  });
  const revenues = revenueData.map(d => Number(d.revenue) || 0);

  const options = {
    series: [{
      name: 'Revenue (PKR)',
      data: revenues
    }],
    chart: {
      type: 'line',
      height: 260,
      toolbar: { show: false },
      background: 'transparent',
      ...CHART_FONTS
    },
    colors: ['#10B981'],
    stroke: {
      curve: 'smooth',
      width: 3
    },
    markers: {
      size: 3,
      colors: ['#10B981'],
      strokeColors: '#1e293b',
      strokeWidth: 2
    },
    xaxis: {
      categories: dates,
      labels: { style: { colors: '#94A3B8', fontSize: '11px' } },
      axisBorder: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: '#94A3B8', fontSize: '11px' },
        formatter: (val) => `PKR ${(val >= 1000 ? (val/1000).toFixed(1) + 'k' : val)}`
      }
    },
    grid: {
      borderColor: 'rgba(255,255,255,0.06)',
      strokeDashArray: 4
    },
    tooltip: {
      theme: 'dark',
      y: { formatter: (val) => `PKR ${val.toLocaleString()}` }
    }
  };

  const chart = new ApexCharts(el, options);
  chart.render();
  activeCharts['dailyRev'] = chart;
}

export function renderTopProvidersChart(el, providersData) {
  destroyChart('topProv');
  if (!el || !providersData || !providersData.length) return;

  const names = providersData.map(p => (p.name || 'Unknown').split(' ')[0]);
  const jobs = providersData.map(p => Number(p.completedJobs) || 0);

  const options = {
    series: [{
      name: 'Completed Jobs',
      data: jobs
    }],
    chart: {
      type: 'bar',
      height: 260,
      toolbar: { show: false },
      background: 'transparent',
      ...CHART_FONTS
    },
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: '45%',
        distributed: true
      }
    },
    colors: ['#FF6B35', '#FB923C', '#F97316', '#EA580C', '#C2410C', '#9A3412', '#F59E0B', '#3B82F6'],
    dataLabels: { enabled: false },
    legend: { show: false },
    xaxis: {
      categories: names,
      labels: { style: { colors: '#94A3B8', fontSize: '11px' } },
      axisBorder: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: '#94A3B8', fontSize: '11px' },
        formatter: (val) => Math.round(val)
      }
    },
    grid: {
      borderColor: 'rgba(255,255,255,0.06)',
      strokeDashArray: 4
    },
    tooltip: {
      theme: 'dark',
      y: { formatter: (val) => `${val} jobs completed` }
    }
  };

  const chart = new ApexCharts(el, options);
  chart.render();
  activeCharts['topProv'] = chart;
}

export function renderCategoryChart(el, catData) {
  destroyChart('categoryDist');
  if (!el || !catData || !catData.length) return;

  const categories = catData.map(c => (c.category || 'other').toUpperCase());
  const counts = catData.map(c => Number(c.count) || 0);

  const options = {
    series: [{
      name: 'Services',
      data: counts
    }],
    chart: {
      type: 'bar',
      height: 240,
      toolbar: { show: false },
      background: 'transparent',
      ...CHART_FONTS
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        barHeight: '55%'
      }
    },
    colors: ['#3B82F6'],
    dataLabels: { enabled: false },
    xaxis: {
      categories: categories,
      labels: { style: { colors: '#94A3B8', fontSize: '11px' } }
    },
    yaxis: {
      labels: { style: { colors: '#CBD5E1', fontSize: '11px' } }
    },
    grid: {
      borderColor: 'rgba(255,255,255,0.06)',
      strokeDashArray: 4
    },
    tooltip: { theme: 'dark' }
  };

  const chart = new ApexCharts(el, options);
  chart.render();
  activeCharts['categoryDist'] = chart;
}

export function renderProviderMonthlyChart(el, monthlyData) {
  destroyChart('providerMonthly');
  if (!el || !monthlyData || !monthlyData.length) return;

  const months = monthlyData.map(m => {
    const raw = m.month || '';
    if (typeof raw === 'object' && raw.year) return `${raw.year}-${raw.month}`;
    return String(raw).slice(0, 7);
  });
  const revenues = monthlyData.map(m => Number(m.revenue) || 0);

  const options = {
    series: [{
      name: 'Monthly Revenue',
      data: revenues
    }],
    chart: {
      type: 'bar',
      height: 220,
      toolbar: { show: false },
      background: 'transparent',
      ...CHART_FONTS
    },
    colors: ['#FF6B35'],
    plotOptions: {
      bar: { borderRadius: 4, columnWidth: '50%' }
    },
    xaxis: {
      categories: months,
      labels: { style: { colors: '#94A3B8', fontSize: '10px' } }
    },
    yaxis: {
      labels: {
        style: { colors: '#94A3B8', fontSize: '10px' },
        formatter: (val) => `PKR ${(val >= 1000 ? (val/1000).toFixed(0) + 'k' : val)}`
      }
    },
    grid: { borderColor: 'rgba(255,255,255,0.06)' },
    tooltip: {
      theme: 'dark',
      y: { formatter: (val) => `PKR ${val.toLocaleString()}` }
    }
  };

  const chart = new ApexCharts(el, options);
  chart.render();
  activeCharts['providerMonthly'] = chart;
}
