class Connection {
  final String id;
  final String name;
  final String type; // sqlite | postgres | mysql
  final String host;
  final int port;
  final String database;
  final String username;
  final String filePath;
  final bool readonly;
  final String sslMode; // require | disable | verify-full (postgres only)

  const Connection({
    required this.id,
    required this.name,
    required this.type,
    this.host = '',
    this.port = 0,
    this.database = '',
    this.username = '',
    this.filePath = '',
    this.readonly = true,
    this.sslMode = 'require',
  });

  Connection copyWith({
    String? id,
    String? name,
    String? type,
    String? host,
    int? port,
    String? database,
    String? username,
    String? filePath,
    bool? readonly,
    String? sslMode,
  }) =>
      Connection(
        id: id ?? this.id,
        name: name ?? this.name,
        type: type ?? this.type,
        host: host ?? this.host,
        port: port ?? this.port,
        database: database ?? this.database,
        username: username ?? this.username,
        filePath: filePath ?? this.filePath,
        readonly: readonly ?? this.readonly,
        sslMode: sslMode ?? this.sslMode,
      );

  Map<String, dynamic> toMap() => {
        'id': id,
        'name': name,
        'type': type,
        'host': host,
        'port': port,
        'database': database,
        'username': username,
        'file_path': filePath,
        'readonly': readonly ? 1 : 0,
        'ssl_mode': sslMode,
      };

  factory Connection.fromMap(Map<String, dynamic> m) => Connection(
        id: m['id'] as String,
        name: m['name'] as String,
        type: m['type'] as String,
        host: (m['host'] as String?) ?? '',
        port: (m['port'] as int?) ?? 0,
        database: (m['database'] as String?) ?? '',
        username: (m['username'] as String?) ?? '',
        filePath: (m['file_path'] as String?) ?? '',
        readonly: ((m['readonly'] as int?) ?? 1) == 1,
        sslMode: (m['ssl_mode'] as String?) ?? 'require',
      );

  String get displayAddress {
    if (type == 'sqlite') return filePath.isEmpty ? '(memory)' : filePath;
    return '$host:$port/$database';
  }
}
