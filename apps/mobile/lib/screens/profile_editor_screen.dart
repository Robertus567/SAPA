import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../main.dart';
import '../models/profile.dart';
import '../services/api_service.dart';
import '../widgets/profile_image.dart';
import 'home_shell.dart';
import 'login_screen.dart';

const interestsCatalog = ['Film', 'Indie music', 'Game', 'Buku', 'Fotografi', 'Tech', 'Psikologi', 'K-pop', 'Travel', 'Olahraga', 'Anime', 'Kuliner'];
const mbtiCatalog = ['INFP', 'ENFP', 'INFJ', 'ENFJ', 'INTJ', 'ENTJ', 'INTP', 'ENTP', 'ISFP', 'ESFP', 'ISFJ', 'ESFJ', 'ISTP', 'ESTP', 'ISTJ', 'ESTJ'];

class ProfileEditorScreen extends StatefulWidget {
  const ProfileEditorScreen({super.key, this.isOnboarding = false});
  final bool isOnboarding;
  @override
  State<ProfileEditorScreen> createState() => _ProfileEditorScreenState();
}

class _ProfileEditorScreenState extends State<ProfileEditorScreen> {
  final name = TextEditingController();
  final city = TextEditingController();
  final bio = TextEditingController();
  DateTime? birthDate;
  String mbti = 'INFP';
  String photoUrl = '/people/default.svg';
  List<String> interests = [];
  bool loading = true, saving = false, aiBusy = false, visible = true;
  Profile? profile;

  @override
  void initState() { super.initState(); load(); }

  @override
  void dispose() { name.dispose(); city.dispose(); bio.dispose(); super.dispose(); }

  Future<void> load() async {
    try {
      final result = await ApiService.instance.profile();
      if (!mounted) return;
      profile = result;
      name.text = result?.fullName == 'SAPA Member' ? '' : result?.fullName ?? '';
      city.text = result?.city ?? '';
      bio.text = result?.bio ?? '';
      mbti = result?.mbti ?? 'INFP';
      photoUrl = result?.photoUrl ?? '/people/default.svg';
      interests = [...?result?.interests];
      visible = result?.isVisible ?? true;
      birthDate = DateTime.tryParse(result?.birthDate ?? '');
    } catch (error) {
      if (mounted) _notice('$error');
    } finally { if (mounted) setState(() => loading = false); }
  }

