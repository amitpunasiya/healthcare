import React from 'react';

interface ChartItem {
  label: string;
  earnings: number;
  bookings: number;
  completed?: number;
}

interface ProviderAnalyticsChartProps {
  data: ChartItem[];
  metric: 'earnings' | 'bookings';
  title?: string;
  onSelectDate?: (dateStr: string) => void;
}

export const ProviderAnalyticsChart: React.FC<ProviderAnalyticsChartProps> = ({
  data,
  metric,
  title,
  onSelectDate,
}) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        No chart data available for this period.
      </div>
    );
  }

  // Calculate maximum value for scaling bar heights
  const values = data.map((d) => (metric === 'earnings' ? d.earnings : d.bookings));
  const maxVal = Math.max(...values, 1);

  const barColor = metric === 'earnings' ? 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)' : 'linear-gradient(180deg, #a78bfa 0%, #7c3aed 100%)';
  const badgeColor = metric === 'earnings' ? '#0284c7' : '#7c3aed';

  return (
    <div className="card" style={{ padding: '1.5rem', borderRadius: '20px', marginBottom: '1.5rem', backgroundColor: 'white', border: '1px solid var(--border)' }}>
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            {title} ({metric === 'earnings' ? 'Earnings ₹' : 'Bookings Count'})
          </h4>
          <span style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: badgeColor, padding: '0.25rem 0.65rem', borderRadius: '999px', fontWeight: 800 }}>
            {metric === 'earnings' ? 'Net Provider Settlement' : 'Total Bookings Received'}
          </span>
        </div>
      )}

      {/* Scrollable Container for Monthly data */}
      <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: data.length > 14 ? '0.35rem' : '0.75rem',
            height: '200px',
            minWidth: data.length > 14 ? `${data.length * 36}px` : '100%',
            paddingTop: '1.5rem',
            borderBottom: '2px solid #e2e8f0',
          }}
        >
          {data.map((item, idx) => {
            const val = metric === 'earnings' ? item.earnings : item.bookings;
            const heightPercent = maxVal > 0 ? Math.max((val / maxVal) * 100, val > 0 ? 8 : 2) : 2;
            const displayVal = metric === 'earnings' ? `₹${val}` : `${val}`;

            return (
              <div
                key={idx}
                onClick={() => onSelectDate && (item as any).date && onSelectDate((item as any).date)}
                title={`${item.label}: ${metric === 'earnings' ? `₹${item.earnings} Net Earning` : `${item.bookings} Bookings (${item.completed || 0} completed)`}`}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                  cursor: onSelectDate && (item as any).date ? 'pointer' : 'default',
                  transition: 'transform 0.15s ease',
                }}
              >
                {val > 0 && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: badgeColor, marginBottom: '0.25rem', whiteSpace: 'nowrap' }}>
                    {displayVal}
                  </span>
                )}
                <div
                  style={{
                    width: '100%',
                    maxWidth: data.length > 14 ? '28px' : '45px',
                    height: `${heightPercent}%`,
                    background: val > 0 ? barColor : '#f1f5f9',
                    borderRadius: '6px 6px 0 0',
                    transition: 'height 0.3s ease',
                    boxShadow: val > 0 ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                  }}
                />
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    marginTop: '0.4rem',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    maxWidth: '100%',
                  }}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
