import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class ProfileImage extends StatelessWidget {
  const ProfileImage(this.source, {super.key, this.fit = BoxFit.cover});
  final String source;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    if (source.startsWith('data:image')) {
      return Image.memory(
        base64Decode(source.split(',').last),
        fit: fit,
        gaplessPlayback: true,
      );
    }
    if (source.startsWith('/people/')) {
      return SvgPicture.asset('assets$source', fit: fit);
    }
    if (source.startsWith('assets/')) {
      return SvgPicture.asset(source, fit: fit);
    }
    return Image.network(
      source,
      fit: fit,
      errorBuilder: (_, __, ___) =>
          SvgPicture.asset('assets/people/nara.svg', fit: fit),
    );
  }
}
