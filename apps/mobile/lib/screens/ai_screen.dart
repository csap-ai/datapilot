import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../app_state.dart';
import '../services/ai_service.dart';

class AiScreen extends StatefulWidget {
  const AiScreen({super.key});

  @override
  State<AiScreen> createState() => _AiScreenState();
}

class _AiScreenState extends State<AiScreen> {
  AiAction _action = AiAction.generate;
  final _prompt = TextEditingController();
  final _sql = TextEditingController();
  final _schema = TextEditingController();
  final _error = TextEditingController();
  bool _running = false;
  String? _result;
  String? _errorMsg;
  bool _hasConfig = false;

  @override
  void initState() {
    super.initState();
    _checkConfig();
  }

  @override
  void dispose() {
    _prompt.dispose();
    _sql.dispose();
    _schema.dispose();
    _error.dispose();
    super.dispose();
  }

  Future<void> _checkConfig() async {
    final cfg = await AiService.loadConfig();
    if (!mounted) return;
    setState(() => _hasConfig = cfg.isComplete);
  }

  Future<void> _run() async {
    setState(() {
      _running = true;
      _result = null;
      _errorMsg = null;
    });
    try {
      final r = await AiService.complete(
        action: _action,
        userPrompt: _prompt.text.trim(),
        sql: _sql.text.trim(),
        schema: _schema.text.trim(),
        errorMsg: _error.text.trim(),
      );
      if (!mounted) return;
      setState(() => _result = r);
    } catch (e) {
      if (!mounted) return;
      setState(() => _errorMsg = e.toString());
    } finally {
      if (mounted) setState(() => _running = false);
    }
  }

  bool get _canRun {
    if (_running) return false;
    switch (_action) {
      case AiAction.generate:
        return _prompt.text.trim().isNotEmpty;
      case AiAction.explain:
      case AiAction.optimize:
        return _sql.text.trim().isNotEmpty;
      case AiAction.repair:
        return _sql.text.trim().isNotEmpty && _error.text.trim().isNotEmpty;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI 助手'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            tooltip: '配置 AI',
            onPressed: () => context.read<AppState>().setTabIndex(4),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (!_hasConfig)
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.orange.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.orange.withValues(alpha: 0.5)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber, color: Colors.orange),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '尚未配置 AI（baseURL / model / apiKey）',
                        style: theme.textTheme.bodyMedium,
                      ),
                    ),
                    TextButton(
                      onPressed: () =>
                          context.read<AppState>().setTabIndex(4),
                      child: const Text('去配置'),
                    ),
                  ],
                ),
              ),
            SegmentedButton<AiAction>(
              segments: const [
                ButtonSegment(value: AiAction.generate, label: Text('生成')),
                ButtonSegment(value: AiAction.explain, label: Text('解释')),
                ButtonSegment(value: AiAction.optimize, label: Text('优化')),
                ButtonSegment(value: AiAction.repair, label: Text('修复')),
              ],
              selected: {_action},
              onSelectionChanged: (s) => setState(() => _action = s.first),
            ),
            const SizedBox(height: 12),
            ..._buildFormFor(_action),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _canRun ? _run : null,
              icon: _running
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.auto_awesome),
              label: const Text('执行'),
            ),
            const SizedBox(height: 16),
            if (_errorMsg != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: SelectableText(
                  _errorMsg!,
                  style: const TextStyle(
                    color: Colors.redAccent,
                    fontFamily: 'monospace',
                    fontSize: 12,
                  ),
                ),
              )
            else if (_result != null)
              _ResultBlock(
                text: _result!,
                onSendToQuery: () {
                  context.read<AppState>().sendSqlToQuery(_result!);
                },
              ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildFormFor(AiAction a) {
    switch (a) {
      case AiAction.generate:
        return [
          TextField(
            controller: _prompt,
            minLines: 3,
            maxLines: 6,
            decoration: const InputDecoration(
              labelText: '需求描述',
              hintText: '例如：找出最近 7 天每天的活跃用户数',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 8),
          _SchemaField(controller: _schema),
        ];
      case AiAction.explain:
      case AiAction.optimize:
        return [
          _SqlField(controller: _sql, onChanged: () => setState(() {})),
          const SizedBox(height: 8),
          _SchemaField(controller: _schema),
        ];
      case AiAction.repair:
        return [
          _SqlField(controller: _sql, onChanged: () => setState(() {})),
          const SizedBox(height: 8),
          TextField(
            controller: _error,
            minLines: 2,
            maxLines: 6,
            decoration: const InputDecoration(
              labelText: '错误信息',
              hintText: '粘贴数据库返回的报错',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => setState(() {}),
          ),
        ];
    }
  }
}

class _SqlField extends StatelessWidget {
  final TextEditingController controller;
  final VoidCallback onChanged;

  const _SqlField({required this.controller, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      minLines: 4,
      maxLines: 10,
      style: const TextStyle(fontFamily: 'monospace', fontSize: 13),
      decoration: const InputDecoration(
        labelText: 'SQL',
        border: OutlineInputBorder(),
      ),
      onChanged: (_) => onChanged(),
    );
  }
}

class _SchemaField extends StatelessWidget {
  final TextEditingController controller;

  const _SchemaField({required this.controller});

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      minLines: 2,
      maxLines: 6,
      style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
      decoration: const InputDecoration(
        labelText: 'Schema（可选）',
        hintText: 'CREATE TABLE ...',
        border: OutlineInputBorder(),
      ),
    );
  }
}

class _ResultBlock extends StatelessWidget {
  final String text;
  final VoidCallback onSendToQuery;

  const _ResultBlock({required this.text, required this.onSendToQuery});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: theme.colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(8),
        color: theme.colorScheme.surfaceContainerLow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: SelectableText(
              text,
              style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
            ),
          ),
          const Divider(height: 1),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton.icon(
                icon: const Icon(Icons.copy, size: 16),
                label: const Text('复制'),
                onPressed: () async {
                  await Clipboard.setData(ClipboardData(text: text));
                  if (!context.mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('已复制')),
                  );
                },
              ),
              TextButton.icon(
                icon: const Icon(Icons.send, size: 16),
                label: const Text('发送到查询'),
                onPressed: onSendToQuery,
              ),
              const SizedBox(width: 8),
            ],
          ),
        ],
      ),
    );
  }
}
