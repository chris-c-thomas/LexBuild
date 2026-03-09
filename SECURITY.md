# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | Yes       |

Only the latest release receives security fixes. We recommend always using the most recent version.

## Reporting a Vulnerability

If you discover a security vulnerability in LexBuild, please report it responsibly:

1. **Do not** open a public GitHub issue for security vulnerabilities.
2. Email **security@lexbuild.dev** or use [GitHub Security Advisories](https://github.com/chris-c-thomas/LexBuild/security/advisories/new) to report the issue privately.
3. Include a description of the vulnerability, steps to reproduce, and any relevant details about your environment.

We will acknowledge receipt within 48 hours and aim to provide an initial assessment within 7 days.

## Scope

LexBuild is a command-line tool that:

- Downloads XML files from the OLRC website over HTTPS
- Parses XML using a SAX streaming parser
- Writes Markdown files to the local filesystem

The primary attack surface is **maliciously crafted XML input**. If you discover that a crafted XML file can cause any of the following, it is a valid security report:

- Arbitrary code execution
- File system access outside the specified output directory (path traversal)
- Denial of service through memory exhaustion or infinite loops beyond what is expected for the input size
- Information disclosure

Issues related to the content of U.S. Code XML (which is public domain data from a government source) are not security vulnerabilities.

## Dependencies

We monitor dependencies for known vulnerabilities via GitHub Dependabot. If you notice a vulnerable dependency, feel free to open a regular GitHub issue.
