export type PeriodPresetId =
  | 'month'
  | 'last-month'
  | 'quarter'
  | 'last-quarter'
  | 'semester'
  | 'year'
  | '30d';

export interface PeriodPreset {
  id: PeriodPresetId;
  label: string;
  start: string;
  end: string;
  title: string;
}

const MONTHS_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

export function toDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function buildPeriodPresets(ids: PeriodPresetId[], today = new Date()): PeriodPreset[] {
  const year = today.getFullYear();
  const month = today.getMonth();
  const quarter = Math.floor(month / 3);
  const lastQuarter = quarter === 0 ? { year: year - 1, quarter: 3 } : { year, quarter: quarter - 1 };
  const lastMonth = new Date(year, month - 1, 1);
  const semester = month < 6 ? 0 : 1;
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  const all: Record<PeriodPresetId, { label: string; start: Date; end: Date; title: string }> = {
    month: {
      label: 'Mês atual',
      start: new Date(year, month, 1),
      end: today,
      title: `Avaliação ${MONTHS_PT[month]} ${year}`,
    },
    'last-month': {
      label: 'Último mês',
      start: lastMonth,
      end: new Date(year, month, 0),
      title: `Avaliação ${MONTHS_PT[lastMonth.getMonth()]} ${lastMonth.getFullYear()}`,
    },
    quarter: {
      label: 'Trimestre atual',
      start: new Date(year, quarter * 3, 1),
      end: today,
      title: `Avaliação Q${quarter + 1} ${year}`,
    },
    'last-quarter': {
      label: 'Último trimestre',
      start: new Date(lastQuarter.year, lastQuarter.quarter * 3, 1),
      end: new Date(lastQuarter.year, lastQuarter.quarter * 3 + 3, 0),
      title: `Avaliação Q${lastQuarter.quarter + 1} ${lastQuarter.year}`,
    },
    semester: {
      label: 'Semestre atual',
      start: new Date(year, semester * 6, 1),
      end: today,
      title: `Avaliação ${semester + 1}º semestre ${year}`,
    },
    year: { label: 'Ano atual', start: new Date(year, 0, 1), end: today, title: `Avaliação ${year}` },
    '30d': { label: 'Últimos 30 dias', start: thirtyDaysAgo, end: today, title: 'Avaliação últimos 30 dias' },
  };

  return ids.map((id) => ({
    id,
    label: all[id].label,
    title: all[id].title,
    start: toDateOnly(all[id].start),
    end: toDateOnly(all[id].end),
  }));
}
