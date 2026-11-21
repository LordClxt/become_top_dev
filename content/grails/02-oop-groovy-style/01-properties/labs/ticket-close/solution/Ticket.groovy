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

    // Dans le corps de la classe, `status = …` écrirait le champ sans passer par le setter :
    // GORM ne verrait pas la modification (il la détecte dans les setters, via markDirty).
    void close() {
        setStatus('CLOSED')
        setClosedAt(new Date())
    }

    void reopen() {
        setStatus('OPEN')
        setClosedAt(null)
        setReopenCount(reopenCount + 1)
    }

    void assign(String agent) {
        setAssignee(agent)
        if (status == 'OPEN') setStatus('IN_PROGRESS')   // lire le champ est sans danger
    }

    // Getter sans setter : propriété calculée, pas une colonne.
    String getSummary() {
        "#$id $title [$status]"
    }
}
