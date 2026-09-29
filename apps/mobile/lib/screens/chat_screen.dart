import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../data/demo_data.dart';
import '../main.dart';
import '../models/profile.dart';
import '../services/api_service.dart';
import '../widgets/profile_image.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key, required this.match});
  final MatchItem match;
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final input = TextEditingController();
  final scroll = ScrollController();
  List<ChatMessage> messages = demoMessages();
  List<String> suggestions = [];
  Timer? timer;
  bool sending = false, aiBusy = false;
  String? imageUrl;

  @override
  void initState() {
    super.initState();
    load();
    if (widget.match.conversationId != 'demo') {
      timer = Timer.periodic(const Duration(seconds: 3), (_) => load());
    }
  }

  @override
  void dispose() {
    timer?.cancel();
    input.dispose();
    scroll.dispose();
    super.dispose();
  }

  Future<void> load() async {
    try {
      final result = await ApiService.instance.messages(
        widget.match.conversationId,
      );
      if (mounted && result.isNotEmpty) {
        setState(() => messages = result);
        _bottom();
      }
    } catch (_) {}
  }

  void _bottom() => WidgetsBinding.instance.addPostFrameCallback((_) {
    if (scroll.hasClients) {
      scroll.animateTo(
        scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOut,
      );
    }
  });

  Future<void> send([String? selected]) async {
    final body = (selected ?? input.text).trim();
    if ((body.isEmpty && imageUrl == null) || sending) return;
    final attachedImage = imageUrl;
    setState(() {
      sending = true;
      input.clear();
      imageUrl = null;
      suggestions = [];
      messages = [
        ...messages,
        ChatMessage(
          id: DateTime.now().microsecondsSinceEpoch.toString(),
          senderId: 'me',
          body: body,
          imageUrl: attachedImage,
          createdAt: DateTime.now().toIso8601String(),
        ),
      ];
    });
    _bottom();
    try {
      await ApiService.instance.sendMessage(
        widget.match.conversationId,
        body,
        imageUrl: attachedImage,
      );
      if (widget.match.conversationId != 'demo') {
        await load();
      }
    } catch (error) {
      if (mounted && widget.match.conversationId != 'demo') {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
    if (mounted) {
      setState(() => sending = false);
    }
  }

  Future<void> pickImage() async {
    try {
      final picked = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        imageQuality: 72,
        maxWidth: 1400,
      );
      if (picked == null) return;
      final bytes = await picked.readAsBytes();
      if (bytes.length > 900000) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Gambar maksimal 900 KB.')),
          );
        }
        return;
      }
      final lower = picked.name.toLowerCase();
      final mime = lower.endsWith('.png')
          ? 'image/png'
          : lower.endsWith('.webp')
          ? 'image/webp'
          : 'image/jpeg';
      if (mounted) {
        setState(() => imageUrl = 'data:$mime;base64,${base64Encode(bytes)}');
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gambar belum dapat dipilih: $error')),
        );
      }
    }
  }

  Future<void> askGemini() async {
    setState(() => aiBusy = true);
    final contextText = messages
        .take(8)
        .map(
          (message) =>
              '${message.senderId == widget.match.userId ? widget.match.fullName : 'Aku'}: ${message.body}',
        )
        .join('\n');
    try {
      suggestions = await ApiService.instance.ai('replies', contextText);
    } catch (_) {
      suggestions = [
        'Wah, ceritain lebih banyak dong!',
        'Aku relate. Kayaknya kita punya selera yang mirip.',
        'Menarik banget! Kamu mulai suka itu sejak kapan?',
      ];
    }
    if (mounted) setState(() => aiBusy = false);
    _bottom();
  }

  Future<void> safety(String action) async {
    final verb = action == 'block'
        ? 'memblokir'
        : action == 'report'
        ? 'melaporkan'
        : 'mengakhiri match dengan';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Jaga ruangmu'),
        content: Text('Yakin ingin $verb ${widget.match.fullName}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Lanjutkan'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    try {
      if (widget.match.id != 'demo-match') {
        await ApiService.instance.safety(
          action: action,
          targetUserId: widget.match.userId,
          matchId: widget.match.id,
        );
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            action == 'report'
                ? 'Laporan diterima. Terima kasih sudah menjaga SAPA.'
                : 'Pilihanmu sudah diterapkan.',
          ),
        ),
      );
      if (action != 'report') Navigator.pop(context);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFFDF9),
      appBar: AppBar(
        backgroundColor: const Color(0xFFFFFDF9),
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          onPressed: () => Navigator.pop(context),
          icon: const Icon(Icons.arrow_back_rounded),
        ),
        titleSpacing: 0,
        title: Row(
          children: [
            Container(
              width: 43,
              height: 43,
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
              ),
              child: ProfileImage(widget.match.photoUrl),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.match.fullName,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                Row(
                  children: [
                    const CircleAvatar(
                      radius: 3,
                      backgroundColor: Color(0xFF59B05C),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      'online · ${widget.match.mbti}',
                      style: const TextStyle(
                        fontSize: 9,
                        color: Color(0xFF778091),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.videocam_outlined),
          ),
          PopupMenuButton<String>(
            onSelected: safety,
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'report', child: Text('Laporkan')),
              PopupMenuItem(value: 'block', child: Text('Blokir')),
              PopupMenuItem(value: 'unmatch', child: Text('Unmatch')),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              controller: scroll,
              padding: const EdgeInsets.fromLTRB(14, 23, 14, 16),
              children: [
                Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const CircleAvatar(
                          radius: 25,
                          backgroundColor: Colors.white,
                          child: ClipOval(
                            child: ProfileImage('assets/people/nara.svg'),
                          ),
                        ),
                        Transform.translate(
                          offset: const Offset(-7, 0),
                          child: CircleAvatar(
                            radius: 25,
                            backgroundColor: Colors.white,
                            child: ClipOval(
                              child: ProfileImage(widget.match.photoUrl),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Icon(
                      Icons.auto_awesome_rounded,
                      size: 16,
                      color: coral,
                    ),
                    const Text(
                      'Kalian match!',
                      style: TextStyle(
                        fontFamily: 'serif',
                        fontWeight: FontWeight.w700,
                        fontSize: 18,
                      ),
                    ),
                    const Text(
                      '94% cocok · mulai percakapan yang tulus',
                      style: TextStyle(color: Color(0xFF9298A4), fontSize: 8),
                    ),
                  ],
                ),
                const SizedBox(height: 26),
                Row(
                  children: [
                    Expanded(child: Divider(color: ink.withValues(alpha: .08))),
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 10),
                      child: Text(
                        'HARI INI',
                        style: TextStyle(
                          color: Color(0xFFA0A5AD),
                          fontSize: 8,
                          letterSpacing: 1.2,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    Expanded(child: Divider(color: ink.withValues(alpha: .08))),
                  ],
                ),
                const SizedBox(height: 12),
                ...messages.map(
                  (message) => MessageBubble(
                    message: message,
                    mine: message.senderId != widget.match.userId,
                    image: widget.match.photoUrl,
                  ),
                ),
                if (suggestions.isNotEmpty)
                  _SuggestionBox(suggestions: suggestions, onSelect: send),
              ],
            ),
          ),
          _Composer(
            input: input,
            aiBusy: aiBusy,
            sending: sending,
            imageUrl: imageUrl,
            onPickImage: pickImage,
            onClearImage: () => setState(() => imageUrl = null),
            onAi: askGemini,
            onSend: send,
          ),
        ],
      ),
    );
  }
}

