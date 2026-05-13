import 'package:sqflite/sqflite.dart';
import '../../models/connection.dart';
import '../../models/query_result.dart';

const _resultLimit = 1000;

class SqliteDriver {
  static Future<QueryResult> execute(Connection conn, String sql) async {
    if (conn.filePath.isEmpty) {
      throw Exception('SQLite 连接缺少文件路径');
    }
    final start = DateTime.now();
    final db = await openDatabase(conn.filePath, readOnly: conn.readonly);
    try {
      final stmt = _appendLimit(sql);
      final rows = await db.rawQuery(stmt);
      final columns = rows.isEmpty ? <String>[] : rows.first.keys.toList();
      final data = rows
          .take(_resultLimit)
          .map((r) => columns.map((c) => _toCell(r[c])).toList())
          .toList();
      return QueryResult(
        columns: columns,
        rows: data,
        durationMs: DateTime.now().difference(start).inMilliseconds,
      );
    } finally {
      await db.close();
    }
  }

  static Future<void> test(Connection conn) async {
    if (conn.filePath.isEmpty) throw Exception('SQLite 连接缺少文件路径');
    final db = await openDatabase(conn.filePath, readOnly: true);
    try {
      await db.rawQuery('PRAGMA user_version');
    } finally {
      await db.close();
    }
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
