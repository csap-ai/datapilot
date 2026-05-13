import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../app_state.dart';
import '../models/connection.dart';
import '../services/database_service.dart';
import '../services/credential_service.dart';
import '../widgets/connection_form_dialog.dart';
import '../widgets/empty_state.dart';

class ConnectionsScreen extends StatefulWidget {
  const ConnectionsScreen({super.key});

  @override
  State<ConnectionsScreen> createState() => _ConnectionsScreenState();
}

class _ConnectionsScreenState extends State<ConnectionsScreen> {
  List<Connection> _connections = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _refresh();
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

  Future<void> _onNew() async {
    final result = await ConnectionFormDialog.show(context);
    if (result == null) return;
    await DatabaseService.saveConnection(result);
    await _refresh();
  }

  Future<void> _onEdit(Connection conn) async {
    final result = await ConnectionFormDialog.show(context, initial: conn);
    if (result == null) return;
    await DatabaseService.saveConnection(result);
    await _refresh();
  }

  Future<void> _onDelete(Connection conn) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('删除连接？'),
        content: Text('"${conn.name}" 的密码和历史也会被清除。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('取消'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('删除'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await DatabaseService.deleteConnection(conn.id);
    await CredentialService.deletePassword(conn.id);
    await DatabaseService.clearHistory(conn.id);
    if (!mounted) return;
    final appState = context.read<AppState>();
    if (appState.currentConnectionId == conn.id) {
      appState.setCurrentConnection(null);
    }
    await _refresh();
  }

  void _onOpen(Connection conn) {
    final appState = context.read<AppState>();
    appState.setCurrentConnection(conn.id);
    appState.setTabIndex(1);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('连接'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refresh,
            tooltip: '刷新',
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _onNew,
        icon: const Icon(Icons.add),
        label: const Text('新建'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _connections.isEmpty
              ? EmptyState(
                  icon: Icons.storage_outlined,
                  title: '还没有连接',
                  subtitle: '点击右下角的"新建"，添加你的第一个数据库连接',
                  action: FilledButton.icon(
                    onPressed: _onNew,
                    icon: const Icon(Icons.add),
                    label: const Text('新建连接'),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _refresh,
                  child: ListView.separated(
                    itemCount: _connections.length,
                    separatorBuilder: (_, _) =>
                        const Divider(height: 1, indent: 16, endIndent: 16),
                    itemBuilder: (context, i) => _ConnectionTile(
                      conn: _connections[i],
                      onOpen: () => _onOpen(_connections[i]),
                      onEdit: () => _onEdit(_connections[i]),
                      onDelete: () => _onDelete(_connections[i]),
                    ),
                  ),
                ),
    );
  }
}

class _ConnectionTile extends StatelessWidget {
  final Connection conn;
  final VoidCallback onOpen;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _ConnectionTile({
    required this.conn,
    required this.onOpen,
    required this.onEdit,
    required this.onDelete,
  });

  IconData get _icon {
    switch (conn.type) {
      case 'sqlite':
        return Icons.folder_zip_outlined;
      case 'postgres':
        return Icons.dns_outlined;
      case 'mysql':
        return Icons.storage_outlined;
      default:
        return Icons.help_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListTile(
      leading: Icon(_icon, color: theme.colorScheme.primary),
      title: Row(
        children: [
          Flexible(child: Text(conn.name, overflow: TextOverflow.ellipsis)),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: theme.colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              conn.type.toUpperCase(),
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onPrimaryContainer,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          if (conn.readonly) ...[
            const SizedBox(width: 4),
            Icon(Icons.lock_outline,
                size: 12, color: theme.colorScheme.outline),
          ],
        ],
      ),
      subtitle: Text(
        conn.displayAddress,
        style: const TextStyle(fontFamily: 'monospace', fontSize: 11),
        overflow: TextOverflow.ellipsis,
      ),
      onTap: onOpen,
      trailing: PopupMenuButton<String>(
        onSelected: (v) {
          if (v == 'edit') onEdit();
          if (v == 'delete') onDelete();
        },
        itemBuilder: (_) => const [
          PopupMenuItem(value: 'edit', child: Text('编辑')),
          PopupMenuItem(value: 'delete', child: Text('删除')),
        ],
      ),
    );
  }
}
