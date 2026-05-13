class QueryHistory {
  final int? id;
  final String connectionId;
  final String sql;
  final int durationMs;
  final bool success;
  final DateTime executedAt;

  const QueryHistory({
    this.id,
    required this.connectionId,
    required this.sql,
    required this.durationMs,
    required this.success,
    required this.executedAt,
  });

  Map<String, dynamic> toMap() => {
        if (id != null) 'id': id,
        'connection_id': connectionId,
        'sql': sql,
        'duration_ms': durationMs,
        'success': success ? 1 : 0,
        'executed_at': executedAt.toIso8601String(),
      };

  factory QueryHistory.fromMap(Map<String, dynamic> m) => QueryHistory(
        id: m['id'] as int?,
        connectionId: m['connection_id'] as String,
        sql: m['sql'] as String,
        durationMs: m['duration_ms'] as int,
        success: (m['success'] as int) == 1,
        executedAt: DateTime.parse(m['executed_at'] as String),
      );
}
