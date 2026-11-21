package app

import org.grails.orm.hibernate.HibernateDatastore
import spock.lang.AutoCleanup
import spock.lang.Shared
import spock.lang.Specification

class TicketSpec extends Specification {

    @Shared @AutoCleanup
    HibernateDatastore datastore = new HibernateDatastore(
        ['dataSource.dbCreate': 'create-drop', 'dataSource.url': 'jdbc:h2:mem:helpdesk;DB_CLOSE_DELAY=-1'], Ticket)

    /** Crée un ticket, applique `action` dans une transaction (sans save), puis relit en base. */
    private Ticket afterCommit(Map init = [:], Closure action) {
        Long id
        Ticket.withNewTransaction { id = new Ticket([title: 'Imprimante en panne'] + init).save(flush: true, failOnError: true).id }
        Ticket.withNewTransaction { action(Ticket.get(id)) }
        Ticket reloaded
        Ticket.withNewSession { reloaded = Ticket.get(id) }
        reloaded
    }

    def "close() : le statut CLOSED atteint la base"() {
        when:
        def t = afterCommit { it.close() }

        then:
        t.status == 'CLOSED'
        t.closedAt != null
    }

    def "reopen() : statut, date et compteur atteignent la base"() {
        when:
        def t = afterCommit(status: 'CLOSED', closedAt: new Date()) { it.reopen() }

        then:
        t.status == 'OPEN'
        t.closedAt == null
        t.reopenCount == 1
    }

    def "reopen() deux fois : le compteur vaut 2"() {
        when:
        def t = afterCommit(status: 'CLOSED') { it.reopen(); it.close(); it.reopen() }

        then:
        t.reopenCount == 2
    }

    def "assign() : un ticket ouvert passe IN_PROGRESS"() {
        when:
        def t = afterCommit { it.assign('zoe') }

        then:
        t.assignee == 'zoe'
        t.status == 'IN_PROGRESS'
    }

    def "assign() : un ticket fermé reste fermé"() {
        when:
        def t = afterCommit(status: 'CLOSED') { it.assign('zoe') }

        then:
        t.assignee == 'zoe'
        t.status == 'CLOSED'
    }

    def "summary : calculé à partir de l'id, du titre et du statut"() {
        when:
        def t = afterCommit { it.close() }

        then:
        t.summary == "#${t.id} Imprimante en panne [CLOSED]"
    }

    def "summary : propriété calculée, pas une colonne"() {
        expect:
        Ticket.gormPersistentEntity.getPropertyByName('summary') == null
        Ticket.gormPersistentEntity.persistentPropertyNames.containsAll(['title', 'status', 'assignee', 'reopenCount', 'closedAt'])
    }
}
