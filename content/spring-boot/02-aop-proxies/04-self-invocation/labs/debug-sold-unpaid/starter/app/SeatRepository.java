package app;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** Les places vendues, en base. */
@Component
public class SeatRepository {
    private final JdbcClient db;

    public SeatRepository(JdbcClient db) {
        this.db = db;
        db.sql("create table if not exists sold_seat (event_id varchar(40), seat int)").update();
    }

    public void sell(String eventId, int seat) {
        db.sql("insert into sold_seat (event_id, seat) values (?, ?)").params(eventId, seat).update();
    }

    public int soldCount(String eventId) {
        return db.sql("select count(*) from sold_seat where event_id = ?").param(eventId).query(Integer.class).single();
    }
}
