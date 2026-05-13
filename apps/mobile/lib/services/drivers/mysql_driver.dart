import 'package:mysql_client/mysql_client.dart';
import '../../models/connection.dart';
import '../../models/query_result.dart';

const _resultLimit = 1000;

class MysqlDriver {
  static Future<QueryResult> execute(
      Connection conn, String password, String sql) async {
    final start = DateTime.now();
    final c = await _open(conn, password);
    try {
      final stmt = _appendLimit(sql);
      final result = await c.execute(stmt);
      final columns = result.cols.map((col) => col.name).toList();
      final rows = result.rows.take(_resultLimit).map((row) {
        final assoc = row.assoc();
        return columns.map((k) => assoc[k] ?? '').toList();
      }).toList();
      return QueryResult(
        columns: columns,
        rows: rows,
        durationMs: DateTime.now().difference(start).inMilliseconds,
      );
    } finally {
      await c.close();
    }
  }

  static Future<void> test(Connection conn, String password) async {
    final c = await _open(conn, password);
    try {
      await c.execute('SELECT 1');
    } finally {
      await c.close();
    }
  }
}

Future<MySQLConnection> _open(Connection conn, String password) async {
  final c = await MySQLConnection.createConnection(
    host: conn.host,
    port: conn.port == 0 ? 3306 : conn.port,
    userName: conn.username,
    password: password,
    databaseName: conn.database,
    secure: false,
  );
  await c.connect();
  return c;
}

String _appendLimit(String sql) {
  final trimmed = sql.trim().replaceAll(RegExp(r';$'), '').trim();
  final upper = trimmed.toUpperCase();
  if (!upper.startsWith('SELECT') && !upper.startsWith('WITH')) return sql;
  if (RegExp(r'\bLIMIT\s+\d+', caseSensitive: false).hasMatch(trimmed)) {
    return sql;
  }
  return '$trimmed LIMIT $_resultLimit';
}
