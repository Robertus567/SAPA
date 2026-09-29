import 'dart:async';
import 'package:flutter/material.dart';
import '../main.dart';
import '../models/profile.dart';
import '../services/api_service.dart';
import '../services/local_alerts.dart';
import '../widgets/profile_image.dart';
import 'activity_screens.dart';
import 'chat_screen.dart';
import 'login_screen.dart';
import 'profile_editor_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});
  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int index = 0;
  Timer? notificationTimer;
  Set<String>? seenNotifications;
  int unreadNotifications = 0;

  @override
  void initState() {
    super.initState();
    _checkProfile();
    LocalAlerts.initialize();
    _pollNotifications();
    notificationTimer = Timer.periodic(const Duration(seconds: 10), (_) => _pollNotifications());
  }

  @override
  void dispose() { notificationTimer?.cancel(); super.dispose(); }

  Future<void> _checkProfile() async {
    try {
      final profile = await ApiService.instance.profile();
      if (!mounted) return;
      if (profile == null || !profile.onboardingCompleted) {
        Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const ProfileEditorScreen(isOnboarding: true)), (_) => false);
      }
    } catch (_) { /* network state is shown in each page */ }
  }

  Future<void> _pollNotifications() async {
    try {
      final values = await ApiService.instance.notifications();
      if (!mounted) return;
      final unread = values.where((item) => item.readAt == null).toList();
      if (seenNotifications != null) {
        for (final item in unread) { if (!seenNotifications!.contains(item.id)) await LocalAlerts.show(item); }
      }
      seenNotifications = values.map((item) => item.id).toSet();
      setState(() => unreadNotifications = unread.length);
    } catch (_) { /* app remains usable when temporarily offline */ }
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      const DiscoverScreen(),
      const LikesScreen(),
      const MatchesScreen(),
      NotificationsScreen(onOpenLikes: () => setState(() => index = 1)),
      const ProfileEditorScreen(),
    ];
    return Scaffold(
      body: IndexedStack(index: index, children: pages),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          margin: const EdgeInsets.fromLTRB(14, 0, 14, 10),
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 7),
          decoration: BoxDecoration(
            color: ink,
            borderRadius: BorderRadius.circular(23),
            boxShadow: const [
              BoxShadow(
                color: Color(0x4417233D),
                blurRadius: 28,
                offset: Offset(0, 12),
              ),
            ],
          ),
          child: NavigationBar(
            height: 58,
            elevation: 0,
            backgroundColor: Colors.transparent,
            indicatorColor: lime.withValues(alpha: .16),
            selectedIndex: index,
            onDestinationSelected: (value) => setState(() => index = value),
            labelBehavior: NavigationDestinationLabelBehavior.onlyShowSelected,
            destinations: [
              NavigationDestination(
                icon: Icon(Icons.explore_outlined, color: Colors.white54),
                selectedIcon: Icon(Icons.explore_rounded, color: lime),
                label: 'Discover',
              ),
              NavigationDestination(
                icon: const Icon(Icons.favorite_border_rounded, color: Colors.white54),
                selectedIcon: const Icon(Icons.favorite_rounded, color: lime),
                label: 'Likes',
              ),
              NavigationDestination(
                icon: Icon(Icons.forum_outlined, color: Colors.white54),
                selectedIcon: Icon(Icons.forum_rounded, color: lime),
                label: 'Pesan',
              ),
              NavigationDestination(
                icon: Badge(isLabelVisible: unreadNotifications > 0, label: Text('$unreadNotifications'), child: const Icon(Icons.notifications_none_rounded, color: Colors.white54)),
                selectedIcon: const Icon(Icons.notifications_rounded, color: lime),
                label: 'Notifikasi',
              ),
              NavigationDestination(
                icon: Icon(Icons.person_outline_rounded, color: Colors.white54),
                selectedIcon: Icon(Icons.person_rounded, color: lime),
                label: 'Profil',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class DiscoverScreen extends StatefulWidget {
  const DiscoverScreen({super.key});
  @override
  State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  List<Profile> profiles = [];
  int current = 0;
  bool loading = true;
  String filter = '';
  String? error;
  Profile? viewer;

  @override
  void initState() {
    super.initState();
    load();
    ApiService.instance.profile().then((value) { if (mounted) setState(() => viewer = value); }).catchError((_) {});
  }

  Future<void> load([String? mbti]) async {
    setState(() => loading = true);
    try {
      final result = await ApiService.instance.discover(mbti: mbti);
      if (mounted) setState(() { profiles = result; error = null; });
    } catch (caught) { if (mounted) setState(() => error = '$caught'); }
    if (mounted) {
      setState(() {
        loading = false;
        current = 0;
      });
    }
  }

  Future<void> like({bool superLike = false}) async {
    if (current >= profiles.length) {
      return;
    }
    final profile = profiles[current % profiles.length];
    try {
      final result = await ApiService.instance.like(profile.id, superLike: superLike);
      if (result['matched'] == true && mounted) {
        final matchedItem = MatchItem(
          id: '${result['matchId']}',
          conversationId: '${result['conversationId']}',
          userId: profile.id,
          fullName: profile.fullName,
          mbti: profile.mbti,
          photoUrl: profile.photoUrl,
          lastMessage: 'Kalian baru saja match. Mulai percakapan!',
        );
        await showDialog(
          context: context,
          barrierDismissible: false,
          builder: (_) => MatchDialog(profile: profile, match: matchedItem, viewerPhoto: viewer?.photoUrl ?? '/people/default.svg'),
        );
      }
      if (mounted) setState(() => current++);
    } catch (caught) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$caught')));
    }
  }

  void openDetails(Profile profile) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: cream,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (sheetContext) => FractionallySizedBox(
        heightFactor: .75,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(22),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Center(child: Container(width: 38, height: 4, decoration: BoxDecoration(color: Colors.black12, borderRadius: BorderRadius.circular(99)))),
            const SizedBox(height: 20),
            Center(child: ClipRRect(borderRadius: BorderRadius.circular(26), child: SizedBox(width: 112, height: 112, child: ProfileImage(profile.photoUrl)))),
            const SizedBox(height: 17),
            Text('${profile.fullName}, ${profile.age}', style: const TextStyle(fontFamily: 'serif', fontSize: 29, fontWeight: FontWeight.w700)),
            Text('${profile.mbti} · ${profile.city}', style: const TextStyle(color: violet, fontWeight: FontWeight.w700)),
            const SizedBox(height: 17),
            Text(profile.bio, style: const TextStyle(height: 1.55, fontSize: 14)),
            const SizedBox(height: 18),
            Wrap(spacing: 7, runSpacing: 7, children: profile.interests.map((item) => Chip(label: Text(item))).toList()),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () { Navigator.pop(sheetContext); like(); },
              icon: const Icon(Icons.favorite_rounded), label: const Text('Kirim like'),
              style: FilledButton.styleFrom(backgroundColor: coral, minimumSize: const Size.fromHeight(52)),
            ),
          ]),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final profile = current < profiles.length ? profiles[current] : null;
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(17, 17, 17, 0),
        child: SingleChildScrollView(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const SapaBrand(),
                const Spacer(),
                IconButton.filledTonal(onPressed: () async {
                  final query = await showSearch<String?>(context: context, delegate: _ProfileSearch(profiles));
                  if (query != null && mounted) setState(() { profiles = profiles.where((item) => item.fullName.toLowerCase().contains(query.toLowerCase()) || item.city.toLowerCase().contains(query.toLowerCase())).toList(); current = 0; });
                }, icon: const Icon(Icons.search_rounded)),
                const SizedBox(width: 4),
                Stack(
                  children: [
                    CircleAvatar(
                      radius: 22,
                      backgroundColor: Colors.white,
                      child: ClipOval(
                        child: ProfileImage(viewer?.photoUrl ?? '/people/default.svg'),
                      ),
                    ),
                    Positioned(
                      right: 0,
                      top: 0,
                      child: Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          color: coral,
                          shape: BoxShape.circle,
                          border: Border.all(color: cream, width: 2),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 19),
            Text(
              'SELAMAT DATANG, ${(viewer?.fullName.split(' ').first ?? 'TEMAN').toUpperCase()}',
              style: TextStyle(
                color: coral,
                letterSpacing: 1.6,
                fontSize: 9,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 5),
            Text(
              'Siapa yang satu\nfrekuensi hari ini?',
              style: Theme.of(
                context,
              ).textTheme.headlineMedium?.copyWith(fontSize: 31, height: 1.02),
            ),
            const SizedBox(height: 14),
            SizedBox(
              height: 36,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: ['', 'INFJ', 'ENFJ', 'INTP', 'ENTP'].map((type) {
                  final active = filter == type;
                  return Padding(
                    padding: const EdgeInsets.only(right: 7),
                    child: ChoiceChip(
                      label: Text(type.isEmpty ? 'Untukmu' : type),
                      selected: active,
                      onSelected: (_) {
                        setState(() => filter = type);
                        load(type);
                      },
                      showCheckmark: false,
                      selectedColor: ink,
                      labelStyle: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: active ? Colors.white : ink,
                      ),
                      side: const BorderSide(color: Color(0x1717233D)),
                      backgroundColor: Colors.white60,
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 13),
            SizedBox(
              height: MediaQuery.sizeOf(context).height < 730 ? 390 : MediaQuery.sizeOf(context).height - 340,
              child: AnimatedOpacity(
                opacity: loading ? .62 : 1,
                duration: const Duration(milliseconds: 220),
                child: profile == null ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Icon(loading ? Icons.hourglass_empty_rounded : Icons.auto_awesome_rounded, size: 46, color: violet), const SizedBox(height: 12), Text(loading ? 'Mencari teman baru…' : error ?? 'Semua profil sudah kamu lihat', textAlign: TextAlign.center, style: const TextStyle(fontFamily: 'serif', fontSize: 20)), const SizedBox(height: 8), TextButton(onPressed: () => load(filter), child: const Text('Muat ulang'))])) : ProfileCard(profile: profile, onOpen: () => openDetails(profile)),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  ActionCircle(
                    icon: Icons.close_rounded,
                    color: violet,
                    onTap: () { if (profile != null) setState(() => current++); },
                  ),
                  const SizedBox(width: 15),
                  ActionCircle(
                    icon: Icons.favorite_rounded,
                    color: Colors.white,
                    background: coral,
                    size: 64,
                    onTap: like,
                  ),
                  const SizedBox(width: 15),
                  ActionCircle(
                    icon: Icons.bolt_rounded,
                    color: const Color(0xFF58711B),
                    background: lime,
                    onTap: () => like(superLike: true),
                  ),
                ],
              ),
            ),
          ],
        )),
      ),
    );
  }
}

