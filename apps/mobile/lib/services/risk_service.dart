enum RiskLevel { none, warning, danger }

class RiskAssessment {
  final RiskLevel level;
  final String message;
  const RiskAssessment(this.level, this.message);
}

final _whitespace = RegExp(r'\s+');
final _dropPattern = RegExp(
  r'^\s*(DROP\s+(TABLE|DATABASE|SCHEMA|VIEW|INDEX)|TRUNCATE\s+TABLE)\b',
  caseSensitive: false,
);
final _alterRenamePattern = RegExp(
  r'^\s*(ALTER\s+(TABLE|DATABASE)|RENAME\s+TABLE)\b',
  caseSensitive: false,
);
final _deleteUpdatePattern = RegExp(
  r'^\s*(DELETE\s+FROM|UPDATE)\b',
  caseSensitive: false,
);
final _wherePattern = RegExp(r'\bWHERE\b', caseSensitive: false);

RiskAssessment assessSql(String sql) {
  final normalized = sql.trim();
  if (normalized.isEmpty) {
    return const RiskAssessment(RiskLevel.none, '');
  }

  if (_dropPattern.hasMatch(normalized)) {
    return const RiskAssessment(
      RiskLevel.danger,
      '检测到 DROP / TRUNCATE 等破坏性操作。',
    );
  }

  if (_deleteUpdatePattern.hasMatch(normalized) &&
      !_wherePattern.hasMatch(normalized)) {
    return const RiskAssessment(
      RiskLevel.danger,
      '检测到不带 WHERE 子句的 DELETE / UPDATE，将影响整张表。',
    );
  }

  if (_alterRenamePattern.hasMatch(normalized)) {
    return const RiskAssessment(
      RiskLevel.warning,
      '检测到 ALTER / RENAME 操作，会修改表结构。',
    );
  }

  return const RiskAssessment(RiskLevel.none, '');
}

bool isReadOnlyStatement(String sql) {
  final firstWord = sql.trim().split(_whitespace).first.toUpperCase();
  return firstWord == 'SELECT' ||
      firstWord == 'WITH' ||
      firstWord == 'EXPLAIN' ||
      firstWord == 'SHOW' ||
      firstWord == 'DESCRIBE' ||
      firstWord == 'DESC' ||
      firstWord == 'PRAGMA';
}
