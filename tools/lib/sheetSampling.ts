export interface SheetSampling { filter: 'nearest' | 'linear'; gutter: number; }

/** Linear filtering requires extruded frame borders, never adjacent atlas cells. */
export function sheetSampling(value?: SheetSampling): SheetSampling {
  if (value === undefined) return { filter: 'nearest', gutter: 0 };
  if (!value || Object.keys(value).some(key => !['filter', 'gutter'].includes(key))
    || !['nearest', 'linear'].includes(value.filter) || !Number.isInteger(value.gutter)
    || value.gutter < 0 || value.gutter > 4 || value.filter === 'linear' && value.gutter < 1) {
    throw Error('Unsupported sheet sampling; linear requires an extruded gutter');
  }
  return value;
}
