import 'package:local_auth/local_auth.dart';
import 'package:local_auth/error_codes.dart' as auth_error;
import 'package:flutter/services.dart';

enum AuthResult { success, failure, notAvailable, notEnrolled, lockedOut }

class AuthService {
  static final _auth = LocalAuthentication();

  static Future<bool> isAvailable() async {
    try {
      return await _auth.canCheckBiometrics || await _auth.isDeviceSupported();
    } on PlatformException {
      return false;
    }
  }

  static Future<bool> isEnrolled() async {
    try {
      final biometrics = await _auth.getAvailableBiometrics();
      return biometrics.isNotEmpty;
    } on PlatformException {
      return false;
    }
  }

  static Future<AuthResult> authenticate({String reason = '验证身份以继续'}) async {
    try {
      final supported = await _auth.isDeviceSupported();
      if (!supported) return AuthResult.notAvailable;

      final enrolled = await isEnrolled();
      if (!enrolled) return AuthResult.notEnrolled;

      final ok = await _auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: false, // 允许 PIN 作为回退
        ),
      );
      return ok ? AuthResult.success : AuthResult.failure;
    } on PlatformException catch (e) {
      switch (e.code) {
        case auth_error.notAvailable:
          return AuthResult.notAvailable;
        case auth_error.notEnrolled:
          return AuthResult.notEnrolled;
        case auth_error.lockedOut:
        case auth_error.permanentlyLockedOut:
          return AuthResult.lockedOut;
        default:
          return AuthResult.failure;
      }
    }
  }
}