  void _notice(String message) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));

  Future<void> choosePhoto() async {
    try {
      final picked = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 65, maxWidth: 900);
      if (picked == null) return;
      final bytes = await picked.readAsBytes();
      if (bytes.length > 800000) { _notice('Foto maksimal 800 KB. Pilih foto yang lebih kecil.'); return; }
      final lower = picked.name.toLowerCase();
      final mime = lower.endsWith('.png') ? 'image/png' : lower.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
      setState(() => photoUrl = 'data:$mime;base64,${base64Encode(bytes)}');
    } catch (error) { if (mounted) _notice('Foto belum dapat dipilih: $error'); }
  }

  Future<void> pickBirthDate() async {
    final today = DateTime.now();
    final maximum = DateTime(today.year - 18, today.month, today.day);
    final selected = await showDatePicker(context: context, firstDate: DateTime(today.year - 100), lastDate: maximum, initialDate: birthDate != null && birthDate!.isBefore(maximum) ? birthDate! : DateTime(today.year - 20), helpText: 'Tanggal lahir');
    if (selected != null) setState(() => birthDate = selected);
  }

  Future<void> generateBio() async {
    setState(() => aiBusy = true);
    try {
      final values = await ApiService.instance.ai('bio', 'Nama ${name.text}. MBTI $mbti. Kota ${city.text}. Minat ${interests.join(', ')}. Tulis bio pertemanan singkat.');
      if (values.isNotEmpty) bio.text = values.first;
    } catch (error) { if (mounted) _notice('$error'); }
    if (mounted) setState(() => aiBusy = false);
  }

  Future<void> save() async {
    if (name.text.trim().length < 2) { _notice('Nama minimal dua karakter.'); return; }
    if (birthDate == null) { _notice('Pilih tanggal lahir.'); return; }
    if (city.text.trim().length < 2) { _notice('Kota minimal dua karakter.'); return; }
    if (interests.length < 3) { _notice('Pilih minimal tiga minat.'); return; }
    if (bio.text.trim().length < 10) { _notice('Bio minimal 10 karakter.'); return; }
    setState(() => saving = true);
    try {
      final date = '${birthDate!.year.toString().padLeft(4, '0')}-${birthDate!.month.toString().padLeft(2, '0')}-${birthDate!.day.toString().padLeft(2, '0')}';
      profile = await ApiService.instance.updateProfile({
        'fullName': name.text.trim(), 'birthDate': date, 'city': city.text.trim(), 'country': 'Indonesia',
        'mbti': mbti, 'languages': profile?.languages ?? ['Indonesia'], 'hobbies': interests.take(5).toList(),
        'interests': interests, 'lookingFor': profile?.lookingFor ?? ['Teman baru', 'Study buddy'],
        'bio': bio.text.trim(), 'photoUrl': photoUrl, 'isVisible': visible,
      });
      if (!mounted) return;
      if (widget.isOnboarding) {
        Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const HomeShell()), (_) => false);
      } else { _notice('Profil berhasil disimpan ✦'); }
    } catch (error) { if (mounted) _notice('$error'); }
    finally { if (mounted) setState(() => saving = false); }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: cream,
    body: SafeArea(child: loading ? const Center(child: CircularProgressIndicator()) : SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 105),
      child: Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 620), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const SapaBrand(), const SizedBox(height: 34),
        Text(widget.isOnboarding ? 'Biar mereka tahu siapa kamu.' : 'Profil yang terasa seperti kamu.', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontSize: 33)),
        const SizedBox(height: 8), const Text('Foto opsional. Avatar bawaan sudah siap untukmu.', style: TextStyle(color: Color(0xFF667087))),
        const SizedBox(height: 24),
        Center(child: InkWell(onTap: choosePhoto, borderRadius: BorderRadius.circular(31), child: Stack(children: [
          Container(width: 118, height: 118, clipBehavior: Clip.antiAlias, decoration: BoxDecoration(borderRadius: BorderRadius.circular(31), border: Border.all(color: Colors.white, width: 4), boxShadow: const [BoxShadow(color: Color(0x2317233D), blurRadius: 24, offset: Offset(0, 10))]), child: ProfileImage(photoUrl)),
          const Positioned(right: 0, bottom: 0, child: CircleAvatar(radius: 18, backgroundColor: coral, child: Icon(Icons.camera_alt_rounded, color: Colors.white, size: 17))),
        ]))),
        const SizedBox(height: 25),
        TextField(controller: name, textInputAction: TextInputAction.next, maxLength: 80, decoration: const InputDecoration(labelText: 'Nama lengkap', prefixIcon: Icon(Icons.person_outline_rounded))),
        const SizedBox(height: 8),
        OutlinedButton.icon(onPressed: pickBirthDate, icon: const Icon(Icons.calendar_today_outlined), label: Text(birthDate == null ? 'Pilih tanggal lahir' : '${birthDate!.day}/${birthDate!.month}/${birthDate!.year}'), style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(52), alignment: Alignment.centerLeft, foregroundColor: ink, backgroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)))),
        const SizedBox(height: 16),
        TextField(controller: city, textInputAction: TextInputAction.next, maxLength: 80, decoration: const InputDecoration(labelText: 'Kota', prefixIcon: Icon(Icons.location_on_outlined))),
        const SizedBox(height: 18),
        const Text('TIPE MBTI', style: TextStyle(color: coral, fontSize: 12, letterSpacing: 1.3, fontWeight: FontWeight.w900)),
        const SizedBox(height: 7), DropdownButtonFormField<String>(initialValue: mbti, items: mbtiCatalog.map((item) => DropdownMenuItem(value: item, child: Text(item))).toList(), onChanged: (value) => setState(() => mbti = value ?? mbti)),
        const SizedBox(height: 23), const Text('MINATMU · PILIH MINIMAL 3', style: TextStyle(color: coral, fontSize: 12, letterSpacing: 1.3, fontWeight: FontWeight.w900)),
        const SizedBox(height: 9), Wrap(spacing: 7, runSpacing: 5, children: interestsCatalog.map((item) => FilterChip(label: Text(item), selected: interests.contains(item), selectedColor: const Color(0xFFE8DFFF), onSelected: (_) => setState(() { if (interests.contains(item)) { interests.remove(item); } else { interests.add(item); } }))).toList()),
        const SizedBox(height: 24), const Text('TENTANG AKU', style: TextStyle(color: coral, fontSize: 12, letterSpacing: 1.3, fontWeight: FontWeight.w900)),
        const SizedBox(height: 8), TextField(controller: bio, minLines: 4, maxLines: 6, maxLength: 600, decoration: const InputDecoration(hintText: 'Aku suka... dan sedang mencari teman untuk...')),
        OutlinedButton.icon(onPressed: aiBusy ? null : generateBio, icon: const Icon(Icons.auto_awesome_rounded, size: 17), label: Text(aiBusy ? 'Gemini sedang merangkai…' : 'Bantu tulis dengan Gemini'), style: OutlinedButton.styleFrom(foregroundColor: violet)),
        const SizedBox(height: 20), SwitchListTile.adaptive(contentPadding: EdgeInsets.zero, title: const Text('Tampilkan di Discover', style: TextStyle(fontWeight: FontWeight.w800)), subtitle: const Text('Orang lain dapat menemukan profilmu.'), value: visible, onChanged: (value) => setState(() => visible = value)),
        const SizedBox(height: 20), FilledButton.icon(onPressed: saving ? null : save, icon: saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.arrow_forward_rounded), label: Text(widget.isOnboarding ? 'Mulai menemukan teman' : 'Simpan perubahan'), style: FilledButton.styleFrom(backgroundColor: coral, minimumSize: const Size.fromHeight(56), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)))),
        if (!widget.isOnboarding) TextButton(onPressed: () async { await ApiService.instance.logout(); if (context.mounted) Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const LoginScreen()), (_) => false); }, child: const Text('Keluar dari akun', style: TextStyle(color: Color(0xFFB04435)))),
      ]))),
    )),
  );
}
