import 'package:flutter_test/flutter_test.dart';
import 'package:datapilot_mobile/services/risk_service.dart';

void main() {
  group('assessSql', () {
    test('返回 none 当 SQL 为空', () {
      expect(assessSql('').level, RiskLevel.none);
      expect(assessSql('   ').level, RiskLevel.none);
    });

    test('SELECT 返回 none', () {
      expect(assessSql('SELECT * FROM users').level, RiskLevel.none);
      expect(assessSql('  select 1  ').level, RiskLevel.none);
      expect(assessSql('WITH cte AS (SELECT 1) SELECT * FROM cte').level,
          RiskLevel.none);
    });

    test('DROP TABLE/DATABASE/SCHEMA/VIEW 返回 danger', () {
      expect(assessSql('DROP TABLE users').level, RiskLevel.danger);
      expect(assessSql('drop database mydb').level, RiskLevel.danger);
      expect(assessSql('DROP SCHEMA public').level, RiskLevel.danger);
      expect(assessSql('DROP VIEW v1').level, RiskLevel.danger);
    });

    test('TRUNCATE 返回 danger', () {
      expect(assessSql('TRUNCATE TABLE users').level, RiskLevel.danger);
    });

    test('DELETE/UPDATE 无 WHERE 返回 danger', () {
      expect(assessSql('DELETE FROM users').level, RiskLevel.danger);
      expect(assessSql('UPDATE users SET active = false').level,
          RiskLevel.danger);
    });

    test('DELETE/UPDATE 含 WHERE 返回 none', () {
      expect(assessSql('DELETE FROM users WHERE id = 1').level, RiskLevel.none);
      expect(assessSql('UPDATE users SET active = false WHERE id = 1').level,
          RiskLevel.none);
    });

    test('ALTER/RENAME 返回 warning', () {
      expect(assessSql('ALTER TABLE users ADD COLUMN age INT').level,
          RiskLevel.warning);
      expect(assessSql('ALTER DATABASE mydb OWNER TO admin').level,
          RiskLevel.warning);
      expect(assessSql('RENAME TABLE old TO new').level, RiskLevel.warning);
    });

    test('INSERT 返回 none', () {
      expect(assessSql("INSERT INTO users (name) VALUES ('a')").level,
          RiskLevel.none);
    });
  });

  group('isReadOnlyStatement', () {
    test('识别只读语句', () {
      expect(isReadOnlyStatement('SELECT 1'), isTrue);
      expect(isReadOnlyStatement('  select * from t  '), isTrue);
      expect(isReadOnlyStatement('WITH t AS (SELECT 1) SELECT * FROM t'),
          isTrue);
      expect(isReadOnlyStatement('EXPLAIN SELECT 1'), isTrue);
      expect(isReadOnlyStatement('SHOW TABLES'), isTrue);
      expect(isReadOnlyStatement('DESCRIBE users'), isTrue);
      expect(isReadOnlyStatement('PRAGMA table_info(users)'), isTrue);
    });

    test('识别写语句', () {
      expect(isReadOnlyStatement('INSERT INTO t VALUES (1)'), isFalse);
      expect(isReadOnlyStatement('UPDATE t SET x = 1'), isFalse);
      expect(isReadOnlyStatement('DELETE FROM t'), isFalse);
      expect(isReadOnlyStatement('DROP TABLE t'), isFalse);
    });
  });
}
