class Profile {
  const Profile({
    required this.id,
    required this.fullName,
    required this.username,
    required this.age,
    required this.city,
    required this.mbti,
    required this.bio,
    required this.photoUrl,
    required this.interests,
    this.sharedInterests = const [],
    this.compatibility = 86,
    this.isOnline = false,
    this.birthDate,
    this.languages = const ['Indonesia'],
    this.hobbies = const [],
    this.lookingFor = const ['Teman baru'],
    this.isVisible = true,
    this.onboardingCompleted = false,
  });

  final String id;
  final String fullName;
  final String username;
  final int age;
  final String city;
  final String mbti;
  final String bio;
  final String photoUrl;
  final List<String> interests;
  final List<String> sharedInterests;
  final int compatibility;
  final bool isOnline;
  final String? birthDate;
  final List<String> languages;
  final List<String> hobbies;
  final List<String> lookingFor;
  final bool isVisible;
  final bool onboardingCompleted;

  factory Profile.fromJson(Map<String, dynamic> json) => Profile(
    id: '${json['id']}',
    fullName: '${json['fullName'] ?? 'SAPA Member'}',
    username: '${json['username'] ?? 'member'}',
    age: (json['age'] as num?)?.toInt() ?? 21,
    city: '${json['city'] ?? ''}',
    mbti: '${json['mbti'] ?? 'INFP'}',
    bio: '${json['bio'] ?? ''}',
    photoUrl: '${json['photoUrl'] ?? '/people/default.svg'}',
    interests: List<String>.from(json['interests'] ?? const []),
    sharedInterests: List<String>.from(json['sharedInterests'] ?? const []),
    compatibility: (json['compatibility'] as num?)?.toInt() ?? 86,
    isOnline: json['isOnline'] == true,
    birthDate: json['birthDate'] as String?,
    languages: List<String>.from(json['languages'] ?? const ['Indonesia']),
    hobbies: List<String>.from(json['hobbies'] ?? const []),
    lookingFor: List<String>.from(json['lookingFor'] ?? const ['Teman baru']),
    isVisible: json['isVisible'] != false,
    onboardingCompleted: json['onboardingCompleted'] == true,
  );
}

class SapaNotification {
  const SapaNotification({required this.id, required this.type, required this.actorName, required this.actorPhoto, required this.payload, required this.createdAt, this.readAt});
  final String id;
  final String type;
  final String actorName;
  final String actorPhoto;
  final Map<String, dynamic> payload;
  final String createdAt;
  final String? readAt;
  factory SapaNotification.fromJson(Map<String, dynamic> json) => SapaNotification(
    id: '${json['id']}', type: '${json['type']}', actorName: '${json['actorName'] ?? 'Seseorang'}',
    actorPhoto: '${json['actorPhoto'] ?? '/people/default.svg'}',
    payload: Map<String, dynamic>.from(json['payload'] ?? const {}),
    createdAt: '${json['createdAt']}', readAt: json['readAt'] as String?,
  );
}

class MatchItem {
  const MatchItem({
    required this.id,
    required this.conversationId,
    required this.userId,
    required this.fullName,
    required this.mbti,
    required this.photoUrl,
    required this.lastMessage,
    this.unread = 0,
  });
  final String id;
  final String conversationId;
  final String userId;
  final String fullName;
  final String mbti;
  final String photoUrl;
  final String lastMessage;
  final int unread;

  factory MatchItem.fromJson(Map<String, dynamic> json) => MatchItem(
    id: '${json['id']}',
    conversationId: '${json['conversationId']}',
    userId: '${json['userId']}',
    fullName: '${json['fullName']}',
    mbti: '${json['mbti']}',
    photoUrl: '${json['photoUrl']}',
    lastMessage: '${json['lastMessage'] ?? ''}',
    unread: (json['unread'] as num?)?.toInt() ?? 0,
  );
}

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.senderId,
    required this.body,
    required this.createdAt,
    this.imageUrl,
    this.readAt,
  });
  final String id;
  final String senderId;
  final String body;
  final String createdAt;
  final String? imageUrl;
  final String? readAt;

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
    id: '${json['id']}',
    senderId: '${json['senderId']}',
    body: '${json['body'] ?? ''}',
    createdAt: '${json['createdAt']}',
    imageUrl: json['imageUrl'] as String?,
    readAt: json['readAt'] as String?,
  );
}
