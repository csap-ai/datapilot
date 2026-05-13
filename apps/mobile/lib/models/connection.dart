class Connection {
  final String id;
  final String name;
  final String type; // sqlite | postgres | mysql
  final String host;
  final int port;
  final String database;
  final String username;
  final String filePath;

  const Connection({
    required this.id,
    required this.name,
    required this.type,
    this.host = '',
    this.port = 0,
    this.database = '',
    this.username = '',
    this.filePath = '',
  });

  Map<String, dynamic> toMap() => {
        'id': id,
        'name': name,
        'type': type,
        'host': host,
        'port': port,
        'database': database,
        'username': username,
        'file_path': filePath,
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
      );

  String get displayAddress {
    if (type == 'sqlite') return filePath.isEmpty ? '(memory)' : filePath;
    return '$host:$port/$database';
  }
}
