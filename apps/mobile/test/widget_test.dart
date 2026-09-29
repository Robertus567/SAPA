import 'dart:ui' show Size;
import 'package:flutter_test/flutter_test.dart';
import 'package:sapa_mobile/main.dart';

void main() {
  testWidgets('SAPA login renders primary actions', (tester) async {
    await tester.pumpWidget(const SapaApp());
    await tester.pump();
    expect(find.text('SAPA'), findsOneWidget);
    expect(find.text('Masuk ke SAPA'), findsOneWidget);
    expect(find.text('Belum punya akun? Daftar gratis'), findsOneWidget);
  });

  testWidgets('login remains usable on a narrow phone', (tester) async {
    tester.view.physicalSize = const Size(320, 568);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    await tester.pumpWidget(const SapaApp());
    await tester.pump();
    expect(tester.takeException(), isNull);
    expect(find.text('Masuk ke SAPA'), findsOneWidget);
    await tester.ensureVisible(find.text('Belum punya akun? Daftar gratis'));
    await tester.pump();
    expect(tester.takeException(), isNull);
  });
}
