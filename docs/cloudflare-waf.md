# Cloudflare-inrichting

De app bevat een `robots.txt`, maar dat is alleen een verzoek aan bots die zich
eraan houden. Voor echte rate limiting moet het productiehostrecord via de
Cloudflare-proxy lopen.

Maak in Cloudflare onder **Security → WAF → Custom rules** minimaal deze regels:

1. `/api/admin/*`: blokkeren voor bezoekers zonder een geldige applicatiesessie
   (de app controleert dit zelf al; een Cloudflare-regel kan ongewenste scans
   extra vroeg afvangen).
2. `/api/artworks*` en `/api/museums*`: rate limit per IP, bijvoorbeeld 120
   requests per minuut met een challenge of tijdelijke blokkade bij overschrijding.
3. `/artworks/*` en `/artists/*`: rate limit pas bij duidelijk crawlergedrag,
   bijvoorbeeld honderden pagina’s per minuut. Stel dit voorzichtig in zodat
   normaal browsen niet wordt geraakt.

Gebruik **Managed Challenge** als actie voor twijfelgevallen en **Block** alleen
voor herhaald misbruik. Controleer eerst in Security Events welke patronen
werkelijk voorkomen. Een challenge op de publieke R2-afbeeldingen kan de
collectie ontoegankelijk maken en is daarom niet de standaardinstelling.

Voor Resend voeg je in Vercel bij de Production-omgeving toe:

- `RESEND_API_KEY`
- `FEEDBACK_FROM_EMAIL` met een afzender op een in Resend geverifieerd domein
- `FEEDBACK_TO_EMAIL=s.regtuijt@gmail.com`

Na iedere wijziging aan environment variables moet Vercel opnieuw deployen.
