import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/connection.dart';
import '../models/query_history.dart';
import '../models/saved_query.dart';

class DatabaseService {
  static Database? _db;

  static Future<Database> get db async {
    _db ??= await _open();
    return _db!;
  }

  static Future<Database> _open() async {
    final path = join(await getDatabasesPath(), 'datapilot.db');
    return openDatabase(path, version: 1, onCreate: _onCreate);
  }

  static Future<void> _onCreate(Database db, int version) async {
    await db.execute('''
      CREATE TABLE connections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        host TEXT,
        port INTEGER,
        database TEXT,
        username TEXT,
        file_path TEXT
      )
    ''');
    await db.execute('''
      CREATE TABLE query_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        connection_id TEXT NOT NULL,
        sql TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        success INTEGER NOT NULL,
        executed_at TEXT NOT NULL
      )
    ''');
    await db.execute('''
      CREATE TABLE saved_queries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        connection_id TEXT NOT NULL,
        name TEXT NOT NULL,
        sql TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    ''');
  }

  // Connections
  static Future<List<Connection>> getConnections() async {
    final rows = await (await db).query('connections', orderBy: 'name ASC');
    return rows.map(Connection.fromMap).toList();
  }

  static Future<void> saveConnection(Connection c) async {
    await (await db).insert('connections', c.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  static Future<void> deleteConnection(String id) async {
    await (await db).delete('connections', where: 'id = ?', whereArgs: [id]);
  }

  // History
  static Future<List<QueryHistory>> getHistory(String connectionId,
      {int limit = 50}) async {
    final rows = await (await db).query(
      'query_history',
      where: 'connection_id = ?',
      whereArgs: [connectionId],
      orderBy: 'executed_at DESC',
      limit: limit,
    );
    return rows.map(QueryHistory.fromMap).toList();
  }

  static Future<void> insertHistory(QueryHistory h) async {
    await (await db).insert('query_history', h.toMap());
  }

  static Future<void> clearHistory(String connectionId) async {
    await (await db).delete('query_history',
        where: 'connection_id = ?', whereArgs: [connectionId]);
  }

  // Saved queries
  static Future<List<SavedQuery>> getSavedQueries(String connectionId) async {
    final rows = await (await db).query(
      'saved_queries',
      where: 'connection_id = ?',
      whereArgs: [connectionId],
      orderBy: 'created_at DESC',
    );
    return rows.map(SavedQuery.fromMap).toList();
  }

  static Future<void> saveQuery(SavedQuery q) async {
    await (await db).insert('saved_queries', q.toMap());
  }

  static Future<void> deleteQuery(int id) async {
    await (await db)
        .delete('saved_queries', where: 'id = ?', whereArgs: [id]);
  }
}
