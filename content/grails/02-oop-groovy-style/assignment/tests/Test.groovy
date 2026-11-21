abstract class TicketEvent { Long ticketId }
class TicketOpened extends TicketEvent {}
class TicketClosed extends TicketEvent {}
class TicketAssigned extends TicketEvent { String agent }
class Urgent extends TicketAssigned {}
class Unrelated {}

class Stats {
    List seen = []
    void on(TicketEvent e) { seen << 'générique' }
    void on(TicketClosed e) { seen << 'fermé' }
    void on(TicketAssigned e) { seen << "assigné:${e.agent}" }
}

class OnlyClosed {
    int count = 0
    void on(TicketClosed e) { count += 1 }
}

Spec.test('Listener : un type SAM, une closure y est convertie') {
    Listener l = { e -> }
    assert l instanceof Listener
    assert java.lang.reflect.Modifier.isAbstract(Listener.getMethod('onEvent', Object).modifiers)
}

Spec.test('subscribe : une closure, livrée au bon type') {
    def bus = new EventBus(), got = []
    bus.subscribe(TicketClosed) { e -> got << e.ticketId }
    assert bus.publish(new TicketClosed(ticketId: 3)) == 1
    assert bus.publish(new TicketOpened(ticketId: 4)) == 0
    assert got == [3]
}

Spec.test('subscribe : les sous-classes sont livrées aussi') {
    def bus = new EventBus(), got = []
    bus.subscribe(TicketEvent) { e -> got << e.getClass().simpleName }
    bus.publish(new TicketClosed()); bus.publish(new Urgent()); bus.publish(new Unrelated())
    assert got == ['TicketClosed', 'Urgent']
}

Spec.test('priority : les hautes d\'abord, puis l\'ordre d\'abonnement') {
    def bus = new EventBus(), order = []
    bus.subscribe(TicketEvent) { order << 'a0' }
    bus.subscribe(TicketEvent, priority: 10) { order << 'b10' }
    bus.subscribe(TicketEvent) { order << 'c0' }
    bus.subscribe(priority: 5, TicketEvent) { order << 'd5' }
    bus.publish(new TicketOpened())
    assert order == ['b10', 'd5', 'a0', 'c0']
}

Spec.test('options en texte : priority et once') {
    def bus = new EventBus(), order = []
    bus.subscribe(TicketEvent) { order << 'normal' }
    bus.subscribe(TicketEvent, priority: '7', once: 'true') { order << 'prioritaire-unique' }
    bus.publish(new TicketOpened()); bus.publish(new TicketOpened())
    assert order == ['prioritaire-unique', 'normal', 'normal']
}

Spec.test('once : livré une seule fois') {
    def bus = new EventBus(), n = 0
    bus.subscribe(TicketEvent, once: true) { n += 1 }
    assert bus.publish(new TicketOpened()) == 1
    assert bus.publish(new TicketOpened()) == 0
    assert n == 1
}

Spec.test('clé inconnue : refusée en citant la clé') {
    try {
        new EventBus().subscribe(TicketEvent, priorty: 1) { }
        assert false, 'priorty est une faute de frappe : elle doit être refusée'
    } catch (IllegalArgumentException e) {
        assert e.message.contains('priorty')
    }
}

Spec.test('la Map d\'options de l\'appelant n\'est pas modifiée') {
    def opts = [priority: '3']
    new EventBus().subscribe(opts, TicketEvent) { }
    assert opts == [priority: '3']
}

Spec.test('unsubscribe') {
    def bus = new EventBus(), n = 0
    def s = bus.subscribe(TicketEvent) { n += 1 }
    bus.publish(new TicketOpened())
    bus.unsubscribe(s)
    assert bus.publish(new TicketOpened()) == 0
    assert n == 1
}

Spec.test('une exception d\'un abonné n\'empêche pas les suivants, et elle est consignée') {
    def bus = new EventBus(), got = []
    bus.subscribe(TicketEvent, priority: 1) { throw new IllegalStateException('SMTP en panne') }
    bus.subscribe(TicketEvent) { got << 'stats' }
    def event = new TicketClosed()
    assert bus.publish(event) == 2
    assert got == ['stats']
    assert bus.errors.size() == 1
    assert bus.errors[0].event.is(event)
    assert bus.errors[0].error.message == 'SMTP en panne'
}

Spec.test('subscribeAll : la méthode la plus spécifique, une seule fois') {
    def bus = new EventBus(), stats = new Stats()
    bus.subscribeAll(stats)
    assert bus.publish(new TicketClosed()) == 1
    bus.publish(new TicketOpened())
    bus.publish(new Urgent(agent: 'zoe'))
    assert stats.seen == ['fermé', 'générique', 'assigné:zoe']
}

Spec.test('subscribeAll : un événement non accepté n\'est pas livré') {
    def bus = new EventBus(), h = new OnlyClosed()
    bus.subscribeAll(h)
    assert bus.publish(new TicketOpened()) == 0
    assert bus.publish(new TicketClosed()) == 1
    assert h.count == 1
}

Spec.test('subscribeAll : accepte aussi les options') {
    def bus = new EventBus(), order = []
    bus.subscribe(TicketEvent) { order << 'closure' }
    def stats = new Stats()
    bus.subscribeAll(stats, priority: 9)
    bus.publish(new TicketClosed())
    assert stats.seen == ['fermé']
    assert bus.publish(new TicketClosed()) == 2
}

Spec.done()
