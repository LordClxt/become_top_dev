## Hint 1
Deux routes pour le même chemin, distinguées par l'attribut `version` de `@GetMapping`. Et dans `WebConfig`, la méthode `configureApiVersioning(ApiVersionConfigurer)` de `WebMvcConfigurer`.

## Hint 2
Une fois le versionnement activé, une version est **exigée** sur toutes les routes : sans réglage, l'app mobile et `/health` reçoivent 400. Quelle version doit répondre à un client qui n'en demande aucune ?

## Hint 3
`versions.useRequestHeader("API-Version").addSupportedVersions("1", "2").setDefaultVersion("1")`. Pour la dépréciation : `var d = new StandardApiVersionDeprecationHandler(); d.configureVersion("1").setDeprecationDate(ZonedDateTime.parse("2026-12-01T00:00:00Z")).setSunsetDate(ZonedDateTime.parse("2027-06-01T00:00:00Z")).setSunsetLink(URI.create("https://tixa.example/docs/v2"));` puis `versions.setDeprecationHandler(d)`.
