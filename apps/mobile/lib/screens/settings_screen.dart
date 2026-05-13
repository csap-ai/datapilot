import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:provider/provider.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart' as p;
import '../app_state.dart';
import '../services/ai_service.dart';
import '../services/auth_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _baseUrl = TextEditingController();
  final _model = TextEditingController();
  final _apiKey = TextEditingController();
  bool _loadingCfg = true;
  bool _saving = false;
  bool _showApiKey = false;
  bool _bioAvailable = false;
  bool _bioEnrolled = false;

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  @override
  void dispose() {
    _baseUrl.dispose();
    _model.dispose();
    _apiKey.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    final cfg = await AiService.loadConfig();
    final available = await AuthService.isAvailable();
    final enrolled = available ? await AuthService.isEnrolled() : false;
    if (!mounted) return;
    setState(() {
      _baseUrl.text = cfg.baseURL;
      _model.text = cfg.model;
      _apiKey.text = cfg.apiKey;
      _bioAvailable = available;
      _bioEnrolled = enrolled;
      _loadingCfg = false;
    });
  }

  Future<void> _saveAi() async {
    setState(() => _saving = true);
    try {
      await AiService.saveConfig(AiConfig(
        baseURL: _baseUrl.text.trim(),
        model: _model.text.trim(),
        apiKey: _apiKey.text.trim(),
      ));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('已保存')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('保存失败：$e')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _testAuth() async {
    final result = await AuthService.authenticate(reason: '测试生物认证');
    if (!mounted) return;
    final msg = switch (result) {
      AuthResult.success => '验证成功',
      AuthResult.failure => '验证失败',
      AuthResult.notAvailable => '设备不支持',
      AuthResult.notEnrolled => '尚未注册',
      AuthResult.lockedOut => '已锁定，请稍后再试',
    };
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _clearAll() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('清除所有数据？'),
        content: const Text(
          '将删除所有连接、密码、历史、收藏和 AI 配置。该操作不可恢复。',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('取消'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('全部清除'),
          ),
        ],
      ),
    );
    if (ok != true) return;

    const storage = FlutterSecureStorage();
    await storage.deleteAll();

    try {
      final dbPath = p.join(await getDatabasesPath(), 'datapilot.db');
      await deleteDatabase(dbPath);
    } catch (_) {}

    if (!mounted) return;
    final appState = context.read<AppState>();
    appState.setCurrentConnection(null);
    appState.lock();

    setState(() {
      _baseUrl.clear();
      _model.clear();
      _apiKey.clear();
    });

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('已清除全部数据，请重启应用')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    return Scaffold(
      appBar: AppBar(title: const Text('设置')),
      body: _loadingCfg
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.symmetric(vertical: 8),
              children: [
                _SectionHeader(title: 'AI'),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextField(
                        controller: _baseUrl,
                        decoration: const InputDecoration(
                          labelText: 'baseURL',
                          hintText: 'https://api.openai.com/v1',
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _model,
                        decoration: const InputDecoration(
                          labelText: 'model',
                          hintText: 'gpt-4o-mini',
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _apiKey,
                        obscureText: !_showApiKey,
                        decoration: InputDecoration(
                          labelText: 'apiKey',
                          suffixIcon: IconButton(
                            icon: Icon(_showApiKey
                                ? Icons.visibility_off
                                : Icons.visibility),
                            onPressed: () =>
                                setState(() => _showApiKey = !_showApiKey),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Align(
                        alignment: Alignment.centerRight,
                        child: FilledButton.icon(
                          onPressed: _saving ? null : _saveAi,
                          icon: _saving
                              ? const SizedBox(
                                  width: 14,
                                  height: 14,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2),
                                )
                              : const Icon(Icons.save),
                          label: const Text('保存'),
                        ),
                      ),
                    ],
                  ),
                ),
                const Divider(),
                _SectionHeader(title: '安全'),
                ListTile(
                  leading: const Icon(Icons.fingerprint),
                  title: const Text('生物认证'),
                  subtitle: Text(_bioAvailable
                      ? (_bioEnrolled ? '已注册' : '设备支持但未注册')
                      : '设备不支持'),
                  trailing: TextButton(
                    onPressed: _bioAvailable ? _testAuth : null,
                    child: const Text('测试'),
                  ),
                ),
                ListTile(
                  leading: Icon(
                    appState.isUnlocked ? Icons.lock_open : Icons.lock,
                    color: appState.isUnlocked ? Colors.orange : null,
                  ),
                  title: const Text('本进程解锁状态'),
                  subtitle: Text(appState.isUnlocked
                      ? '已解锁（重启后失效）'
                      : '已锁定'),
                  trailing: appState.isUnlocked
                      ? TextButton(
                          onPressed: () => appState.lock(),
                          child: const Text('锁定'),
                        )
                      : null,
                ),
                if (kDebugMode)
                  SwitchListTile(
                    secondary: const Icon(Icons.bug_report),
                    title: const Text('Debug：跳过生物认证'),
                    subtitle: const Text('仅 debug 模式，直接解锁'),
                    value: appState.isUnlocked,
                    onChanged: (v) =>
                        v ? appState.unlock() : appState.lock(),
                  ),
                const Divider(),
                _SectionHeader(title: '数据'),
                ListTile(
                  leading: const Icon(Icons.delete_forever,
                      color: Colors.redAccent),
                  title: const Text('清除所有数据'),
                  subtitle: const Text('连接、密码、历史、收藏、AI 配置'),
                  onTap: _clearAll,
                ),
                const Divider(),
                _SectionHeader(title: '关于'),
                const ListTile(
                  leading: Icon(Icons.info_outline),
                  title: Text('DataPilot Mobile'),
                  subtitle: Text('版本 1.0.0 · 直连 PostgreSQL / MySQL / SQLite'),
                ),
              ],
            ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Text(
        title,
        style: theme.textTheme.labelLarge?.copyWith(
          color: theme.colorScheme.primary,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
