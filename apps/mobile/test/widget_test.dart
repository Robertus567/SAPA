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
}
