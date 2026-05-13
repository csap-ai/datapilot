import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class CredentialService {
  static const _storage = FlutterSecureStorage();

  static String _key(String connectionId) => 'conn_password_$connectionId';
  static const _aiKeyName = 'ai_api_key';

  static Future<void> savePassword(String connectionId, String password) =>
      _storage.write(key: _key(connectionId), value: password);

  static Future<String?> getPassword(String connectionId) =>
      _storage.read(key: _key(connectionId));

  static Future<void> deletePassword(String connectionId) =>
      _storage.delete(key: _key(connectionId));

  static Future<void> saveAiApiKey(String apiKey) =>
      _storage.write(key: _aiKeyName, value: apiKey);

  static Future<String?> getAiApiKey() =>
      _storage.read(key: _aiKeyName);

  static Future<void> deleteAiApiKey() =>
      _storage.delete(key: _aiKeyName);
}
