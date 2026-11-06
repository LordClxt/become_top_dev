import java.util.Arrays;
import java.util.EmptyStackException;

/** La pile du module 1, rendue clonable. */
public class Stack implements Cloneable {
    private Object[] elements = new Object[16];
    private int size;

    public void push(Object e) {
        if (elements.length == size) elements = Arrays.copyOf(elements, 2 * size + 1);
        elements[size++] = e;
    }

    public Object pop() {
        if (size == 0) throw new EmptyStackException();
        Object result = elements[--size];
        elements[size] = null;
        return result;
    }

    public int size() { return size; }

    @Override
    public Stack clone() {
        try {
            return (Stack) super.clone(); // TODO : la copie partage le tableau elements avec l'original
        } catch (CloneNotSupportedException e) {
            throw new AssertionError(e);
        }
    }
}
