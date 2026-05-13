import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../app_state.dart';
import '../models/connection.dart';
import '../models/query_history.dart';
import '../models/query_result.dart';
import '../models/saved_query.dart';
import '../services/auth_service.dart';
import '../services/database_service.dart';
import '../services/query_service.dart';
import '../services/risk_service.dart';
import '../widgets/empty_state.dart';
import '../widgets/result_table.dart';
import '../widgets/risk_confirm_dialog.dart';
import '../widgets/sql_editor.dart';

class QueryScreen extends StatefulWidget {
  const QueryScreen({super.key});

  @override
  State<QueryScreen> createState() => _QueryScreenState();
}

class _QueryScreenState extends State<QueryScreen> {
  final _editor = TextEditingController();
  List<Connection> _connections = [];
  bool _loading = true;
  bool _running = false;
  QueryResult? _result;
  String? _error;
  String? _lastDraftId;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  @override
  void dispose() {
    _editor.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    setState(() => _loading = true);
    final list = await DatabaseService.getConnections();
    if (!mounted) return;
    setState(() {
      _connections = list;
      _loading = false;
    });
  }

  Future<bool> _gate(Connection conn, RiskAssessment risk) async {
    if (risk.level == RiskLevel.none) return true;

    if (conn.readonly) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('只读连接禁止执行写操作。')),
      );
      return false;
    }

    final appState = context.read<AppState>();
    if (!appState.isUnlocked) {
      final auth = await AuthService.authenticate(reason: '解锁以执行高风险 SQL');
      if (auth != AuthResult.success) {
        if (!mounted) return false;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('身份验证未通过。')),
        );
        return false;
      }
      appState.unlock();
    }

    if (!mounted) return false;
    return RiskConfirmDialog.show(context, risk, _editor.text);
  }

  Future<void> _execute(Connection conn) async {
    final sql = _editor.text.trim();
    if (sql.isEmpty) return;

    final risk = assessSql(sql);
    final allowed = await _gate(conn, risk);
    if (!allowed) return;
    if (!mounted) return;

    setState(() {
      _running = true;
      _result = null;
      _error = null;
    });
    final start = DateTime.now();
    bool success = true;
    try {
      final r = await QueryService.execute(conn, sql);
      if (!mounted) return;
      setState(() => _result = r);
    } catch (e) {
      success = false;
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      final duration = DateTime.now().difference(start).inMilliseconds;
      await DatabaseService.insertHistory(QueryHistory(
        connectionId: conn.id,
        sql: sql,
        durationMs: duration,
        success: success,
        executedAt: DateTime.now(),
      ));
      if (mounted) setState(() => _running = false);
    }
  }

  Future<void> _saveSnippet(Connection conn) async {
    final sql = _editor.text.trim();
    if (sql.isEmpty) return;
    final name = await _promptName();
    if (name == null || name.isEmpty) return;
    await DatabaseService.saveQuery(SavedQuery(
      connectionId: conn.id,
      name: name,
      sql: sql,
      createdAt: DateTime.now(),
    ));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('已收藏')),
    );
  }

  Future<String?> _promptName() async {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('收藏名称'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(hintText: '例如：每日活跃用户'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(controller.text.trim()),
            child: const Text('保存'),
          ),
        ],
      ),
    );
  }

  void _consumePendingDraft() {
    final appState = context.read<AppState>();
    final draftId =
        '${appState.currentConnectionId}::${appState.pendingSqlDraft.hashCode}';
    if (draftId == _lastDraftId) return;
    final draft = appState.consumePendingSql();
    if (draft == null) return;
    _editor.text = draft;
    _lastDraftId = draftId;
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _consumePendingDraft();
    });

    final connId = appState.currentConnectionId;
    final conn = connId == null
        ? null
        : _connections.cast<Connection?>().firstWhere(
              (c) => c?.id == connId,
              orElse: () => null,
            );

    return Scaffold(
      appBar: AppBar(
        title: const Text('查询'),
        actions: [
          if (conn != null)
            IconButton(
              tooltip: '收藏',
              icon: const Icon(Icons.bookmark_add_outlined),
              onPressed: () => _saveSnippet(conn),
            ),
          IconButton(
            tooltip: '清空',
            icon: const Icon(Icons.clear),
            onPressed: () {
              _editor.clear();
              setState(() {
                _result = null;
                _error = null;
              });
            },
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _connections.isEmpty
              ? EmptyState(
                  icon: Icons.code_off,
                  title: '没有可用连接',
                  subtitle: '先在「连接」标签创建一个连接',
                  action: FilledButton.icon(
                    onPressed: () =>
                        context.read<AppState>().setTabIndex(0),
                    icon: const Icon(Icons.arrow_forward),
                    label: const Text('去新建'),
                  ),
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                      child: DropdownButtonFormField<String>(
                        initialValue: conn?.id,
                        decoration: const InputDecoration(
                          labelText: '连接',
                          isDense: true,
                        ),
                        items: _connections
                            .map((c) => DropdownMenuItem(
                                  value: c.id,
                                  child: Text(
                                    '${c.name} · ${c.type}',
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ))
                            .toList(),
                        onChanged: (v) =>
                            context.read<AppState>().setCurrentConnection(v),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: SqlEditor(controller: _editor),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Row(
                        children: [
                          FilledButton.icon(
                            onPressed: (conn == null || _running)
                                ? null
                                : () => _execute(conn),
                            icon: _running
                                ? const SizedBox(
                                    width: 14,
                                    height: 14,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2),
                                  )
                                : const Icon(Icons.play_arrow),
                            label: const Text('执行'),
                          ),
                          const SizedBox(width: 8),
                          if (_result != null)
                            OutlinedButton.icon(
                              onPressed: () => _copyResult(_result!),
                              icon: const Icon(Icons.copy, size: 16),
                              label: const Text('复制 TSV'),
                            ),
                        ],
                      ),
                    ),
                    const Divider(height: 24),
                    Expanded(
                      child: _error != null
                          ? Padding(
                              padding: const EdgeInsets.all(16),
                              child: SelectableText(
                                _error!,
                                style: const TextStyle(
                                  fontFamily: 'monospace',
                                  color: Colors.redAccent,
                                  fontSize: 12,
                                ),
                              ),
                            )
                          : _result != null
                              ? ResultTable(result: _result!)
                              : Center(
                                  child: Text(
                                    '执行 SQL 以查看结果',
                                    style: TextStyle(
                                      color:
                                          Theme.of(context).colorScheme.outline,
                                    ),
                                  ),
                                ),
                    ),
                  ],
                ),
    );
  }

  Future<void> _copyResult(QueryResult r) async {
    final buf = StringBuffer();
    buf.writeln(r.columns.join('\t'));
    for (final row in r.rows) {
      buf.writeln(row.join('\t'));
    }
    await Clipboard.setData(ClipboardData(text: buf.toString()));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('已复制 TSV')),
    );
  }
}
