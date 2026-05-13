import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'app_state.dart';
import 'screens/connections_screen.dart';
import 'screens/query_screen.dart';
import 'screens/history_screen.dart';
import 'screens/ai_screen.dart';
import 'screens/settings_screen.dart';

void main() {
  runApp(const DataPilotApp());
}

class DataPilotApp extends StatelessWidget {
  const DataPilotApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppState(),
      child: MaterialApp(
        title: 'DataPilot',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF2563EB),
            brightness: Brightness.dark,
          ),
          useMaterial3: true,
        ),
        home: const MainShell(),
      ),
    );
  }
}

class MainShell extends StatelessWidget {
  const MainShell({super.key});

  static const _screens = [
    ConnectionsScreen(),
    QueryScreen(),
    HistoryScreen(),
    AiScreen(),
    SettingsScreen(),
  ];

  static const _items = [
    BottomNavigationBarItem(icon: Icon(Icons.storage), label: '连接'),
    BottomNavigationBarItem(icon: Icon(Icons.code), label: '查询'),
    BottomNavigationBarItem(icon: Icon(Icons.history), label: '历史'),
    BottomNavigationBarItem(icon: Icon(Icons.auto_awesome), label: 'AI'),
    BottomNavigationBarItem(icon: Icon(Icons.settings), label: '设置'),
  ];

  @override
  Widget build(BuildContext context) {
    final index = context.watch<AppState>().tabIndex;
    return Scaffold(
      body: IndexedStack(index: index, children: _screens),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: index,
        onTap: (i) => context.read<AppState>().setTabIndex(i),
        type: BottomNavigationBarType.fixed,
        items: _items,
      ),
    );
  }
}
