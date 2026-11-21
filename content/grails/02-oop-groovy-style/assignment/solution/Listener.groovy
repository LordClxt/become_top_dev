// Un type SAM : une closure passée là où un Listener est attendu y est convertie automatiquement.
trait Listener {
    abstract void onEvent(Object event)
}
