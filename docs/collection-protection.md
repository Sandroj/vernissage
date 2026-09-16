# Collection management and public-data protection

## Admin workflow

The `/admin` artwork editor is restricted to email addresses in `ADMIN_EMAILS`
(defaults to `s.regtuijt@gmail.com`). It supports artwork metadata, collection
holder, German title, image upload to R2, image/source rights provenance and
current loans. Each artwork edit records before/after data and the admin email
in `ArtworkEdit`. New image links require a source URL, source name, rights note
and retrieval date. R2 uploads accept JPEG/PNG/WebP up to 25 MB, verify the
file signature, auto-rotate and resize to at most 2400×2400 pixels, and
compress to WebP quality 82 before storing. Unused uploads remain in R2 if the
edit is abandoned.

## Loans

`Artwork.museumId` remains the collection owner/home collection. `Loan` records
the lender (a museum or a named private owner), receiving museum, dates, source
and whether the loan is current. Museum pages show outgoing and incoming loans;
artwork pages show both the host and lender. A curator must add a source URL
that confirms the loan, add dates where available, and close a loan when it ends.

The migration script is `scripts/migrate-admin-loans-to-turso.mjs`. Apply it to
Turso only as part of the reviewed production release; the feature branch does
not mutate the live schema by itself.

## Scraping

Anything rendered for a visitor can be copied, and public R2 image URLs can be
downloaded directly. No browser-side measure can guarantee otherwise. The
public `/api/artworks` endpoint is now capped at 100 rows per request and can be
paged with `offset` and `limit`; this raises the cost of bulk extraction but
does not prevent crawlers from requesting successive pages. Keep public data
limited to information intended for the catalogue; never expose admin APIs,
credentials, private user records or unneeded source dumps.

For stronger friction, put the production hostname behind Cloudflare proxy and
configure WAF/rate-limit rules for repeated requests to `/api/artworks`,
`/api/museums` and high-rate page crawling. Add bot challenges only when
traffic patterns warrant them; make sure ordinary collection browsing and
image delivery still work. This must be configured at the DNS/Cloudflare layer
and cannot be activated by application code alone. A `robots.txt` directive is
only a request to cooperative search engines, not a security boundary.