class _SuggestionBox extends StatelessWidget {
  const _SuggestionBox({required this.suggestions, required this.onSelect});
  final List<String> suggestions;
  final Future<void> Function(String) onSelect;
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(top: 17, left: 28),
    padding: const EdgeInsets.all(11),
    decoration: BoxDecoration(
      color: const Color(0xFFF3EFFF),
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: const Color(0x227157D9)),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Icon(Icons.auto_awesome_rounded, size: 14, color: violet),
            SizedBox(width: 5),
            Text(
              'SARAN GEMINI',
              style: TextStyle(
                color: violet,
                fontSize: 8,
                letterSpacing: 1,
                fontWeight: FontWeight.w900,
              ),
            ),
          ],
        ),
        const SizedBox(height: 7),
        ...suggestions.map(
          (idea) => InkWell(
            onTap: () => onSelect(idea),
            child: Container(
              width: double.infinity,
              margin: const EdgeInsets.only(top: 5),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(11),
              ),
              child: Text(
                idea,
                style: const TextStyle(fontSize: 10, color: ink),
              ),
            ),
          ),
        ),
      ],
    ),
  );
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.input,
    required this.aiBusy,
    required this.sending,
    required this.imageUrl,
    required this.onPickImage,
    required this.onClearImage,
    required this.onAi,
    required this.onSend,
  });
  final TextEditingController input;
  final bool aiBusy, sending;
  final String? imageUrl;
  final Future<void> Function() onPickImage;
  final VoidCallback onClearImage;
  final Future<void> Function() onAi;
  final Future<void> Function([String?]) onSend;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(10, 8, 10, 11),
    decoration: BoxDecoration(
      color: Colors.white,
      border: Border(top: BorderSide(color: ink.withValues(alpha: .08))),
    ),
    child: SafeArea(
      top: false,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (imageUrl != null)
            Align(
              alignment: Alignment.centerLeft,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(13),
                    child: Image.memory(
                      base64Decode(imageUrl!.split(',').last),
                      width: 76,
                      height: 76,
                      fit: BoxFit.cover,
                    ),
                  ),
                  Positioned(
                    right: -8,
                    top: -8,
                    child: IconButton.filled(
                      onPressed: onClearImage,
                      iconSize: 14,
                      constraints: const BoxConstraints.tightFor(
                        width: 27,
                        height: 27,
                      ),
                      padding: EdgeInsets.zero,
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ),
                ],
              ),
            ),
          if (imageUrl != null) const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              IconButton(
                onPressed: onPickImage,
                icon: const Icon(
                  Icons.add_photo_alternate_outlined,
                  color: Color(0xFF737C8F),
                ),
              ),
              Expanded(
                child: TextField(
                  controller: input,
                  minLines: 1,
                  maxLines: 4,
                  textCapitalization: TextCapitalization.sentences,
                  onSubmitted: (_) => onSend(),
                  decoration: const InputDecoration(
                    hintText: 'Tulis pesan yang tulus...',
                    hintStyle: TextStyle(fontSize: 11),
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: 13,
                      vertical: 12,
                    ),
                  ),
                ),
              ),
              IconButton.filledTonal(
                onPressed: aiBusy ? null : onAi,
                tooltip: 'Bantu balas dengan Gemini',
                icon: aiBusy
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(
                        Icons.auto_awesome_rounded,
                        color: violet,
                        size: 18,
                      ),
              ),
              const SizedBox(width: 4),
              IconButton.filled(
                onPressed: sending ? null : onSend,
                style: IconButton.styleFrom(backgroundColor: coral),
                icon: const Icon(
                  Icons.send_rounded,
                  color: Colors.white,
                  size: 18,
                ),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}

