import 'package:flutter/material.dart';

class SqlEditor extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode? focusNode;
  final String? hintText;
  final int minLines;
  final int? maxLines;
  final bool enabled;

  const SqlEditor({
    super.key,
    required this.controller,
    this.focusNode,
    this.hintText = 'SELECT * FROM ...',
    this.minLines = 6,
    this.maxLines = 14,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: theme.colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(8),
        color: theme.colorScheme.surfaceContainerLow,
      ),
      child: TextField(
        controller: controller,
        focusNode: focusNode,
        enabled: enabled,
        minLines: minLines,
        maxLines: maxLines,
        keyboardType: TextInputType.multiline,
        textInputAction: TextInputAction.newline,
        style: const TextStyle(fontFamily: 'monospace', fontSize: 13),
        decoration: InputDecoration(
          hintText: hintText,
          hintStyle: TextStyle(
            fontFamily: 'monospace',
            fontSize: 13,
            color: theme.colorScheme.outline,
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.all(12),
        ),
      ),
    );
  }
}
