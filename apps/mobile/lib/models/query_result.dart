class QueryResult {
  final List<String> columns;
  final List<List<String>> rows;
  final int durationMs;

  const QueryResult({
    required this.columns,
    required this.rows,
    this.durationMs = 0,
  });

  factory QueryResult.fromJson(Map<String, dynamic> j) => QueryResult(
        columns: List<String>.from(j['columns'] ?? []),
        rows: (j['rows'] as List?)
                ?.map((r) => List<String>.from(r ?? []))
                .toList() ??
            [],
        durationMs: (j['durationMs'] as int?) ?? 0,
      );
}
