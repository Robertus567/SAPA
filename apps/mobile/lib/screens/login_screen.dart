import 'package:flutter/material.dart';
import '../main.dart';
import '../services/api_service.dart';
import '../widgets/profile_image.dart';
import 'home_shell.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final email = TextEditingController(text: 'nara@sapa.app');
  final password = TextEditingController(text: 'SapaDemo123!');
  final name = TextEditingController();
  final username = TextEditingController();
  bool register = false, obscure = true, busy = false;

  Future<void> submit() async {
    setState(() => busy = true);
    try {
      if (register) {
        await ApiService.instance.register(
          email: email.text.trim(),
          password: password.text,
          fullName: name.text.trim(),
          username: username.text.trim(),
        );
      } else {
        await ApiService.instance.login(email.text.trim(), password.text);
      }
      if (mounted) {
        Navigator.of(
          context,
        ).pushReplacement(MaterialPageRoute(builder: (_) => const HomeShell()));
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$error')));
      }
    } finally {
      if (mounted) {
        setState(() => busy = false);
      }
    }
  }

  Future<void> forgotPassword() async {
    if (email.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Isi emailmu terlebih dahulu.')),
      );
      return;
    }
    setState(() => busy = true);
    try {
      final message = await ApiService.instance.forgotPassword(
        email.text.trim(),
      );
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(message)));
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$error')));
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(22, 18, 22, 36),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SapaBrand(),
            const SizedBox(height: 24),
            SizedBox(
              height: 238,
              child: Stack(
                children: [
                  Positioned(
                    left: 4,
                    top: 26,
                    child: Transform.rotate(
                      angle: -.10,
                      child: _face('assets/people/nara.svg', 145),
                    ),
                  ),
                  Positioned(
                    right: 7,
                    top: 0,
                    child: Transform.rotate(
                      angle: .09,
                      child: _face('assets/people/bima.svg', 156),
                    ),
                  ),
                  Positioned(
                    left: 112,
                    bottom: 0,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 15,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: lime,
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x22000000),
                            blurRadius: 20,
                            offset: Offset(0, 8),
                          ),
                        ],
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.auto_awesome_rounded,
                            size: 17,
                            color: violet,
                          ),
                          SizedBox(width: 6),
                          Text(
                            '94% cocok',
                            style: TextStyle(
                              fontWeight: FontWeight.w900,
                              color: ink,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Text(
              register ? 'Buat ruangmu.' : 'Temukan yang\nsatu frekuensi.',
              style: Theme.of(
                context,
              ).textTheme.headlineLarge?.copyWith(fontSize: 42, height: .98),
            ),
            const SizedBox(height: 10),
            Text(
              register
                  ? 'Mulai dari profil yang benar-benar terasa seperti kamu.'
                  : 'Pertemanan platonic berdasarkan kepribadian, minat, dan hal kecil yang kamu sukai.',
              style: const TextStyle(color: Color(0xFF667087), height: 1.55),
            ),
            const SizedBox(height: 26),
            if (register) ...[
              TextField(
                controller: name,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Nama lengkap',
                  prefixIcon: Icon(Icons.person_outline_rounded),
                ),
              ),
              const SizedBox(height: 11),
              TextField(
                controller: username,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Username',
                  prefixIcon: Icon(Icons.alternate_email_rounded),
                ),
              ),
              const SizedBox(height: 11),
            ],
            TextField(
              controller: email,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Email',
                prefixIcon: Icon(Icons.mail_outline_rounded),
              ),
            ),
            const SizedBox(height: 11),
            TextField(
              controller: password,
              obscureText: obscure,
              onSubmitted: (_) => submit(),
              decoration: InputDecoration(
                labelText: 'Kata sandi',
                prefixIcon: const Icon(Icons.lock_outline_rounded),
                suffixIcon: IconButton(
                  onPressed: () => setState(() => obscure = !obscure),
                  icon: Icon(
                    obscure
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                  ),
                ),
              ),
            ),
            if (!register)
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: busy ? null : forgotPassword,
                  child: const Text(
                    'Lupa kata sandi?',
                    style: TextStyle(
                      color: violet,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
            const SizedBox(height: 17),
            FilledButton.icon(
              onPressed: busy ? null : submit,
              style: FilledButton.styleFrom(
                backgroundColor: coral,
                minimumSize: const Size.fromHeight(55),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                ),
              ),
              icon: busy
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.arrow_forward_rounded),
              label: Text(
                register ? 'Buat akun' : 'Masuk ke SAPA',
                style: const TextStyle(fontWeight: FontWeight.w900),
              ),
            ),
            const SizedBox(height: 7),
            TextButton(
              onPressed: () => setState(() => register = !register),
              child: Text(
                register
                    ? 'Sudah punya akun? Masuk'
                    : 'Belum punya akun? Daftar gratis',
                style: const TextStyle(
                  color: violet,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            OutlinedButton(
              onPressed: () => Navigator.of(context).pushReplacement(
                MaterialPageRoute(builder: (_) => const HomeShell()),
              ),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
                side: const BorderSide(color: Color(0x2217233D)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(17),
                ),
              ),
              child: const Text(
                'Lihat preview tanpa login',
                style: TextStyle(color: ink, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
      ),
    ),
  );

  Widget _face(String asset, double size) => Container(
    width: size,
    height: 190,
    clipBehavior: Clip.antiAlias,
    decoration: BoxDecoration(
      color: Colors.white,
      border: Border.all(color: Colors.white, width: 6),
      borderRadius: BorderRadius.circular(24),
      boxShadow: const [
        BoxShadow(
          color: Color(0x24000000),
          blurRadius: 25,
          offset: Offset(0, 12),
        ),
      ],
    ),
    child: ProfileImage(asset),
  );
}
