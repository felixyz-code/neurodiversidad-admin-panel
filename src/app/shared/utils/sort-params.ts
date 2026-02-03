export type SortDir = 'asc' | 'desc';
export type SortKeyMap = Record<string, string | undefined>;

export const buildSortParams = (
  sortKey: string | null,
  sortDir: SortDir,
  map: SortKeyMap
): string[] | undefined => {
  if (!sortKey) {
    return undefined;
  }
  const field = map[sortKey];
  if (!field) {
    return undefined;
  }
  return [`${field},${sortDir}`];
};

export const isServerSortable = (sortKey: string | null, map: SortKeyMap): boolean => {
  return !!(sortKey && map[sortKey]);
};
