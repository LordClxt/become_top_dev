import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/** Un annuaire de ville. */
public final class Directory {
    private final String city;
    private final List<Contact> contacts = new ArrayList<>();

    public Directory(String city) {
        this.city = Objects.requireNonNull(city);
    }

    public void add(Contact c) { contacts.add(Objects.requireNonNull(c)); }

    public String city() { return city; }

    public int size() { return contacts.size(); }

    // TODO : toString, un résumé « Annuaire Paris (3 contacts) ».
}
