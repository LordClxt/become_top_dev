## Hint 1
Trois symptômes, trois questions de la leçon. Qui voit un 404 sur une URL inconnue, et un 500 : un intercepteur, ou un filtre ? Quand `postHandle` est-il sauté ? Et que s'est-il déjà passé, pour un `String`, au moment de `postHandle` ?

## Hint 2
L'identifiant de corrélation appartient à un filtre (`OncePerRequestFilter`, bean `@Component`, en tête de chaîne) : en-tête posé **avant** `chain.doFilter`, MDC retiré dans un `finally`. `X-Handler` reste dans l'intercepteur (lui seul connaît le handler), mais dans `preHandle`. `AdminGuard` : `preHandle` qui renvoie `false` après `response.sendError(403)`, enregistré avec `addPathPatterns("/admin/**")`.

## Hint 3
Valide l'identifiant reçu avec `Pattern.compile("[A-Za-z0-9-]{1,64}")`. Le filtre : `@Component @Order(Ordered.HIGHEST_PRECEDENCE)`, puis `response.setHeader("X-Request-Id", id); MDC.put("requestId", id); try { chain.doFilter(request, response); } finally { MDC.remove("requestId"); }`. Retire de l'intercepteur tout ce qui concerne l'identifiant.
