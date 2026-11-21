package app;

import java.time.Duration;

import org.springframework.stereotype.Service;

/** Utilise la configuration typée. Fourni : ne pas modifier. */
@Service
public class HoldService {
    private final TixaProperties props;

    public HoldService(TixaProperties props) { this.props = props; }

    public Duration holdTimeout() { return props.hold().timeout(); }

    public int maxSeats() { return props.hold().maxSeats(); }
}
