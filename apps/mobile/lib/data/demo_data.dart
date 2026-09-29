import '../models/profile.dart';

const demoProfiles = <Profile>[
  Profile(
    id: 'demo-bima',
    fullName: 'Bima Ardhana',
    username: 'bimaworks',
    age: 23,
    city: 'Jakarta',
    mbti: 'ENFJ',
    bio:
        'People person yang selalu punya rekomendasi tempat makan. Lagi cari teman buat proyek kecil dan eksplor kota.',
    photoUrl: 'assets/people/bima.svg',
    interests: ['Film', 'Psikologi', 'Indie music', 'Travel'],
    sharedInterests: ['Film', 'Psikologi', 'Indie music'],
    compatibility: 94,
    isOnline: true,
  ),
  Profile(
    id: 'demo-salva',
    fullName: 'Salva Nirmala',
    username: 'salvareads',
    age: 24,
    city: 'Malang',
    mbti: 'INFJ',
    bio:
        'Pembaca sunyi yang ternyata cerewet kalau sudah membahas buku, film coming-of-age, atau resep cookies.',
    photoUrl: 'assets/people/salva.svg',
    interests: ['Buku', 'Film', 'K-pop', 'Psikologi'],
    sharedInterests: ['Film', 'Psikologi'],
    compatibility: 91,
  ),
  Profile(
    id: 'demo-keisha',
    fullName: 'Keisha Aulia',
    username: 'keishacodes',
    age: 21,
    city: 'Yogyakarta',
    mbti: 'INTP',
    bio:
        'Bisa membahas bug tiga jam, lalu kalah telak di board game. Sedang belajar bahasa Jepang pelan-pelan.',
    photoUrl: 'assets/people/keisha.svg',
    interests: ['Tech', 'Game', 'Film', 'Japanese'],
    sharedInterests: ['Film'],
    compatibility: 88,
  ),
  Profile(
    id: 'demo-raka',
    fullName: 'Raka Pradipta',
    username: 'rakawanders',
    age: 25,
    city: 'Surabaya',
    mbti: 'ENTP',
    bio:
        'Suka ide random, jalan kaki tanpa tujuan, dan memotret kota sebelum matahari benar-benar bangun.',
    photoUrl: 'assets/people/raka.svg',
    interests: ['Fotografi', 'Startup', 'Jazz', 'Travel'],
    sharedInterests: ['Fotografi'],
    compatibility: 82,
    isOnline: true,
  ),
];

const demoMatches = <MatchItem>[
  MatchItem(
    id: 'demo-match',
    conversationId: 'demo',
    userId: 'demo-bima',
    fullName: 'Bima Ardhana',
    mbti: 'ENFJ',
    photoUrl: 'assets/people/bima.svg',
    lastMessage: 'Film terakhir yang bikin kamu kepikiran apa?',
    unread: 1,
  ),
  MatchItem(
    id: 'demo-salva-match',
    conversationId: 'demo',
    userId: 'demo-salva',
    fullName: 'Salva Nirmala',
    mbti: 'INFJ',
    photoUrl: 'assets/people/salva.svg',
    lastMessage: 'Thank you rekomendasinya!',
  ),
];

List<ChatMessage> demoMessages() => [
  ChatMessage(
    id: 'm1',
    senderId: 'demo-bima',
    body: 'Hai Nara! Aku lihat kita sama-sama suka film dan musik indie 👋',
    createdAt: DateTime.now()
        .subtract(const Duration(minutes: 8))
        .toIso8601String(),
    readAt: DateTime.now().toIso8601String(),
  ),
  ChatMessage(
    id: 'm2',
    senderId: 'demo-viewer',
    body: 'Hai Bima! Iya, kombinasi yang susah ditolak 😄',
    createdAt: DateTime.now()
        .subtract(const Duration(minutes: 6))
        .toIso8601String(),
    readAt: DateTime.now().toIso8601String(),
  ),
  ChatMessage(
    id: 'm3',
    senderId: 'demo-bima',
    body: 'Film terakhir yang bikin kamu kepikiran apa?',
    createdAt: DateTime.now()
        .subtract(const Duration(minutes: 2))
        .toIso8601String(),
  ),
];
