# Changelog

Toutes les versions de Koupi. Ce fichier est mis à jour par `npm run release` à partir des commits (voir `docs/release.md`).

## [0.3.0](https://github.com/CodeShadowing95/koupi/compare/v0.2.0...v0.3.0) (2026-11-01)

### Nouveautés

- **logos:** read tools from the database in the logo script ([c5b0d2d](https://github.com/CodeShadowing95/koupi/commit/c5b0d2d311d385bd96de159914f9b0b4dd6ff4b0))
- **admin:** show tool logos next to tool names ([23160b8](https://github.com/CodeShadowing95/koupi/commit/23160b83a816606f7071823567c178c888675527))
- **admin:** animate dialogs and keep their scrollbar inside ([2f5e661](https://github.com/CodeShadowing95/koupi/commit/2f5e661e29b4abaa51ce6faa812b9eb7de5279b2))
- **admin:** refine inputs and dropdowns to match buttons ([05b2cfb](https://github.com/CodeShadowing95/koupi/commit/05b2cfbf1d6c9f2d578d13fa9982c9c9c1a5e9a7))
- **admin:** add filters, search and initials to categories ([137ea2a](https://github.com/CodeShadowing95/koupi/commit/137ea2a6693c676c37d533770adec01ef32fbaac))
- **admin:** sort from table headers and move page actions to the right ([f4de2c7](https://github.com/CodeShadowing95/koupi/commit/f4de2c7fa98e0bc409f5e8ef578b2a9c02b1d0c8))
- **admin:** sort lists and filter them by initial ([bb9c3c8](https://github.com/CodeShadowing95/koupi/commit/bb9c3c858e62f8afb36c69a050ba1a0b080d24c0))
- **admin:** explain tool priority with an info tooltip ([7010a34](https://github.com/CodeShadowing95/koupi/commit/7010a34d5602d1d646f4738c8df7cea9b8c18b4e))
- **admin:** add search to form dropdowns ([2bc3134](https://github.com/CodeShadowing95/koupi/commit/2bc31340b430cc68f8464a3fcbe932ec0485ed52))
- **admin:** tear the logo coupon open to reveal the dashboard ([d94e0e8](https://github.com/CodeShadowing95/koupi/commit/d94e0e8597eeb1fc08224e91992ae8bbe47fe47c))
- **admin:** redesign the login portal with gsap animations ([0d08209](https://github.com/CodeShadowing95/koupi/commit/0d08209a51252ed87950d8186a303fde603a9b36))

### Corrections

- **home:** slow down the creators marquee ([a74d599](https://github.com/CodeShadowing95/koupi/commit/a74d59995a8f72e12c51e7983cc81eb100f62478))
- **admin:** keep priorities 2 and 4 as plain numbers ([4825cd4](https://github.com/CodeShadowing95/koupi/commit/4825cd4ca7a296e5a6307cd721cb85edff93916e))
- **admin:** keep the stub in place and hide the scrollbar during the tear ([d78e807](https://github.com/CodeShadowing95/koupi/commit/d78e80741c9414525a59a01a5a975fb238a53d26))

## 0.2.0 (2026-11-01)

### Nouveautés

- **admin:** show the daily tip at the top of the dashboard ([5855d3b](https://github.com/CodeShadowing95/koupi/commit/5855d3bc6d65d80d4b147708ca62ad7e23030b8d))
- **admin:** add global search and csv export ([cb19dd5](https://github.com/CodeShadowing95/koupi/commit/cb19dd5dac0a1bfb1cfa614cbcdb5dd8d97c12ee))
- **admin:** manage tools, creators and categories ([a5bf49e](https://github.com/CodeShadowing95/koupi/commit/a5bf49e20f450e811d479e353bfc381d3f337299))
- **admin:** remind to retest verified codes after 30 days ([7e9d842](https://github.com/CodeShadowing95/koupi/commit/7e9d84211abbc523ff5af9099ce7881f7d78ffeb))
- **audience:** add visitor votes and anonymous usage counters ([8cf48ab](https://github.com/CodeShadowing95/koupi/commit/8cf48ab1e264329ed4948ee4074a1a8a57c89976))
- **admin:** create, edit and moderate codes in database ([9fbb860](https://github.com/CodeShadowing95/koupi/commit/9fbb860e012900bff63cef6d5396dfddcc331244))
- **db:** store tools, creators and codes in database ([156acd2](https://github.com/CodeShadowing95/koupi/commit/156acd285778f66f75f4dba5917775e0e81af81a))
- **admin:** redesign dashboard with stats, guide and dark mode ([3570baa](https://github.com/CodeShadowing95/koupi/commit/3570baa3a9ffc2d410d1f3429a8a7ca0ace215ee))
- **admin:** paginate admin lists ([e721451](https://github.com/CodeShadowing95/koupi/commit/e721451858c83e1a694d9c3108c7721ecee28025))
- **admin:** add table view toggle to admin lists ([743bb6d](https://github.com/CodeShadowing95/koupi/commit/743bb6db382963a82626b2b95eea621e5848b05e))
- **avatars:** Add new avatar images and update creator metadata ([a992f56](https://github.com/CodeShadowing95/koupi/commit/a992f560a6beb2db852caff853e1cf946452c8e1))
- **logos:** Add new logo assets and update logo metadata ([7295fb1](https://github.com/CodeShadowing95/koupi/commit/7295fb1b19c92feecbff89f195a9a9519192e9de))
- **creators:** show YouTube profile photos on coupons ([c9a91cf](https://github.com/CodeShadowing95/koupi/commit/c9a91cfc69a05eab2b1d4eabc61d53452f68f345))
- **admin:** load all sourced candidates and badge pending proposals ([5a25fc3](https://github.com/CodeShadowing95/koupi/commit/5a25fc35c7819046dee0e32048cb3bfa31b0f2d4))
- **search:** use a compact field in the search dialog ([8e2439a](https://github.com/CodeShadowing95/koupi/commit/8e2439a266cc72e7e71bc85096b261c6338a0497))
- **search:** open hero search in a centered dialog ([f97c401](https://github.com/CodeShadowing95/koupi/commit/f97c4017b8e1c0d914acb1348883851084cc49ac))
- **hero:** replace popular links with a fourth coupon ([705573c](https://github.com/CodeShadowing95/koupi/commit/705573c6d85260a3cfc3b46809cb965f1d2a9f7a))
- **logos:** add new logos ([1d34bb6](https://github.com/CodeShadowing95/koupi/commit/1d34bb682d7475409ec011329e629c5457a44212))
- **hero:** show tools that have a real logo first ([1af1571](https://github.com/CodeShadowing95/koupi/commit/1af15718809e2cd4d9fd741ca575ed5717d52493))
- **logos:** fetch tool logos from Logo.dev when a key is set ([9600d76](https://github.com/CodeShadowing95/koupi/commit/9600d760eef3ad19abf691dd5861e192ffae6325))
- **site:** show tool logos in a rotating seal on coupons ([51aabb8](https://github.com/CodeShadowing95/koupi/commit/51aabb82efc618638e1eb0d6f37702665b6d025f))
- **admin:** compact back-office with its own navigation and card search ([3bc1142](https://github.com/CodeShadowing95/koupi/commit/3bc1142236a300161f6ed78c17ede895ca4eff5e))
- **site:** redesign the public site with tear-off coupons and GSAP ([fe45f84](https://github.com/CodeShadowing95/koupi/commit/fe45f843849d686587ca712a74df6f18f3934b1c))
- **security:** add Cloudflare Turnstile to the proposal form ([a111098](https://github.com/CodeShadowing95/koupi/commit/a111098100a21f6e8204202ce6e9fdff7cdddb8a))
- **security:** rate limit admin login and code proposals ([55fcdb7](https://github.com/CodeShadowing95/koupi/commit/55fcdb73edc26acf45759096e2846d98279be1c5))
- **db:** replace Supabase with Neon using Drizzle ([c23980e](https://github.com/CodeShadowing95/koupi/commit/c23980e163d1fe4599a17c263307d1738f6f02fb))

### Corrections

- **release:** honour options passed without the lone -- separator ([2ad3e8f](https://github.com/CodeShadowing95/koupi/commit/2ad3e8fc8eab7a103f7c6eccbe96ba22ee351cbd))
- update subtitle text to remove unnecessary phrasing ([f6b78a4](https://github.com/CodeShadowing95/koupi/commit/f6b78a4d2bc2d942d7925ab59cfec612438de9e2))
- **scripts:** run catalog and avatars scripts on Windows ([526eef8](https://github.com/CodeShadowing95/koupi/commit/526eef8e9a261f64b74d485030cbff7cb80c745a))
- **logos:** read tools from the generated catalog ([d750e3b](https://github.com/CodeShadowing95/koupi/commit/d750e3bf360c4b414ecc772636d9c200edd54e30))
- **search:** hide the scrollbar in the search dialog list ([6aed102](https://github.com/CodeShadowing95/koupi/commit/6aed1029cc98bb222d2792ecf419f012d818bea1))
- **search:** keep suggestions above popular links and drop inner focus ring ([1aee81b](https://github.com/CodeShadowing95/koupi/commit/1aee81b7ab0944f333b5a56cc684bc4c8e7575ea))
- **admin:** keep the footer at the bottom of short pages ([8693e9b](https://github.com/CodeShadowing95/koupi/commit/8693e9b8eba34c9840b503b616a28b752c9b422b))
- Add unique key prop to MiniCoupon comp and use index for marquee items ([5780e00](https://github.com/CodeShadowing95/koupi/commit/5780e00daf051add1c96ac7686e2103e3bd3ce05))
- **site:** show the first rotating tool name on page load ([2b0cbb0](https://github.com/CodeShadowing95/koupi/commit/2b0cbb04c0fda89593d989e9313a770a63410676))
- **security:** add security headers and harden API input handling ([99515df](https://github.com/CodeShadowing95/koupi/commit/99515dfc68760da41d0c0f729df1c68722c04e59))
- Ignore .next ([98448d9](https://github.com/CodeShadowing95/koupi/commit/98448d94491c1cfcb9c277e9ac4a30f532c97d22))
- **admin:** sign the admin session cookie with SESSION_SECRET ([c02e3ab](https://github.com/CodeShadowing95/koupi/commit/c02e3ab2ada68b591570a39b5027073a4b4c1393))
