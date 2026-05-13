import 'package:postgres/postgres.dart' as pg;
import '../../models/connection.dart';
import '../../models/query_result.dart';

const _resultLimit = 1000;

class PostgresDriver {
  static Future<QueryResult> execute(
      Connection conn, String password, String sql) async {
    final start = DateTime.now();
    final session = await _open(conn, password);
    try {
      final stmt = _appendLimit(sql);
      final result = await session.execute(stmt);
      final columns =
          result.schema.columns.map((c) => c.columnName ?? '?').toList();
      final rows = result
          .take(_resultLimit)
          .map((row) => row.map(_toCell).toList())
          .toList();
      return QueryResult(
        columns: columns,
        rows: rows,
        durationMs: DateTime.now().difference(start).inMilliseconds,
      );
    } finally {
      await session.close();
    }
  }

  static Future<void> test(Connection conn, String password) async {
    final session = await _open(conn, password);
    try {
      await session.execute('SELECT 1');
    } finally {
      await session.close();
    }
  }
}

Future<pg.Connection> _open(Connection conn, String password) {
  return pg.Connection.open(
    pg.Endpoint(
      host: conn.host,
      port: conn.port == 0 ? 5432 : conn.port,
      database: conn.database,
      username: conn.username,
      password: password,
    ),
    settings: pg.ConnectionSettings(sslMode: _sslMode(conn.sslMode)),
  );
}

pg.SslMode _sslMode(String mode) {
  switch (mode) {
    case 'disable':
      return pg.SslMode.disable;
    case 'verify-full':
      return pg.SslMode.verifyFull;
    case 'require':
    default:
      return pg.SslMode.require;
  }
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

String _toCell(Object? v) {
  if (v == null) return '';
  return v.toString();
}
