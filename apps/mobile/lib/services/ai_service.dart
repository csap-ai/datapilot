import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'credential_service.dart';

enum AiAction { generate, explain, optimize, repair }

class AiConfig {
  final String baseURL;
  final String model;
  final String apiKey;

  const AiConfig({
    required this.baseURL,
    required this.model,
    required this.apiKey,
  });

  bool get isComplete =>
      baseURL.isNotEmpty && model.isNotEmpty && apiKey.isNotEmpty;
}

class AiService {
  static const _storage = FlutterSecureStorage();
  static const _baseUrlKey = 'ai_base_url';
  static const _modelKey = 'ai_model';

  static Future<AiConfig> loadConfig() async {
    final baseURL = await _storage.read(key: _baseUrlKey) ?? '';
    final model = await _storage.read(key: _modelKey) ?? '';
    final apiKey = await CredentialService.getAiApiKey() ?? '';
    return AiConfig(baseURL: baseURL, model: model, apiKey: apiKey);
  }

  static Future<void> saveConfig(AiConfig cfg) async {
    await _storage.write(key: _baseUrlKey, value: cfg.baseURL);
    await _storage.write(key: _modelKey, value: cfg.model);
    if (cfg.apiKey.isNotEmpty) {
      await CredentialService.saveAiApiKey(cfg.apiKey);
    }
  }

  static Future<void> clearConfig() async {
    await _storage.delete(key: _baseUrlKey);
    await _storage.delete(key: _modelKey);
    await CredentialService.deleteAiApiKey();
  }

  static Future<String> complete({
    required AiAction action,
    String userPrompt = '',
    String sql = '',
    String schema = '',
    String errorMsg = '',
    AiConfig? config,
  }) async {
    final cfg = config ?? await loadConfig();
    if (!cfg.isComplete) {
      throw Exception('AI 未配置：请在「设置」中填写 baseURL / model / apiKey');
    }

    final prompts = _buildPrompt(
      action: action,
      userPrompt: userPrompt,
      sql: sql,
      schema: schema,
      errorMsg: errorMsg,
    );

    final url = Uri.parse('${_trimRight(cfg.baseURL, '/')}/chat/completions');
    final body = jsonEncode({
      'model': cfg.model,
      'messages': [
        {'role': 'system', 'content': prompts.system},
        {'role': 'user', 'content': prompts.user},
      ],
      'max_tokens': 2048,
    });

    final resp = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        if (cfg.apiKey.isNotEmpty) 'Authorization': 'Bearer ${cfg.apiKey}',
      },
      body: body,
    ).timeout(const Duration(seconds: 90));

    if (resp.statusCode >= 400) {
      throw Exception('HTTP ${resp.statusCode}: ${resp.body}');
    }

    final decoded = jsonDecode(resp.body) as Map<String, dynamic>;
    final error = decoded['error'];
    if (error is Map && error['message'] != null) {
      throw Exception('AI error: ${error['message']}');
    }
    final choices = decoded['choices'];
    if (choices is! List || choices.isEmpty) {
      throw Exception('AI 返回为空');
    }
    final msg = (choices.first as Map)['message'] as Map<String, dynamic>?;
    final content = msg?['content'] as String? ?? '';
    return content.trim();
  }
}

class _Prompt {
  final String system;
  final String user;
  const _Prompt(this.system, this.user);
}

_Prompt _buildPrompt({
  required AiAction action,
  required String userPrompt,
  required String sql,
  required String schema,
  required String errorMsg,
}) {
  switch (action) {
    case AiAction.generate:
      final system =
          'You are an expert SQL assistant. Generate a valid SQL query based on the user\'s request and the provided database schema. Return ONLY the SQL query, no explanation, no markdown code fences.';
      var user = userPrompt;
      if (schema.isNotEmpty) {
        user = 'Database schema:\n$schema\n\nRequest: $userPrompt';
      }
      return _Prompt(system, user);
    case AiAction.explain:
      final system =
          'You are an expert SQL assistant. Explain the following SQL query clearly and concisely. Describe what it does, which tables it accesses, and any potential issues. Respond in the same language the user is likely using.';
      var user = 'SQL:\n$sql';
      if (schema.isNotEmpty) user += '\n\nDatabase schema:\n$schema';
      return _Prompt(system, user);
    case AiAction.optimize:
      final system =
          'You are an expert SQL performance tuning assistant. Optimize the given SQL for better performance. Return the optimized SQL first (no markdown fences), then a brief explanation of the changes separated by a blank line.';
      var user = 'SQL:\n$sql';
      if (schema.isNotEmpty) user += '\n\nDatabase schema:\n$schema';
      return _Prompt(system, user);
    case AiAction.repair:
      const system =
          'You are an expert SQL assistant. Fix the SQL query that produced an error. Return ONLY the corrected SQL, no explanation, no markdown code fences.';
      final user = 'SQL:\n$sql\n\nError:\n$errorMsg';
      return _Prompt(system, user);
  }
}

String _trimRight(String s, String char) {
  var end = s.length;
  while (end > 0 && s[end - 1] == char) {
    end--;
  }
  return s.substring(0, end);
}
