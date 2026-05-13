import 'package:flutter/material.dart';
import '../services/risk_service.dart';

class RiskConfirmDialog extends StatelessWidget {
  final RiskAssessment assessment;
  final String sql;

  const RiskConfirmDialog({
    super.key,
    required this.assessment,
    required this.sql,
  });

  static Future<bool> show(
    BuildContext context,
    RiskAssessment assessment,
    String sql,
  ) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (_) => RiskConfirmDialog(assessment: assessment, sql: sql),
    );
    return result ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final isDanger = assessment.level == RiskLevel.danger;
    final color = isDanger ? Colors.red : Colors.orange;
    final icon = isDanger ? Icons.dangerous : Icons.warning_amber;
    final title = isDanger ? '危险操作' : '请确认';

    return AlertDialog(
      icon: Icon(icon, color: color, size: 36),
      iconColor: color,
      title: Text(title),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(assessment.message),
          const SizedBox(height: 12),
          Container(
            constraints: const BoxConstraints(maxHeight: 200),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(6),
            ),
            child: SingleChildScrollView(
              child: SelectableText(
                sql,
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 12,
                ),
              ),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('取消'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: color),
          onPressed: () => Navigator.of(context).pop(true),
          child: Text(isDanger ? '确认执行' : '继续'),
        ),
      ],
    );
  }
}
