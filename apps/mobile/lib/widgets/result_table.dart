import 'package:flutter/material.dart';
import '../models/query_result.dart';

class ResultTable extends StatelessWidget {
  final QueryResult result;

  const ResultTable({super.key, required this.result});

  @override
  Widget build(BuildContext context) {
    if (result.columns.isEmpty) {
      return Center(
        child: Text(
          '执行成功（${result.durationMs}ms），无返回行',
          style: TextStyle(color: Theme.of(context).colorScheme.outline),
        ),
      );
    }

    final theme = Theme.of(context);
    final truncated = result.rows.length >= 1000;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          color: theme.colorScheme.surfaceContainerHighest,
          child: Row(
            children: [
              Text('${result.rows.length} 行 · ${result.durationMs}ms',
                  style: theme.textTheme.bodySmall),
              if (truncated) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.orange.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '已截断 1000 行',
                    style: theme.textTheme.bodySmall
                        ?.copyWith(color: Colors.orange),
                  ),
                ),
              ],
            ],
          ),
        ),
        Expanded(
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: SingleChildScrollView(
              child: DataTable(
                columnSpacing: 24,
                headingRowHeight: 36,
                dataRowMinHeight: 32,
                dataRowMaxHeight: 48,
                columns: result.columns
                    .map((c) => DataColumn(
                          label: Text(
                            c,
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ))
                    .toList(),
                rows: result.rows
                    .map((row) => DataRow(
                          cells: row
                              .map((cell) => DataCell(
                                    ConstrainedBox(
                                      constraints:
                                          const BoxConstraints(maxWidth: 320),
                                      child: Text(
                                        cell,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontFamily: 'monospace',
                                          fontSize: 12,
                                        ),
                                      ),
                                    ),
                                  ))
                              .toList(),
                        ))
                    .toList(),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
