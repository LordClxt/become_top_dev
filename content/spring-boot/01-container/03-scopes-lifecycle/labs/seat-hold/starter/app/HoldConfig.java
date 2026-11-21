package app;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class HoldConfig {

    @Bean
    ReleaseLog releaseLog() {
        return new ReleaseLog();
    }

    @Bean
    SeatHold seatHold() {
        return new SeatHold();
    }

    @Bean
    HoldDesk holdDesk(SeatHold seatHold, ReleaseLog releaseLog) {
        return new HoldDesk(seatHold, releaseLog);
    }
}
