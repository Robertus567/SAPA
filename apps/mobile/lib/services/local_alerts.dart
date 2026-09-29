import 'package:flutter/services.dart';
import '../models/profile.dart';

class LocalAlerts {
  LocalAlerts._();
  static const _channel = MethodChannel('sapa/notifications');

  static Future<void> initialize() async {
    try { await _channel.invokeMethod<void>('requestPermission'); } catch (_) { /* in-app inbox still works */ }
  }

  static Future<void> show(SapaNotification item) async {
    final action = item.type == 'like' ? 'menyukai profilmu' : item.type == 'spark' ? 'mengirim spark' : item.type == 'match' ? 'match denganmu!' : 'mengirim pesan baru';
    try {
      await _channel.invokeMethod<void>('show', {
        'id': item.id.hashCode & 0x7fffffff,
        'title': 'SAPA · ${item.actorName}',
        'body': '${item.actorName} $action',
      });
    } catch (_) { /* Android notification permission may be disabled */ }
  }
}
