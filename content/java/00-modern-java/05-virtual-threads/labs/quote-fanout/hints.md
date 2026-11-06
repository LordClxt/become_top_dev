## Hint 1
`try (var executor = Executors.newVirtualThreadPerTaskExecutor()) { … }` : un thread virtuel par tâche soumise, et la fermeture attend la fin de toutes les tâches. Soumets un `Callable` par symbole et garde les `Future` dans l'ordre des symboles.

## Hint 2
Une `ScopedValue` n'est pas transmise aux threads d'un executor : dans chaque tâche, relie-la avec `ScopedValue.where(REQUEST_ID, requestId).call(() -> provider.quote(symbol))`. Pour la limite, un `Semaphore(maxConcurrent)` : `acquire()` avant l'appel, `release()` dans un `finally`.

## Hint 3
Parcours les `Future` dans l'ordre et remplis une `LinkedHashMap`. `future.get()` lève `ExecutionException` : relance `new QuoteException(symbol, e.getCause())`. Si `InterruptedException` arrive, rétablis l'état (`Thread.currentThread().interrupt()`) avant de lever une `QuoteException`.
