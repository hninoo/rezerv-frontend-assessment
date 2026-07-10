export type PagedResult<T> = {
  rows: T[];
  totalRows: number;
};

export type MockRequestOptions = {
  delayMs?: number;
  shouldFail?: boolean;
};

export type MockResourceApi<TQuery, TItem, TStats = never, TDetailId = string, TDetail = never> = {
  list: (query: TQuery) => Promise<PagedResult<TItem>>;
  stats?: (options?: MockRequestOptions) => Promise<TStats>;
  details?: (id: TDetailId, options?: MockRequestOptions) => Promise<TDetail[]>;
};
