import 'dart:math';
import 'package:flutter/material.dart';
import '../models/connection.dart';
import '../services/credential_service.dart';
import '../services/query_service.dart';

class ConnectionFormDialog extends StatefulWidget {
  final Connection? initial;

  const ConnectionFormDialog({super.key, this.initial});

  static Future<Connection?> show(BuildContext context, {Connection? initial}) {
    return showDialog<Connection>(
      context: context,
      builder: (_) => ConnectionFormDialog(initial: initial),
    );
  }

  @override
  State<ConnectionFormDialog> createState() => _ConnectionFormDialogState();
}

class _ConnectionFormDialogState extends State<ConnectionFormDialog> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _name;
  late TextEditingController _host;
  late TextEditingController _port;
  late TextEditingController _database;
  late TextEditingController _username;
  late TextEditingController _password;
  late TextEditingController _filePath;
  String _type = 'postgres';
  bool _readonly = true;
  String _sslMode = 'require';
  bool _testing = false;

  @override
  void initState() {
    super.initState();
    final init = widget.initial;
    _type = init?.type ?? 'postgres';
    _name = TextEditingController(text: init?.name ?? '');
    _host = TextEditingController(text: init?.host ?? '');
    _port = TextEditingController(text: init?.port == 0 || init == null ? '' : init.port.toString());
    _database = TextEditingController(text: init?.database ?? '');
    _username = TextEditingController(text: init?.username ?? '');
    _password = TextEditingController();
    _filePath = TextEditingController(text: init?.filePath ?? '');
    _readonly = init?.readonly ?? true;
    _sslMode = init?.sslMode ?? 'require';
  }

  @override
  void dispose() {
    _name.dispose();
    _host.dispose();
    _port.dispose();
    _database.dispose();
    _username.dispose();
    _password.dispose();
    _filePath.dispose();
    super.dispose();
  }

  Connection _build() {
    final init = widget.initial;
    return Connection(
      id: init?.id ?? _randomId(),
      name: _name.text.trim(),
      type: _type,
      host: _type == 'sqlite' ? '' : _host.text.trim(),
      port: _type == 'sqlite' ? 0 : int.tryParse(_port.text.trim()) ?? 0,
      database: _type == 'sqlite' ? '' : _database.text.trim(),
      username: _type == 'sqlite' ? '' : _username.text.trim(),
      filePath: _type == 'sqlite' ? _filePath.text.trim() : '',
      readonly: _readonly,
      sslMode: _sslMode,
    );
  }

  Future<void> _onTest() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _testing = true);
    try {
      final conn = _build();
      await QueryService.test(
        conn,
        overridePassword: _password.text.isEmpty ? null : _password.text,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('连接成功')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('连接失败：$e')),
      );
    } finally {
      if (mounted) setState(() => _testing = false);
    }
  }

  Future<void> _onSave() async {
    if (!_formKey.currentState!.validate()) return;
    final conn = _build();
    if (_password.text.isNotEmpty) {
      await CredentialService.savePassword(conn.id, _password.text);
    }
    if (!mounted) return;
    Navigator.of(context).pop(conn);
  }

  @override
  Widget build(BuildContext context) {
    final isSqlite = _type == 'sqlite';
    final isPostgres = _type == 'postgres';
    return AlertDialog(
      title: Text(widget.initial == null ? '新建连接' : '编辑连接'),
      content: SizedBox(
        width: 480,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                DropdownButtonFormField<String>(
                  initialValue: _type,
                  decoration: const InputDecoration(labelText: '类型'),
                  items: const [
                    DropdownMenuItem(value: 'postgres', child: Text('PostgreSQL')),
                    DropdownMenuItem(value: 'mysql', child: Text('MySQL')),
                    DropdownMenuItem(value: 'sqlite', child: Text('SQLite')),
                  ],
                  onChanged: (v) => setState(() => _type = v ?? 'postgres'),
                ),
                TextFormField(
                  controller: _name,
                  decoration: const InputDecoration(labelText: '名称'),
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? '请填写名称' : null,
                ),
                if (isSqlite)
                  TextFormField(
                    controller: _filePath,
                    decoration: const InputDecoration(
                      labelText: '数据库文件路径',
                      hintText: '/storage/emulated/0/Download/db.sqlite',
                    ),
                    validator: (v) => v == null || v.trim().isEmpty
                        ? '请填写文件路径'
                        : null,
                  )
                else ...[
                  Row(
                    children: [
                      Expanded(
                        flex: 3,
                        child: TextFormField(
                          controller: _host,
                          decoration: const InputDecoration(labelText: '主机'),
                          validator: (v) => v == null || v.trim().isEmpty
                              ? '请填写主机'
                              : null,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          controller: _port,
                          decoration: InputDecoration(
                            labelText: '端口',
                            hintText: isPostgres ? '5432' : '3306',
                          ),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ],
                  ),
                  TextFormField(
                    controller: _database,
                    decoration: const InputDecoration(labelText: '数据库名'),
                  ),
                  TextFormField(
                    controller: _username,
                    decoration: const InputDecoration(labelText: '用户名'),
                  ),
                  TextFormField(
                    controller: _password,
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: '密码',
                      hintText: widget.initial == null
                          ? null
                          : '留空则沿用已保存的密码',
                    ),
                  ),
                  if (isPostgres)
                    DropdownButtonFormField<String>(
                      initialValue: _sslMode,
                      decoration: const InputDecoration(labelText: 'SSL'),
                      items: const [
                        DropdownMenuItem(
                            value: 'require', child: Text('require（默认）')),
                        DropdownMenuItem(
                            value: 'disable', child: Text('disable')),
                        DropdownMenuItem(
                            value: 'verify-full', child: Text('verify-full')),
                      ],
                      onChanged: (v) =>
                          setState(() => _sslMode = v ?? 'require'),
                    ),
                ],
                const SizedBox(height: 8),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('只读连接'),
                  subtitle: const Text('阻断所有 DML/DDL，仅允许 SELECT'),
                  value: _readonly,
                  onChanged: (v) => setState(() => _readonly = v),
                ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('取消'),
        ),
        TextButton(
          onPressed: _testing ? null : _onTest,
          child: _testing
              ? const SizedBox(
                  width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('测试'),
        ),
        FilledButton(onPressed: _onSave, child: const Text('保存')),
      ],
    );
  }
}

String _randomId() {
  final r = Random();
  final bytes = List<int>.generate(8, (_) => r.nextInt(256));
  return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
}
