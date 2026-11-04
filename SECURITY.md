# Security Policy

## Reporting a problem

Email **diegoarivada@gmail.com** with the steps to reproduce it. You can also use GitHub's private vulnerability reporting on this repository. Please don't open a public issue for a security problem.

This is a personal site, so there's no bug bounty, but I read every report and will reply.

## In scope

- The pages and scripts in this repository, served at https://diegoarivada.dev
- The UltroBot status Worker in `worker/`

## Known limits

GitHub Pages can't send response headers, so clickjacking protection (`frame-ancestors`), `X-Content-Type-Options`, `Permissions-Policy`, and CSP violation reports aren't possible here. These are listed on the security page and aren't treated as vulnerabilities.
