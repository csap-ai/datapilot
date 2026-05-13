import 'package:flutter_test/flutter_test.dart';
import 'package:datapilot_mobile/main.dart';

void main() {
  testWidgets('smoke test', (tester) async {
    await tester.pumpWidget(const DataPilotApp());
    expect(find.byType(DataPilotApp), findsOneWidget);
  });
}
