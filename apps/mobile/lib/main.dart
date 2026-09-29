import 'package:flutter/material.dart';
import 'screens/login_screen.dart';
import 'screens/home_shell.dart';
import 'services/api_service.dart';

const ink = Color(0xFF17233D);
const cream = Color(0xFFF5F0E8);
const coral = Color(0xFFFF6B4A);
const violet = Color(0xFF7157D9);
const lime = Color(0xFFC9EB77);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiService.instance.loadSession();
  runApp(const SapaApp());
}

class SapaApp extends StatelessWidget {
  const SapaApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SAPA',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: cream,
        colorScheme: ColorScheme.fromSeed(
          seedColor: coral,
          brightness: Brightness.light,
          primary: coral,
          secondary: violet,
          surface: const Color(0xFFFFFDF9),
        ),
        textTheme: const TextTheme(
          headlineLarge: TextStyle(
            fontFamily: 'serif',
            fontWeight: FontWeight.w600,
            color: ink,
            letterSpacing: -1.8,
          ),
          headlineMedium: TextStyle(
            fontFamily: 'serif',
            fontWeight: FontWeight.w600,
            color: ink,
            letterSpacing: -1.1,
          ),
          titleLarge: TextStyle(fontWeight: FontWeight.w800, color: ink),
          bodyMedium: TextStyle(color: ink, height: 1.45),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(color: ink.withValues(alpha: .08)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: violet, width: 1.5),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 16,
          ),
        ),
        snackBarTheme: SnackBarThemeData(
          backgroundColor: ink,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
      home: ApiService.instance.isSignedIn
          ? const HomeShell()
          : const LoginScreen(),
    );
  }
}

class SapaBrand extends StatelessWidget {
  const SapaBrand({super.key, this.light = false});
  final bool light;
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Transform.rotate(
        angle: -.12,
        child: Container(
          width: 31,
          height: 31,
          decoration: BoxDecoration(
            border: Border.all(color: coral, width: 4),
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(18),
              bottomRight: Radius.circular(18),
              topRight: Radius.circular(7),
              bottomLeft: Radius.circular(7),
            ),
          ),
        ),
      ),
      const SizedBox(width: 9),
      Text(
        'SAPA',
        style: TextStyle(
          fontSize: 20,
          letterSpacing: 2.3,
          fontWeight: FontWeight.w900,
          color: light ? Colors.white : ink,
        ),
      ),
    ],
  );
}
