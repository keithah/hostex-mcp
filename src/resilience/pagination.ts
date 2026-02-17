export interface PaginationParams {
  offset?: number;
  limit?: number;
}

export interface PaginationMetadata {
  offset: number;
  limit?: number;
  total?: number;
  hasMore: boolean;
  nextOffset?: number;
}

export function buildPaginationMetadata(
  params: PaginationParams,
  total?: number,
): PaginationMetadata {
  const offset = params.offset ?? 0;
  const limit = params.limit;
  const nextOffset =
    limit === undefined ? undefined : offset + limit;
  const hasMore =
    total === undefined || nextOffset === undefined
      ? false
      : nextOffset < total;

  return {
    offset,
    limit,
    total,
    hasMore,
    nextOffset: hasMore ? nextOffset : undefined,
  };
}
