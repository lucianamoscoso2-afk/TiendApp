import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, radius, typography } from '@/lib/theme';

interface ChartDataPoint {
  label: string;
  value: number;
  value2?: number;
}

interface LineChartProps {
  data: ChartDataPoint[];
  height?: number;
  color?: string;
  color2?: string;
  showGrid?: boolean;
  formatValue?: (v: number) => string;
}

export function LineChart({ data, height = 200, color, color2, showGrid = true, formatValue }: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyChart, { height }]}>
        <Text style={styles.emptyChartText}>Sin datos para mostrar</Text>
      </View>
    );
  }

  const maxVal = Math.max(...data.map(d => Math.max(d.value, d.value2 || 0)), 1);
  const minVal = 0;
  const range = maxVal - minVal || 1;
  const chartHeight = height - 30;
  const chartWidth = 100; // percentage
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;

  const points = data.map((d, i) => ({
    x: i * stepX,
    y: chartHeight - ((d.value - minVal) / range) * chartHeight,
  }));

  const points2 = data.map((d, i) => ({
    x: i * stepX,
    y: chartHeight - ((d.value2 || 0 - minVal) / range) * chartHeight,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight} L 0 ${chartHeight} Z`;
  const linePath2 = points2.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const gridLines = showGrid ? [0, 0.25, 0.5, 0.75, 1] : [];

  return (
    <View style={styles.chartContainer}>
      <View style={[styles.chartArea, { height: chartHeight }]}>
        <svg width="100%" height={chartHeight} viewBox={`0 0 100 ${chartHeight}`} preserveAspectRatio="none" style={styles.svg}>
          {gridLines.map((g, i) => (
            <line
              key={i}
              x1="0"
              y1={chartHeight * g}
              x2="100"
              y2={chartHeight * g}
              stroke={colors.neutral[200]}
              strokeWidth="0.2"
              strokeDasharray="1 1"
            />
          ))}
          <path d={areaPath} fill={color || colors.primary[500]} opacity="0.1" />
          <path d={linePath} fill="none" stroke={color || colors.primary[600]} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
          {color2 && data.some(d => d.value2 !== undefined) && (
            <path d={linePath2} fill="none" stroke={color2 || colors.error} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="2 1" />
          )}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="0.8" fill={color || colors.primary[600]} />
          ))}
        </svg>
      </View>
      <View style={styles.labelsRow}>
        {data.map((d, i) => (
          <Text key={i} style={styles.chartLabel}>{d.label}</Text>
        ))}
      </View>
    </View>
  );
}

interface BarChartProps {
  data: ChartDataPoint[];
  height?: number;
  color?: string;
  horizontal?: boolean;
  formatValue?: (v: number) => string;
}

export function BarChart({ data, height = 200, color, formatValue }: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyChart, { height }]}>
        <Text style={styles.emptyChartText}>Sin datos para mostrar</Text>
      </View>
    );
  }

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barHeight = height - 30;

  return (
    <View style={styles.chartContainer}>
      <View style={[styles.barsContainer, { height: barHeight }]}>
        {data.map((d, i) => {
          const h = (d.value / maxVal) * barHeight;
          return (
            <View key={i} style={styles.barWrapper}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: h,
                      backgroundColor: color || colors.primary[500],
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{d.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({ data, size = 160, centerLabel, centerValue }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <View style={[styles.emptyChart, { height: size }]}>
        <Text style={styles.emptyChartText}>Sin datos</Text>
      </View>
    );
  }

  const radius = size / 2;
  const strokeWidth = size * 0.18;
  const innerRadius = radius - strokeWidth;
  const circumference = 2 * Math.PI * (radius - strokeWidth / 2);

  let offset = 0;
  const segments = data.map((d, i) => {
    const fraction = d.value / total;
    const dash = fraction * circumference;
    const segment = (
      <circle
        key={i}
        cx={radius}
        cy={radius}
        r={radius - strokeWidth / 2}
        fill="none"
        stroke={d.color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeDashoffset={-offset}
        transform={`rotate(-90 ${radius} ${radius})`}
      />
    );
    offset += dash;
    return segment;
  });

  return (
    <View style={styles.donutContainer}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments}
        {centerValue && (
          <text
            x={radius}
            y={radius - 5}
            textAnchor="middle"
            fontSize={size * 0.12}
            fontWeight="bold"
            fill={colors.text}
            fontFamily="Inter-Bold, sans-serif"
          >
            {centerValue}
          </text>
        )}
        {centerLabel && (
          <text
            x={radius}
            y={radius + size * 0.1}
            textAnchor="middle"
            fontSize={size * 0.07}
            fill={colors.textSecondary}
            fontFamily="Inter-Regular, sans-serif"
          >
            {centerLabel}
          </text>
        )}
      </svg>
      <View style={styles.donutLegend}>
        {data.map((d, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: d.color }]} />
            <Text style={styles.legendLabel}>{d.label}</Text>
            <Text style={styles.legendValue}>{formatPercent(d.value, total)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function formatPercent(value: number, total: number): string {
  const pct = (value / total) * 100;
  return `${pct.toFixed(0)}%`;
}

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  label?: string;
  height?: number;
}

export function ProgressBar({ value, max, color, label, height = 8 }: ProgressBarProps) {
  const pct = Math.min((value / (max || 1)) * 100, 100);
  return (
    <View style={styles.progressContainer}>
      {label && <Text style={styles.progressLabel}>{label}</Text>}
      <View style={[styles.progressTrack, { height }]}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color || colors.primary[500], height }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartContainer: {
    width: '100%',
  },
  chartArea: {
    width: '100%',
    position: 'relative',
  },
  svg: {
    width: '100%',
    height: '100%',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  chartLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: typography.fontFamilyRegular,
    flex: 1,
    textAlign: 'center',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    width: '100%',
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: '70%',
    maxWidth: 40,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderRadius: radius.sm,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontFamily: typography.fontFamilyRegular,
    textAlign: 'center',
  },
  donutContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  donutLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: typography.caption,
    color: colors.text,
    fontFamily: typography.fontFamilyRegular,
  },
  legendValue: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    fontFamily: typography.fontFamilyMedium,
  },
  emptyChart: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartText: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall,
    fontFamily: typography.fontFamilyRegular,
  },
  progressContainer: {
    width: '100%',
  },
  progressLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
    fontFamily: typography.fontFamilyRegular,
  },
  progressTrack: {
    width: '100%',
    backgroundColor: colors.neutral[200],
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: radius.full,
  },
});
