# Security policy

Report suspected vulnerabilities privately through the repository security
advisory flow. Do not include exploit details in a public issue.

This package validates view metadata and performs no runtime string code
generation. It is not a sandbox: generic storage `get` and `set` methods,
Proxies, and custom Math functions execute consumer code. Treat array storage
and functions supplied by the host environment according to their trust level.
