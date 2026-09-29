import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sapa_mobile/models/profile.dart';
import 'package:sapa_mobile/screens/chat_screen.dart';

void main() {
  test('parses quoted message and deletion state from shared API', () {
    final message = ChatMessage.fromJson({
      'id': 'message-2',
      'senderId': 'user-b',
      'body': 'Balasan',
      'createdAt': '2026-09-29T12:00:00.000Z',
      'replyTo': {
        'id': 'message-1',
        'senderId': 'user-a',
        'body': 'Pesan ini telah dihapus',
        'hasImage': false,
        'deletedAt': '2026-09-29T12:01:00.000Z',
      },
    });

    expect(message.replyTo?.id, 'message-1');
    expect(message.replyTo?.deletedAt, isNotNull);
  });

  testWidgets('long press on a quoted bubble opens message actions', (
    tester,
  ) async {
    var held = false;
    const message = ChatMessage(
      id: 'message-2',
      senderId: 'user-a',
      body: 'Balasan',
      createdAt: '2026-09-29T12:00:00.000Z',
      replyTo: ChatReply(
        id: 'message-1',
        senderId: 'user-b',
        body: 'Halo',
        hasImage: false,
      ),
    );
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: MessageBubble(
          message: message,
          mine: true,
          image: '/people/default.svg',
          peerName: 'Bima',
          peerUserId: 'user-b',
          onLongPress: () => held = true,
        ),
      ),
    ));

    expect(find.text('Halo'), findsOneWidget);
    await tester.longPress(find.text('Balasan'));
    expect(held, true);
  });
}
