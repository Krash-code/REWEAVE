import { ArrowDown, ArrowUp, BarChart2, Leaf, RotateCcw, Scale, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import api from '../api/axios.js';
import Loader from '../components/Loader.jsx';

const METRICS = [
  { key: 'totalRegistered', label: 'Textiles registered', unit: 'items', icon: Scale },
  { key: 'totalCollectedKg', label: 'Total collected', unit: 'kg', icon: TrendingUp },
  { key: 'totalRecoveredKg', label: 'Total recovered', unit: 'kg', icon: Leaf },
  { key: 'reusedKg', label: 'Reused / donated / resold', unit: 'kg', icon: BarChart2 },
  { key: 'repairedKg', label: 'Repaired', unit: 'kg', icon: BarChart2 },
  { key: 'upcycledKg', label: 'Upcycled', unit: 'kg', icon: BarChart2 },
  { key: 'recycledKg', label: 'Recycled', unit: 'kg', icon: BarChart2 },
  { key: 'awaitingOutcomeKg', label: 'Awaiting outcome', unit: 'kg', icon: ArrowUp },
  { key: 'rejectedKg', label: 'Rejected', unit: 'kg', icon: ArrowDown }
];

const PATHWAY_COLORS = {
  reuse: '#325d48',
  repair: '#557d60',
  upcycling: '#78a68a',
  recycling: '#a7c4af'
};

const MONTH_BARS = [
  { key: 'collectedKg', label: 'Collected', color: '#b0b8aa' },
  { key: 'recoveredKg', label: 'Recovered', color: '#325d48' },
  { key: 'rejectedKg', label: 'Rejected', color: '#bd6047' }
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="chart-tooltip-value">
          {entry.name}: {Number(entry.value).toFixed(1)} kg
        </p>
      ))}
    </div>
  );
}

function RecoveryRate({ summary }) {
  if (!summary || !summary.totalCollectedKg) return null;
  const rate = ((summary.totalRecoveredKg / summary.totalCollectedKg) * 100).toFixed(1);
  return (
    <div className="recovery-rate-card">
      <span className="eyebrow">RECOVERY EFFICIENCY</span>
      <div className="recovery-rate-main">
        <strong>{rate}%</strong>
        <p>of collected weight confirmed as recovered</p>
      </div>
      <div className="recovery-rate-bar-track">
        <div className="recovery-rate-bar-fill" style={{ width: `${Math.min(100, rate)}%` }} />
      </div>
      <div className="recovery-rate-legend">
        <span><span className="dot dot-green" />Recovered: {summary.totalRecoveredKg} kg</span>
        <span><span className="dot dot-amber" />Awaiting: {summary.awaitingOutcomeKg} kg</span>
        <span><span className="dot dot-red" />Rejected: {summary.rejectedKg} kg</span>
      </div>
    </div>
  );
}

export default function ImpactDashboard() {
  const [summary, setSummary] = useState(null);
  const [pathways, setPathways] = useState([]);
  const [months, setMonths] = useState([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      api.get('/impact/summary'),
      api.get('/impact/by-pathway'),
      api.get('/impact/monthly')
    ]).then(([summaryRes, pathwayRes, monthRes]) => {
      setSummary(summaryRes.data.data.summary);
      setNote(summaryRes.data.data.note);
      setPathways(pathwayRes.data.data.pathways);
      setMonths(monthRes.data.data.months);
    }).catch((err) => {
      setError(err.response?.data?.message || 'Could not load impact metrics.');
    }).finally(() => setLoading(false));
  }, [reloadKey]);

  if (loading) return <section className="page-shell"><Loader label="Loading recovery metrics..." /></section>;

  return (
    <section className="page-shell">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">ENVIRONMENTAL IMPACT</span>
          <h1>Recovery dashboard</h1>
          <p>Verified textile recovery weights only. CO₂ estimates are not applied.</p>
        </div>
        <button type="button" className="btn-outline-sm" onClick={() => setReloadKey((k) => k + 1)}>
          <RotateCcw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="load-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => setReloadKey((k) => k + 1)}><RotateCcw size={15} /> Retry</button>
        </div>
      )}

      {note && <p className="impact-note">{note}</p>}

      {summary && (
        <>
          {/* Key metrics */}
          <div className="impact-metric-grid">
            {METRICS.map(({ key, label, unit, icon: Icon }) => (
              <article key={key} className={`metric-card ${key === 'rejectedKg' ? 'metric-card-alert' : ''} ${key === 'totalRecoveredKg' ? 'metric-card-highlight' : ''}`}>
                <div className="metric-card-top">
                  <span>{label}</span>
                  <Icon size={14} className="metric-icon" />
                </div>
                <strong>{key === 'totalRegistered' ? summary[key] ?? 0 : `${Number(summary[key] ?? 0).toFixed(1)} ${unit}`}</strong>
              </article>
            ))}
          </div>

          {/* Recovery rate card */}
          <RecoveryRate summary={summary} />
        </>
      )}

      {/* Charts */}
      <div className="chart-grid">
        <article className="chart-card">
          <h2>Recovery by pathway</h2>
          <p className="chart-subtitle">Confirmed weight (kg) per circular route</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={pathways} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e5db" vertical={false} />
              <XAxis dataKey="pathway" tick={{ fontSize: 10, fill: '#7a8076' }} />
              <YAxis tick={{ fontSize: 10, fill: '#7a8076' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="kg" name="Weight" radius={[2, 2, 0, 0]}>
                {pathways.map((entry) => (
                  <Cell key={entry.pathway} fill={PATHWAY_COLORS[entry.pathway] || '#aab4a8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="chart-card">
          <h2>Monthly activity</h2>
          <p className="chart-subtitle">Collected vs recovered vs rejected weight (kg)</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={months} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e5db" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#7a8076' }} />
              <YAxis tick={{ fontSize: 10, fill: '#7a8076' }} />
              <Tooltip content={<CustomTooltip />} />
              {MONTH_BARS.map(({ key, label, color }) => (
                <Bar key={key} dataKey={key} name={label} fill={color} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            {MONTH_BARS.map(({ key, label, color }) => (
              <span key={key} className="chart-legend-item">
                <span className="chart-legend-swatch" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
        </article>
      </div>

      {months.length === 0 && !error && (
        <div className="empty-charts-note">
          <BarChart2 size={24} />
          <p>No collection activity yet. Charts will appear once textiles are collected and outcomes confirmed.</p>
        </div>
      )}
    </section>
  );
}
