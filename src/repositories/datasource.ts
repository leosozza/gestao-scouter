export type DataSource = 'sheets' | 'bitrix';

const STORAGE_KEY = 'gestao-scouter.datasource';

export const getDataSource = (): DataSource => {
  if (typeof window === 'undefined') return 'sheets';
  return (localStorage.getItem(STORAGE_KEY) as DataSource) || 'sheets';
};

export const setDataSource = (source: DataSource): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, source);
};