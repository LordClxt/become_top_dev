package app;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** Les écritures comptables, en base H2. Fourni : ne pas modifier. */
@Component
public class Ledger {
    private final JdbcClient db;

    public Ledger(JdbcClient db) {
        this.db = db;
        db.sql("create table if not exists entry (label varchar(60), cents int)").update();
    }

    public void write(String label, int cents) {
        db.sql("insert into entry (label, cents) values (?, ?)").params(label, cents).update();
    }

    public int count() {
        return db.sql("select count(*) from entry").query(Integer.class).single();
    }
}