class MessageBubble extends StatelessWidget {
  const MessageBubble({
    super.key,
    required this.message,
    required this.mine,
    required this.image,
  });
  final ChatMessage message;
  final bool mine;
  final String image;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(
      mainAxisAlignment: mine ? MainAxisAlignment.end : MainAxisAlignment.start,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        if (!mine) ...[
          Container(
            width: 29,
            height: 29,
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(9)),
            child: ProfileImage(image),
          ),
          const SizedBox(width: 7),
        ],
        Flexible(
          child: Column(
            crossAxisAlignment: mine
                ? CrossAxisAlignment.end
                : CrossAxisAlignment.start,
            children: [
              if (message.imageUrl != null) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: message.imageUrl!.startsWith('data:image/')
                      ? Image.memory(
                          base64Decode(message.imageUrl!.split(',').last),
                          width: 220,
                          fit: BoxFit.cover,
                        )
                      : Image.network(
                          message.imageUrl!,
                          width: 220,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => const SizedBox.shrink(),
                        ),
                ),
                if (message.body.isNotEmpty) const SizedBox(height: 5),
              ],
              if (message.body.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 11,
                  ),
                  decoration: BoxDecoration(
                    color: mine ? ink : const Color(0xFFF0ECE6),
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(17),
                      topRight: const Radius.circular(17),
                      bottomLeft: Radius.circular(mine ? 17 : 5),
                      bottomRight: Radius.circular(mine ? 5 : 17),
                    ),
                  ),
                  child: Text(
                    message.body,
                    style: TextStyle(
                      color: mine ? Colors.white : ink,
                      fontSize: 11,
                      height: 1.4,
                    ),
                  ),
                ),
              const SizedBox(height: 3),
              Text(
                '${_time(message.createdAt)}${mine ? ' · ${message.readAt == null ? 'terkirim' : 'dibaca'}' : ''}',
                style: const TextStyle(color: Color(0xFFA3A7B0), fontSize: 7),
              ),
            ],
          ),
        ),
      ],
    ),
  );

  String _time(String value) {
    final date = DateTime.tryParse(value)?.toLocal() ?? DateTime.now();
    return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}
