import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../app_state.dart';
import '../models/connection.dart';
import '../models/query_history.dart';
import '../models/saved_query.dart';
import '../services/database_service.dart';
import '../widgets/empty_state.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;
  List<Connection> _connections = [];
  List<QueryHistory> _history = [];
  List<SavedQuery> _saved = [];
  bool _loading = true;
  String? _loadedConnId;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _bootstrap();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    _connections = await DatabaseService.getConnections();
    await _reloadForCurrent();
  }

  Future<void> _reloadForCurrent() async {
    if (!mounted) return;
    final connId = context.read<AppState>().currentConnectionId;
    setState(() {
      _loading = true;
      _loadedConnId = connId;
    });
    if (connId == null) {
      if (!mounted) return;
      setState(() {
        _history = [];
        _saved = [];
        _loading = false;
      });
      return;
    }
    final h = await DatabaseService.getHistory(connId, limit: 200);
    final s = await DatabaseService.getSavedQueries(connId);
    if (!mounted) return;
    setState(() {
      _history = h;
      _saved = s;
      _loading = false;
    });
  }

  Future<void> _clearHistory(String connId) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('清空该连接的历史？'),
        content: const Text('该操作不可恢复。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('取消'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('清空'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await DatabaseService.clearHistory(connId);
    await _reloadForCurrent();
  }

  Future<void> _deleteSaved(SavedQuery q) async {
    if (q.id == null) return;
    await DatabaseService.deleteQuery(q.id!);
    await _reloadForCurrent();
  }

  void _send(String sql) {
    context.read<AppState>().sendSqlToQuery(sql);
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    if (_loadedConnId != appState.currentConnectionId) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _reloadForCurrent();
      });
    }

    final connId = appState.currentConnectionId;
    final conn = connId == null
        ? null
        : _connections.cast<Connection?>().firstWhere(
              (c) => c?.id == connId,
              orElse: () => null,
            );

    return Scaffold(
      appBar: AppBar(
        title: const Text('历史'),
        bottom: TabBar(
          controller: _tabs,
          tabs: const [
            Tab(text: '历史'),
            Tab(text: '收藏'),
          ],
        ),
        actions: [
          if (conn != null && _tabs.index == 0)
            IconButton(
              icon: const Icon(Icons.delete_sweep_outlined),
              tooltip: '清空历史',
              onPressed: () => _clearHistory(conn.id),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : conn == null
              ? EmptyState(
                  icon: Icons.history,
                  title: '请先选择连接',
                  subtitle: '在「查询」或「连接」选择一个连接，再回来查看历史',
                  action: FilledButton(
                    onPressed: () => appState.setTabIndex(0),
                    child: const Text('去连接列表'),
                  ),
                )
              : TabBarView(
                  controller: _tabs,
                  children: [
                    _HistoryList(items: _history, onTap: _send),
                    _SavedList(
                      items: _saved,
                      onTap: _send,
                      onDelete: _deleteSaved,
                    ),
                  ],
                ),
    );
  }
}

class _HistoryList extends StatelessWidget {
  final List<QueryHistory> items;
  final void Function(String sql) onTap;

  const _HistoryList({required this.items, required this.onTap});

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return const EmptyState(
        icon: Icons.history_toggle_off,
        title: '还没有执行历史',
        subtitle: '在「查询」中执行 SQL 后会出现在这里',
      );
    }
    return ListView.separated(
      itemCount: items.length,
      separatorBuilder: (_, _) =>
          const Divider(height: 1, indent: 16, endIndent: 16),
      itemBuilder: (context, i) {
        final h = items[i];
        final theme = Theme.of(context);
        return ListTile(
          leading: Icon(
            h.success ? Icons.check_circle_outline : Icons.error_outline,
            color: h.success ? Colors.green : Colors.redAccent,
          ),
          title: Text(
            _oneLine(h.sql),
            style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          subtitle: Text(
            '${_relative(h.executedAt)} · ${h.durationMs}ms',
            style: theme.textTheme.bodySmall,
          ),
          onTap: () => onTap(h.sql),
        );
      },
    );
  }
}

class _SavedList extends StatelessWidget {
  final List<SavedQuery> items;
  final void Function(String sql) onTap;
  final Future<void> Function(SavedQuery q) onDelete;

  const _SavedList({
    required this.items,
    required this.onTap,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return const EmptyState(
        icon: Icons.bookmark_border,
        title: '还没有收藏',
        subtitle: '在「查询」中点工具栏的收藏按钮保存常用 SQL',
      );
    }
    return ListView.separated(
      itemCount: items.length,
      separatorBuilder: (_, _) =>
          const Divider(height: 1, indent: 16, endIndent: 16),
      itemBuilder: (context, i) {
        final q = items[i];
        return ListTile(
          leading: const Icon(Icons.bookmark),
          title: Text(q.name, maxLines: 1, overflow: TextOverflow.ellipsis),
          subtitle: Text(
            _oneLine(q.sql),
            style: const TextStyle(fontFamily: 'monospace', fontSize: 11),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          onTap: () => onTap(q.sql),
          trailing: IconButton(
            icon: const Icon(Icons.delete_outline),
            onPressed: () => onDelete(q),
          ),
        );
      },
    );
  }
}

String _oneLine(String sql) =>
    sql.replaceAll(RegExp(r'\s+'), ' ').trim();

String _relative(DateTime t) {
  final diff = DateTime.now().difference(t);
  if (diff.inSeconds < 60) return '${diff.inSeconds}秒前';
  if (diff.inMinutes < 60) return '${diff.inMinutes}分钟前';
  if (diff.inHours < 24) return '${diff.inHours}小时前';
  if (diff.inDays < 7) return '${diff.inDays}天前';
  return DateFormat('yyyy-MM-dd HH:mm').format(t);
}
