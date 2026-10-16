import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.EmptyStackException;
import java.util.regex.Pattern;

public class Test {
    static Object[] slots(ArrayStack<?> s) throws Exception {
        for (Field f : ArrayStack.class.getDeclaredFields()) {
            if (f.getType() == Object[].class) {
                f.setAccessible(true);
                return (Object[]) f.get(s);
            }
        }
        throw new Spec.Failure("ArrayStack doit garder ses éléments dans un champ Object[]");
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("ArrayStack : empile et dépile dans l'ordre", () -> {
            var s = new ArrayStack<String>();
            for (String x : new String[] {"a", "b", "c", "d", "e"}) s.push(x);
            Spec.eq(s.pop(), "e", "premier pop");
            Spec.eq(s.pop(), "d", "second pop");
            Spec.eq(s.size(), 3, "size()");
        });

        Spec.test("ArrayStack : pop sur une pile vide", () -> {
            var s = new ArrayStack<String>();
            Spec.raises(EmptyStackException.class, s::pop, "pop() sur une pile vide");
            Spec.eq(s.size(), 0, "size() après un pop refusé (la taille ne doit pas devenir négative)");
            s.push("x");
            Spec.eq(s.pop(), "x", "la pile reste utilisable après l'échec");
        });

        Spec.test("ArrayStack : un élément dépilé n'est plus retenu", () -> {
            var s = new ArrayStack<byte[]>();
            s.push(new byte[1]);
            s.push(new byte[1_000_000]);
            s.push(new byte[1_000_000]);
            s.pop();
            s.pop();
            Object[] slots = slots(s);
            for (int i = s.size(); i < slots.length; i++) {
                Spec.check(slots[i] == null, "la case " + i + " du tableau référence encore un élément dépilé : "
                        + "le GC ne peut pas le récupérer tant que la pile vit");
            }
        });

        Spec.test("ArrayStack : clear() ne retient rien non plus", () -> {
            var s = new ArrayStack<String>();
            s.push("a");
            s.push("b");
            s.clear();
            Spec.eq(s.size(), 0, "size() après clear()");
            for (Object o : slots(s)) Spec.check(o == null, "clear() laisse des références dans le tableau");
        });

        Spec.test("LruCache : borne la taille", () -> {
            var c = new LruCache<String, Integer>(3);
            for (int i = 0; i < 100; i++) c.put("k" + i, i);
            Spec.eq(c.size(), 3, "taille après 100 insertions dans un cache de 3");
            Spec.check(c.containsKey("k99") && c.containsKey("k98") && c.containsKey("k97"), "les 3 dernières clés doivent rester");
        });

        Spec.test("LruCache : une lecture rafraîchit l'entrée", () -> {
            var c = new LruCache<String, Integer>(2);
            c.put("a", 1);
            c.put("b", 2);
            Spec.eq(c.get("a"), 1, "get(\"a\")");
            c.put("c", 3);
            Spec.check(c.containsKey("a"), "« a » vient d'être lu : c'est « b » le moins récemment utilisé, pas « a »");
            Spec.check(!c.containsKey("b"), "« b » aurait dû être évincé");
        });

        Spec.test("LruCache : capacité invalide", () -> {
            Spec.raises(IllegalArgumentException.class, () -> new LruCache<String, String>(0), "new LruCache(0)");
        });

        Spec.test("RomanNumerals : reconnaît les chiffres romains", () -> {
            for (String ok : new String[] {"I", "IV", "XIV", "XLII", "MMXXVI", "CMXCIX"}) {
                Spec.check(RomanNumerals.isRomanNumeral(ok), ok + " est un chiffre romain valide");
            }
            for (String ko : new String[] {"", "IIII", "IC", "VX", "ABC"}) {
                Spec.check(!RomanNumerals.isRomanNumeral(ko), "\"" + ko + "\" n'est pas un chiffre romain valide");
            }
        });

        Spec.test("RomanNumerals : la regex est compilée une seule fois", () -> {
            boolean found = false;
            for (Field f : RomanNumerals.class.getDeclaredFields()) {
                int m = f.getModifiers();
                if (f.getType() == Pattern.class && Modifier.isStatic(m) && Modifier.isFinal(m)) found = true;
            }
            Spec.check(found, "String.matches recompile la regex à chaque appel : garde un Pattern dans un champ static final");
        });

        Spec.done();
    }
}
