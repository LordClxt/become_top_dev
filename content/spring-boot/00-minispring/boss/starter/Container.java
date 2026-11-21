import java.util.List;

public class Container implements AutoCloseable {

    public Container register(Class<?>... types) {
        throw new UnsupportedOperationException("register");
    }

    public Container refresh() {
        throw new UnsupportedOperationException("refresh");
    }

    public Object getBean(String name) {
        throw new UnsupportedOperationException("getBean");
    }

    public List<String> warnings() {
        throw new UnsupportedOperationException("warnings");
    }

    @Override
    public void close() {
        throw new UnsupportedOperationException("close");
    }
}
