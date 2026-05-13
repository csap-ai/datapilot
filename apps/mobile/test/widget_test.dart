import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:datapilot_mobile/widgets/empty_state.dart';

void main() {
  testWidgets('EmptyState renders title and subtitle', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: EmptyState(
            icon: Icons.storage_outlined,
            title: '还没有连接',
            subtitle: '点击新建添加',
          ),
        ),
      ),
    );
    expect(find.text('还没有连接'), findsOneWidget);
    expect(find.text('点击新建添加'), findsOneWidget);
  });
}
