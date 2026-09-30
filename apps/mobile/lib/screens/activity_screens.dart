import 'dart:async';
import 'package:flutter/material.dart';
import '../main.dart';
import '../models/profile.dart';
import '../services/api_service.dart';
import '../widgets/profile_image.dart';
import 'chat_screen.dart';

class LikesScreen extends StatefulWidget {
  const LikesScreen({super.key});
  @override
  State<LikesScreen> createState() => _LikesScreenState();
}

class _LikesScreenState extends State<LikesScreen> {
  List<Map<String, dynamic>> likes = [];
  Timer? timer;
  bool loading = true, busy = false;
  String? error;

  @override
  void initState() { super.initState(); load(); timer = Timer.periodic(const Duration(seconds: 5), (_) => load(silent: true)); }
  @override
  void dispose() { timer?.cancel(); super.dispose(); }

  Future<void> load({bool silent = false}) async {
    try {
      final values = await ApiService.instance.incomingLikes();
      if (mounted) setState(() { likes = values; error = null; loading = false; });
    } catch (caught) { if (mounted && !silent) setState(() { error = '$caught'; loading = false; }); }
  }

  Future<void> likeBack(Map<String, dynamic> person) async {
    if (busy) return;
    setState(() => busy = true);
    try {
      final result = await ApiService.instance.like('${person['userId']}');
      await load();
      if (!mounted) return;
      if (result['matched'] == true && result['conversationId'] != null) {
        final item = MatchItem(id: '${result['matchId']}', conversationId: '${result['conversationId']}', userId: '${person['userId']}', fullName: '${person['fullName']}', mbti: '${person['mbti']}', photoUrl: '${person['photoUrl']}', lastMessage: 'Kalian baru saja match. Mulai percakapan!');
        await showDialog<void>(context: context, builder: (dialogContext) => AlertDialog(
          title: const Text('Kalian match! ✦'), content: Text('Kamu dan ${item.fullName} sama-sama ingin ngobrol.'),
          actions: [TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Nanti')), FilledButton(onPressed: () { Navigator.pop(dialogContext); Navigator.push(context, MaterialPageRoute(builder: (_) => ChatScreen(match: item))); }, child: const Text('Kirim sapa'))],
        ));
      }
    } catch (caught) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$caught'))); }
    finally { if (mounted) setState(() => busy = false); }
  }

  @override
  Widget build(BuildContext context) => SafeArea(bottom: false, child: Padding(
    padding: const EdgeInsets.fromLTRB(18, 20, 18, 12),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const SapaBrand(), const SizedBox(height: 30),
      Text('Yang menyukaimu.', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontSize: 33)),
      const SizedBox(height: 5), const Text('Balas like untuk mulai percakapan.', style: TextStyle(color: Color(0xFF687184), fontSize: 12)),
      const SizedBox(height: 18),
      if (error != null) Text(error!, style: const TextStyle(color: Colors.red)),
      Expanded(child: loading ? const Center(child: CircularProgressIndicator()) : likes.isEmpty ? const _EmptyActivity(icon: Icons.favorite_border_rounded, title: 'Belum ada like masuk.', description: 'Lengkapi profil dan tetap terlihat di Discover agar teman baru bisa menemukanmu.') : RefreshIndicator(onRefresh: load, child: ListView.separated(itemCount: likes.length, separatorBuilder: (_, __) => const SizedBox(height: 11), itemBuilder: (_, index) {
        final person = likes[index];
        return Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: const Color(0x1117233D))), child: Row(children: [
          ClipRRect(borderRadius: BorderRadius.circular(16), child: SizedBox(width: 64, height: 72, child: ProfileImage('${person['photoUrl']}'))),
          const SizedBox(width: 12), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('${person['fullName']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w900)), Text('${person['mbti']} · ${person['city']}', style: const TextStyle(color: violet, fontSize: 12))])),
          person['likedBack'] == true ? const Icon(Icons.check_circle_rounded, color: Color(0xFF6EA64B)) : IconButton.filled(onPressed: busy ? null : () => likeBack(person), style: IconButton.styleFrom(backgroundColor: coral, foregroundColor: Colors.white), icon: const Icon(Icons.favorite_rounded)),
        ]));
      }))),
    ]),
  ));
}

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key, required this.onOpenLikes});
  final VoidCallback onOpenLikes;
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<SapaNotification> items = [];
  Timer? timer;
  bool loading = true;
  String? error;

  @override
  void initState() { super.initState(); load(); timer = Timer.periodic(const Duration(seconds: 5), (_) => load(silent: true)); }
  @override
  void dispose() { timer?.cancel(); super.dispose(); }

  Future<void> load({bool silent = false}) async {
    try { final values = await ApiService.instance.notifications(); if (mounted) setState(() { items = values; loading = false; error = null; }); }
    catch (caught) { if (mounted && !silent) setState(() { loading = false; error = '$caught'; }); }
  }

  Future<void> open(SapaNotification item) async {
    try {
      await ApiService.instance.markNotification(id: item.id);
      await load();
      if (!mounted) return;
      final conversationId = item.payload['conversationId'];
      if (conversationId != null) {
        final matches = await ApiService.instance.matches();
        final selected = matches.where((match) => match.conversationId == '$conversationId').firstOrNull;
        if (selected != null && mounted) await Navigator.push(context, MaterialPageRoute(builder: (_) => ChatScreen(match: selected)));
      } else if (item.type == 'like' || item.type == 'spark') { widget.onOpenLikes(); }
    } catch (caught) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$caught'))); }
  }

  @override
  Widget build(BuildContext context) => SafeArea(bottom: false, child: Padding(
    padding: const EdgeInsets.fromLTRB(18, 20, 18, 12),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const SapaBrand(), const SizedBox(height: 30),
      Row(children: [Expanded(child: Text('Kabar untukmu.', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontSize: 33))), if (items.any((item) => item.readAt == null)) TextButton(onPressed: () async { await ApiService.instance.markNotification(); await load(); }, child: const Text('Tandai dibaca'))]),
      const SizedBox(height: 5), const Text('Like, komentar, match, dan pesan terbaru.', style: TextStyle(color: Color(0xFF687184), fontSize: 12)),
      const SizedBox(height: 18),
      if (error != null) Text(error!, style: const TextStyle(color: Colors.red)),
      Expanded(child: loading ? const Center(child: CircularProgressIndicator()) : items.isEmpty ? const _EmptyActivity(icon: Icons.notifications_none_rounded, title: 'Belum ada kabar baru.', description: 'Saat teman lain menyapamu, kabarnya akan muncul di sini.') : RefreshIndicator(onRefresh: load, child: ListView.separated(itemCount: items.length, separatorBuilder: (_, __) => const SizedBox(height: 8), itemBuilder: (_, index) {
        final item = items[index];
        final action = item.type == 'like' ? 'menyukai profilmu' : item.type == 'spark' ? 'mengirim spark' : item.type == 'comment' ? 'mengirim komentar pembuka' : item.type == 'match' ? 'match denganmu' : 'mengirim pesan baru';
        return Material(color: item.readAt == null ? const Color(0xFFEFEAFF) : Colors.white70, borderRadius: BorderRadius.circular(18), child: InkWell(onTap: () => open(item), borderRadius: BorderRadius.circular(18), child: Padding(padding: const EdgeInsets.all(13), child: Row(children: [
          ClipRRect(borderRadius: BorderRadius.circular(14), child: SizedBox(width: 48, height: 48, child: ProfileImage(item.actorPhoto))),
          const SizedBox(width: 12), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('${item.actorName} $action', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)), const SizedBox(height: 3), Text(item.createdAt.split('T').first, style: const TextStyle(fontSize: 12, color: Color(0xFF788194)))])),
          if (item.readAt == null) const CircleAvatar(radius: 4, backgroundColor: coral),
        ]))));
      }))),
    ]),
  ));
}

class _EmptyActivity extends StatelessWidget {
  const _EmptyActivity({required this.icon, required this.title, required this.description});
  final IconData icon;
  final String title, description;
  @override
  Widget build(BuildContext context) => Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Icon(icon, size: 54, color: violet), const SizedBox(height: 14), Text(title, style: const TextStyle(fontSize: 20, fontFamily: 'serif', fontWeight: FontWeight.w700)), const SizedBox(height: 8), Text(description, textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFF667087), fontSize: 12))]));
}
