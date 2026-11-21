package app

import grails.gorm.annotation.Entity

@Entity
class Ticket {
    String title
    String status = 'OPEN'
    String assignee
    Integer reopenCount = 0
    Date closedAt

    static constraints = {
        assignee nullable: true
        closedAt nullable: true
    }

    void close() {
        status = 'CLOSED'
        closedAt = new Date()
    }

    void reopen() {
        status = 'OPEN'
        closedAt = null
        reopenCount = reopenCount + 1
    }

    void assign(String agent) {
        assignee = agent
        if (status == 'OPEN') status = 'IN_PROGRESS'
    }

    // TODO : propriété calculée summary, ex. "#12 Imprimante en panne [CLOSED]"
}
