# Security Policy

DataPilot is an AI-native database workspace. Security issues may affect database credentials, query execution, AI prompts, audit logs, or local desktop storage.

## Reporting a Vulnerability

Please do not create public issues for security vulnerabilities.

Report privately by opening a GitHub Security Advisory in this repository, or contact the maintainers through the organization security contact when available.

Include:

- Affected version or commit.
- Reproduction steps.
- Impact and affected data.
- Whether credentials, SQL execution, AI requests, or audit logs are involved.

## Security Principles

- Credentials must never be stored in plain SQLite or plain config files.
- AI-generated SQL must not execute automatically.
- Dangerous SQL must be classified and confirmed.
- Logs and diagnostics must redact secrets.
- Security fixes take priority over feature work.
