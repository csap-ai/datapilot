class SavedQuery {
  final int? id;
  final String connectionId;
  final String name;
  final String sql;
  final DateTime createdAt;

  const SavedQuery({
    this.id,
    required this.connectionId,
    required this.name,
    required this.sql,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() => {
        if (id != null) 'id': id,
        'connection_id': connectionId,
        'name': name,
        'sql': sql,
        'created_at': createdAt.toIso8601String(),
      };

  factory SavedQuery.fromMap(Map<String, dynamic> m) => SavedQuery(
        id: m['id'] as int?,
        connectionId: m['connection_id'] as String,
        name: m['name'] as String,
        sql: m['sql'] as String,
        createdAt: DateTime.parse(m['created_at'] as String),
      );
}