class ProfileCard extends StatelessWidget {
  const ProfileCard({super.key, required this.profile, required this.onOpen});
  final Profile profile;
  final VoidCallback onOpen;
  @override
  Widget build(BuildContext context) => Hero(
    tag: 'profile-${profile.id}',
    child: Material(
      color: Colors.transparent,
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(30),
          boxShadow: const [
            BoxShadow(
              color: Color(0x2A17233D),
              blurRadius: 32,
              offset: Offset(0, 17),
            ),
          ],
        ),
        child: Stack(
          fit: StackFit.expand,
          children: [
            ProfileImage(profile.photoUrl),
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.transparent,
                    Color(0xE915223E),
                  ],
                  stops: [0, .42, 1],
                ),
              ),
            ),
            Positioned(
              left: 18,
              top: 18,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 11,
                  vertical: 7,
                ),
                decoration: BoxDecoration(
                  color: lime.withValues(alpha: .94),
                  borderRadius: BorderRadius.circular(99),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.auto_awesome_rounded,
                      size: 14,
                      color: ink,
                    ),
                    const SizedBox(width: 5),
                    Text(
                      '${profile.compatibility}% cocok',
                      style: const TextStyle(
                        color: ink,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (profile.isOnline)
              Positioned(
                right: 18,
                top: 18,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 7,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: .9),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: const Row(
                    children: [
                      CircleAvatar(
                        radius: 3,
                        backgroundColor: Color(0xFF55AF58),
                      ),
                      SizedBox(width: 5),
                      Text(
                        'online',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            Positioned(
              left: 22,
              right: 22,
              bottom: 20,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${profile.fullName}, ${profile.age}',
                              style: const TextStyle(
                                fontFamily: 'serif',
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                                fontSize: 29,
                                letterSpacing: -.8,
                              ),
                            ),
                            Text(
                              '${profile.mbti} · ${profile.city}',
                              style: const TextStyle(
                                color: Colors.white60,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                      InkWell(
                        onTap: onOpen,
                        customBorder: const CircleBorder(),
                        child: Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white24),
                        ),
                        child: const Icon(
                          Icons.north_east_rounded,
                          color: Colors.white,
                          size: 17,
                        ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 13),
                  Text(
                    '“${profile.bio}”',
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontFamily: 'serif',
                      fontStyle: FontStyle.italic,
                      color: Colors.white,
                      height: 1.35,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 13),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: profile.interests
                        .take(4)
                        .map(
                          (item) => Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 9,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: profile.sharedInterests.contains(item)
                                  ? lime.withValues(alpha: .17)
                                  : Colors.white10,
                              borderRadius: BorderRadius.circular(99),
                              border: Border.all(
                                color: profile.sharedInterests.contains(item)
                                    ? lime.withValues(alpha: .45)
                                    : Colors.white24,
                              ),
                            ),
                            child: Text(
                              item,
                              style: TextStyle(
                                color: profile.sharedInterests.contains(item)
                                    ? lime
                                    : Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        )
                        .toList(),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      const Icon(
                        Icons.favorite_rounded,
                        color: Color(0xFFF0A598),
                        size: 13,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        '${profile.sharedInterests.length} minat yang sama',
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class ActionCircle extends StatelessWidget {
  const ActionCircle({
    super.key,
    required this.icon,
    required this.color,
    required this.onTap,
    this.background = Colors.white,
    this.size = 52,
  });
  final IconData icon;
  final Color color, background;
  final double size;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(99),
    child: Ink(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: background,
        shape: BoxShape.circle,
        boxShadow: const [
          BoxShadow(
            color: Color(0x2017233D),
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Icon(icon, color: color, size: size * .43),
    ),
  );
}

class MatchDialog extends StatefulWidget {
  const MatchDialog({super.key, required this.profile, required this.match, required this.viewerPhoto});
  final Profile profile;
  final MatchItem match;
  final String viewerPhoto;
  @override
  State<MatchDialog> createState() => _MatchDialogState();
}

class _MatchDialogState extends State<MatchDialog> {
  List<String> ideas = [];
  bool busy = false;
  Future<void> createIdeas() async {
    setState(() => busy = true);
    try {
      ideas = await ApiService.instance.ai(
        'icebreaker',
        'Aku baru match dengan ${widget.profile.fullName} ${widget.profile.mbti}. Minat: ${widget.profile.interests.join(', ')}',
      );
    } catch (_) {
      ideas = [
        'Kalau hidupmu jadi film, genre apa yang paling pas?',
        'Hobi apa yang belakangan bikin kamu lupa waktu?',
        'Pilih satu: eksplor kota atau recharge di rumah?',
      ];
    }
    if (mounted) setState(() => busy = false);
  }

  @override
  Widget build(BuildContext context) => Dialog(
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
    child: Padding(
      padding: const EdgeInsets.fromLTRB(25, 29, 25, 22),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            "IT'S A MATCH!",
            style: TextStyle(
              color: coral,
              fontSize: 10,
              letterSpacing: 1.7,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 21),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircleAvatar(
                radius: 43,
                backgroundColor: Colors.white,
                child: ClipOval(child: ProfileImage(widget.viewerPhoto)),
              ),
              Transform.translate(
                offset: const Offset(-7, 0),
                child: const CircleAvatar(
                  radius: 20,
                  backgroundColor: coral,
                  child: Icon(
                    Icons.favorite_rounded,
                    color: Colors.white,
                    size: 18,
                  ),
                ),
              ),
              Transform.translate(
                offset: const Offset(-14, 0),
                child: CircleAvatar(
                  radius: 43,
                  backgroundColor: Colors.white,
                  child: ClipOval(child: ProfileImage(widget.profile.photoUrl)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 21),
          const Text(
            'Kalian ingin ngobrol.',
            style: TextStyle(
              fontFamily: 'serif',
              color: ink,
              fontWeight: FontWeight.w700,
              fontSize: 24,
            ),
          ),
          const SizedBox(height: 7),
          Text(
            'Mulai dari ${widget.profile.sharedInterests.isEmpty ? 'cerita yang kalian sukai' : widget.profile.sharedInterests.join(', ')}.',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Color(0xFF697287), fontSize: 11),
          ),
          const SizedBox(height: 17),
          if (ideas.isEmpty)
            OutlinedButton.icon(
              onPressed: busy ? null : createIdeas,
              icon: const Icon(Icons.auto_awesome_rounded, size: 16),
              label: Text(
                busy
                    ? 'Gemini sedang berpikir...'
                    : 'Buat icebreaker dengan Gemini',
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: violet,
                side: const BorderSide(color: Color(0x337157D9)),
              ),
            )
          else
            ...ideas.map(
              (idea) => Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 6),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF4F0FF),
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Text(
                  idea,
                  style: const TextStyle(fontSize: 9, color: ink),
                ),
              ),
            ),
          const SizedBox(height: 7),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ChatScreen(match: widget.match),
                ),
              );
            },
            style: FilledButton.styleFrom(
              backgroundColor: coral,
              minimumSize: const Size.fromHeight(48),
            ),
            child: const Text(
              'Kirim sapa pertama',
              style: TextStyle(fontWeight: FontWeight.w900),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Nanti saja', style: TextStyle(color: ink)),
          ),
        ],
      ),
    ),
  );
}

class MatchesScreen extends StatefulWidget {
  const MatchesScreen({super.key});
  @override
  State<MatchesScreen> createState() => _MatchesScreenState();
}

class _MatchesScreenState extends State<MatchesScreen> {
  List<MatchItem> matches = [];
  Timer? timer;
  bool loading = true;
  String? error;
  @override
  void initState() {
    super.initState();
    load();
    timer = Timer.periodic(const Duration(seconds: 10), (_) => load(silent: true));
  }

  @override
  void dispose() { timer?.cancel(); super.dispose(); }

  Future<void> load({bool silent = false}) async {
    try {
      final result = await ApiService.instance.matches();
      if (mounted) setState(() { matches = result; loading = false; error = null; });
    } catch (caught) { if (mounted && !silent) setState(() { loading = false; error = '$caught'; }); }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                SapaBrand(),
                Spacer(),
                CircleAvatar(
                  backgroundColor: Colors.white,
                  child: Icon(Icons.forum_outlined, color: ink),
                ),
              ],
            ),
            const SizedBox(height: 31),
            Text(
              'Percakapanmu.',
              style: Theme.of(
                context,
              ).textTheme.headlineMedium?.copyWith(fontSize: 34),
            ),
            const Text(
              'Lanjutkan obrolan yang terasa nyambung.',
              style: TextStyle(color: Color(0xFF6C7486), fontSize: 11),
            ),
            const SizedBox(height: 20),
            if (error != null) Text(error!, style: const TextStyle(color: Colors.red)),
            Expanded(
              child: loading ? const Center(child: CircularProgressIndicator()) : matches.isEmpty ? const Center(child: Text('Belum ada match. Mulai dengan satu like yang tulus ♡', textAlign: TextAlign.center)) : RefreshIndicator(onRefresh: load, child: ListView.separated(
                itemCount: matches.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (_, index) {
                  final item = matches[index];
                  return Material(
                    color: Colors.white.withValues(alpha: .68),
                    borderRadius: BorderRadius.circular(19),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(19),
                      onTap: () async { await Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ChatScreen(match: item),
                        ),
                      ); await load(); },
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            Container(
                              width: 59,
                              height: 59,
                              clipBehavior: Clip.antiAlias,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(17),
                              ),
                              child: ProfileImage(item.photoUrl),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Flexible(child: Text(
                                        item.fullName,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w900,
                                        ),
                                      )),
                                      const SizedBox(width: 5),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 6,
                                          vertical: 3,
                                        ),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFE9E2FF),
                                          borderRadius: BorderRadius.circular(
                                            99,
                                          ),
                                        ),
                                        child: Text(
                                          item.mbti,
                                          style: const TextStyle(
                                            color: violet,
                                            fontSize: 7,
                                            fontWeight: FontWeight.w900,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    item.lastMessage,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: Color(0xFF737B8B),
                                      fontSize: 10,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            if (item.unread > 0)
                              CircleAvatar(
                                radius: 10,
                                backgroundColor: coral,
                                child: Text(
                                  '${item.unread}',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 8,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              )),
            ),
          ],
        ),
      ),
    );
  }
}

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final bio = TextEditingController(
    text:
        'Anak visual yang suka percakapan panjang, toko buku kecil, dan playlist yang dibuat terlalu serius.',
  );
  bool aiBusy = false;
  Future<void> generateBio() async {
    setState(() => aiBusy = true);
    try {
      final result = await ApiService.instance.ai(
        'bio',
        'INFP, suka film, indie music, psikologi, fotografi, mencari teman baru dan study buddy.',
      );
      if (result.isNotEmpty) bio.text = result.first;
    } catch (_) {
      bio.text =
          'Suka percakapan panjang, film yang tinggal di kepala, dan menemukan sudut kota yang tenang. Sedang mencari teman baru untuk berbagi cerita dan tumbuh bareng.';
    }
    if (mounted) setState(() => aiBusy = false);
  }

  @override
  Widget build(BuildContext context) => SafeArea(
    bottom: false,
    child: SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 100),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Row(
            children: [
              SapaBrand(),
              Spacer(),
              Icon(Icons.settings_outlined, color: ink),
            ],
          ),
          const SizedBox(height: 30),
          Center(
            child: Stack(
              children: [
                Container(
                  width: 118,
                  height: 118,
                  clipBehavior: Clip.antiAlias,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(35),
                    border: Border.all(color: Colors.white, width: 5),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x2417233D),
                        blurRadius: 24,
                        offset: Offset(0, 11),
                      ),
                    ],
                  ),
                  child: const ProfileImage('assets/people/nara.svg'),
                ),
                const Positioned(
                  right: 0,
                  bottom: 0,
                  child: CircleAvatar(
                    backgroundColor: coral,
                    child: Icon(
                      Icons.edit_rounded,
                      color: Colors.white,
                      size: 17,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 15),
          const Center(
            child: Text(
              'Nara Putri, 22',
              style: TextStyle(
                fontFamily: 'serif',
                fontWeight: FontWeight.w700,
                fontSize: 27,
              ),
            ),
          ),
          const Center(
            child: Text(
              '@nara · INFP · Bandung',
              style: TextStyle(
                color: violet,
                fontSize: 10,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(height: 25),
          Container(
            padding: const EdgeInsets.all(17),
            decoration: BoxDecoration(
              color: Colors.white70,
              borderRadius: BorderRadius.circular(21),
              border: Border.all(color: const Color(0x1117233D)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'TENTANG AKU',
                  style: TextStyle(
                    fontSize: 9,
                    letterSpacing: 1.2,
                    color: coral,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: bio,
                  maxLines: 5,
                  minLines: 3,
                  maxLength: 600,
                ),
                OutlinedButton.icon(
                  onPressed: aiBusy ? null : generateBio,
                  icon: const Icon(Icons.auto_awesome_rounded, size: 17),
                  label: Text(
                    aiBusy
                        ? 'Gemini sedang merangkai...'
                        : 'Bantu tulis dengan Gemini',
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: violet,
                    side: const BorderSide(color: Color(0x337157D9)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 13),
          Container(
            padding: const EdgeInsets.all(17),
            decoration: BoxDecoration(
              color: ink,
              borderRadius: BorderRadius.circular(21),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'MINAT UTAMA',
                  style: TextStyle(
                    fontSize: 9,
                    letterSpacing: 1.2,
                    color: lime,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                SizedBox(height: 12),
                Wrap(
                  spacing: 7,
                  runSpacing: 7,
                  children: [
                    Interest('Film'),
                    Interest('Indie music'),
                    Interest('Psikologi'),
                    Interest('Fotografi'),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () async {
              try {
                final existing = await ApiService.instance.profile();
                if (existing?.birthDate == null) throw ApiException('Lengkapi profil terlebih dahulu.');
                await ApiService.instance.updateProfile({'fullName': existing!.fullName, 'birthDate': existing.birthDate, 'city': existing.city, 'country': 'Indonesia', 'mbti': existing.mbti, 'languages': existing.languages, 'hobbies': existing.hobbies, 'interests': existing.interests, 'lookingFor': existing.lookingFor, 'bio': bio.text, 'photoUrl': existing.photoUrl, 'isVisible': existing.isVisible});
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Profil tersimpan.')),
                  );
                }
              } catch (error) {
                if (context.mounted) {
                  ScaffoldMessenger.of(
                    context,
                  ).showSnackBar(SnackBar(content: Text('$error')));
                }
              }
            },
            style: FilledButton.styleFrom(
              backgroundColor: coral,
              minimumSize: const Size.fromHeight(51),
            ),
            child: const Text(
              'Simpan perubahan',
              style: TextStyle(fontWeight: FontWeight.w900),
            ),
          ),
          TextButton(
            onPressed: () async {
              await ApiService.instance.logout();
              if (context.mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (_) => false,
                );
              }
            },
            child: const Text(
              'Keluar dari akun',
              style: TextStyle(color: Color(0xFFB04435)),
            ),
          ),
        ],
      ),
    ),
  );
}

class Interest extends StatelessWidget {
  const Interest(this.label, {super.key});
  final String label;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
    decoration: BoxDecoration(
      color: Colors.white10,
      borderRadius: BorderRadius.circular(99),
      border: Border.all(color: Colors.white24),
    ),
    child: Text(
      label,
      style: const TextStyle(
        color: Colors.white,
        fontSize: 9,
        fontWeight: FontWeight.w700,
      ),
    ),
  );
}

class _ProfileSearch extends SearchDelegate<String?> {
  _ProfileSearch(this.profiles);
  final List<Profile> profiles;
  @override
  String get searchFieldLabel => 'Cari nama atau kota';
  @override
  List<Widget> buildActions(BuildContext context) => [IconButton(onPressed: () => query = '', icon: const Icon(Icons.clear_rounded))];
  @override
  Widget buildLeading(BuildContext context) => IconButton(onPressed: () => close(context, null), icon: const Icon(Icons.arrow_back_rounded));
  @override
  Widget buildResults(BuildContext context) => _results(context);
  @override
  Widget buildSuggestions(BuildContext context) => _results(context);
  Widget _results(BuildContext context) {
    final found = profiles.where((item) => item.fullName.toLowerCase().contains(query.toLowerCase()) || item.city.toLowerCase().contains(query.toLowerCase())).take(8).toList();
    return ListView(children: [for (final item in found) ListTile(leading: CircleAvatar(child: ClipOval(child: ProfileImage(item.photoUrl))), title: Text(item.fullName), subtitle: Text('${item.mbti} · ${item.city}'), onTap: () => close(context, query))]);
  }
}
