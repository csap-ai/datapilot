import 'package:flutter/foundation.dart';

class AppState extends ChangeNotifier {
  int _tabIndex = 0;
  String? _currentConnectionId;
  String? _pendingSqlDraft;
  bool _isUnlocked = false;

  int get tabIndex => _tabIndex;
  String? get currentConnectionId => _currentConnectionId;
  String? get pendingSqlDraft => _pendingSqlDraft;
  bool get isUnlocked => _isUnlocked;

  void setTabIndex(int i) {
    if (_tabIndex == i) return;
    _tabIndex = i;
    notifyListeners();
  }

  void setCurrentConnection(String? id) {
    if (_currentConnectionId == id) return;
    _currentConnectionId = id;
    notifyListeners();
  }

  void sendSqlToQuery(String sql, {String? connectionId}) {
    _pendingSqlDraft = sql;
    if (connectionId != null) _currentConnectionId = connectionId;
    _tabIndex = 1;
    notifyListeners();
  }

  String? consumePendingSql() {
    final draft = _pendingSqlDraft;
    if (draft == null) return null;
    _pendingSqlDraft = null;
    return draft;
  }

  void unlock() {
    if (_isUnlocked) return;
    _isUnlocked = true;
    notifyListeners();
  }

  void lock() {
    if (!_isUnlocked) return;
    _isUnlocked = false;
    notifyListeners();
  }
}
