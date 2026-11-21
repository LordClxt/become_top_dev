trait Audited {
    abstract String getAuditName()

    List<String> auditLog = []
    int saveCount = 0

    String save() {
        String result = super.save()          // la chaîne d'abord : on n'audite que ce qui a réussi
        if (result.startsWith('saved')) {
            auditLog << "saved ${auditName}".toString()
            saveCount += 1                   // saveCount++ ne compile pas sur une propriété de trait
        }
        result
    }
}
