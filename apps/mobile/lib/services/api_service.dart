import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/profile.dart';

class ApiException implements Exception {
  ApiException(this.message);
  final String message;
  @override
  String toString() => message;
}

class ApiService {
  ApiService._();
  static final instance = ApiService._();
  static const baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://sapa-rpl-mbti.vercel.app',
  );
  String? _token;

  Future<void> loadSession() async {
    _token = (await SharedPreferences.getInstance()).getString('sapa_token');
  }

  bool get isSignedIn => _token != null;
  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_token != null) 'Authorization': 'Bearer $_token',
  };

  Future<void> login(String email, String password) async {
    final data = await _request(
      'POST',
      '/api/auth/login',
      body: {'email': email, 'password': password},
    );
    _token = data['token'] as String?;
    if (_token != null) {
      await (await SharedPreferences.getInstance()).setString(
        'sapa_token',
        _token!,
      );
    }
  }

  Future<void> register({
    required String email,
    required String password,
    required String fullName,
    required String username,
  }) async {
    final data = await _request(
      'POST',
      '/api/auth/register',
      body: {
        'email': email,
        'password': password,
        'fullName': fullName,
        'username': username,
      },
    );
    _token = data['token'] as String?;
    if (_token != null) {
      await (await SharedPreferences.getInstance()).setString(
        'sapa_token',
        _token!,
      );
    }
  }

  Future<void> logout() async {
    _token = null;
    await (await SharedPreferences.getInstance()).remove('sapa_token');
  }

  Future<String> forgotPassword(String email) async {
    final data = await _request(
      'POST',
      '/api/auth/forgot-password',
      body: {'email': email},
    );
    return '${data['message'] ?? 'Periksa emailmu untuk tautan reset.'}';
  }

  Future<List<Profile>> discover({String? mbti}) async {
    final suffix = mbti == null || mbti.isEmpty ? '' : '?mbti=$mbti';
    final data = await _request('GET', '/api/discover$suffix');
    return (data['profiles'] as List? ?? [])
        .map((item) => Profile.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<Map<String, dynamic>> like(String userId, {bool superLike = false}) =>
      _request('POST', '/api/likes', body: {'targetUserId': userId, 'superLike': superLike});
  Future<List<Map<String, dynamic>>> incomingLikes() async {
    final data = await _request('GET', '/api/likes');
    return (data['likes'] as List? ?? []).map((item) => Map<String, dynamic>.from(item as Map)).toList();
  }
  Future<Profile?> profile() async {
    final data = await _request('GET', '/api/profile');
    final value = data['profile'];
    return value is Map<String, dynamic> ? Profile.fromJson(value) : null;
  }

  Future<Profile> updateProfile(Map<String, dynamic> profile) async {
    final data = await _request('PUT', '/api/profile', body: profile);
    return Profile.fromJson(data['profile'] as Map<String, dynamic>);
  }

  Future<List<SapaNotification>> notifications() async {
    final data = await _request('GET', '/api/notifications');
    return (data['notifications'] as List? ?? [])
        .map((item) => SapaNotification.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<void> markNotification({String? id}) async {
    await _request('PATCH', '/api/notifications', body: id == null ? {'all': true} : {'id': id});
  }
  Future<List<MatchItem>> matches() async {
    final data = await _request('GET', '/api/matches');
    return (data['matches'] as List? ?? [])
        .map((item) => MatchItem.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<ChatMessage>> messages(String conversationId) async {
    final data = await _request(
      'GET',
      '/api/conversations/$conversationId/messages',
    );
    return (data['messages'] as List? ?? [])
        .map((item) => ChatMessage.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<ChatMessage> sendMessage(
    String conversationId,
    String body, {
    String? imageUrl,
  }) async {
    final data = await _request(
      'POST',
      '/api/conversations/$conversationId/messages',
      body: {'body': body, if (imageUrl != null) 'imageUrl': imageUrl},
    );
    return ChatMessage.fromJson(data['message'] as Map<String, dynamic>);
  }

  Future<void> safety({
    required String action,
    required String targetUserId,
    required String matchId,
  }) async => _request(
    'POST',
    '/api/safety',
    body: {
      'action': action,
      'targetUserId': targetUserId,
      'matchId': matchId,
      if (action == 'report') 'reason': 'Perilaku tidak nyaman',
    },
  );

  Future<List<String>> ai(String mode, String context) async {
    final data = await _request(
      'POST',
      '/api/ai',
      body: {'mode': mode, 'context': context},
    );
    return List<String>.from(data['suggestions'] ?? const []);
  }

  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    late http.Response response;
    try {
      response = switch (method) {
        'POST' =>
          await http
              .post(uri, headers: _headers, body: jsonEncode(body ?? {}))
              .timeout(const Duration(seconds: 20)),
        'PUT' =>
          await http
              .put(uri, headers: _headers, body: jsonEncode(body ?? {}))
              .timeout(const Duration(seconds: 20)),
        'PATCH' =>
          await http
              .patch(uri, headers: _headers, body: jsonEncode(body ?? {}))
              .timeout(const Duration(seconds: 20)),
        _ =>
          await http
              .get(uri, headers: _headers)
              .timeout(const Duration(seconds: 20)),
      };
    } catch (_) {
      throw ApiException(
        'Server belum dapat dijangkau. Periksa API_BASE_URL dan koneksi internet.',
      );
    }
    Map<String, dynamic> decoded;
    try {
      decoded = response.body.isEmpty
          ? <String, dynamic>{}
          : jsonDecode(response.body) as Map<String, dynamic>;
    } catch (_) {
      throw ApiException('Server mengirim respons yang tidak valid. Coba lagi.');
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException('${decoded['error'] ?? 'Permintaan belum berhasil.'}');
    }
    return decoded;
  }
}
