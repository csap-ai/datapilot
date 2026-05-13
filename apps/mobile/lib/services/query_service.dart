import '../models/connection.dart';
import '../models/query_result.dart';
import 'credential_service.dart';
import 'drivers/sqlite_driver.dart';
import 'drivers/postgres_driver.dart';
import 'drivers/mysql_driver.dart';

class QueryService {
  static Future<QueryResult> execute(Connection conn, String sql) async {
    switch (conn.type) {
      case 'sqlite':
        return SqliteDriver.execute(conn, sql);
      case 'postgres':
        final pwd = await _requirePassword(conn.id);
        return PostgresDriver.execute(conn, pwd, sql);
      case 'mysql':
        final pwd = await _requirePassword(conn.id);
        return MysqlDriver.execute(conn, pwd, sql);
      default:
        throw Exception('未知连接类型：${conn.type}');
    }
  }

  static Future<void> test(Connection conn, {String? overridePassword}) async {
    switch (conn.type) {
      case 'sqlite':
        return SqliteDriver.test(conn);
      case 'postgres':
        final pwd = overridePassword ?? await _requirePassword(conn.id);
        return PostgresDriver.test(conn, pwd);
      case 'mysql':
        final pwd = overridePassword ?? await _requirePassword(conn.id);
        return MysqlDriver.test(conn, pwd);
      default:
        throw Exception('未知连接类型：${conn.type}');
    }
  }

  static Future<String> _requirePassword(String connectionId) async {
    final pwd = await CredentialService.getPassword(connectionId);
    if (pwd == null || pwd.isEmpty) {
      throw Exception('该连接没有保存密码，请在连接管理中重新填写。');
    }
    return pwd;
  }
}
