import java.lang.reflect.Field;
import java.lang.reflect.Modifier;

public class Test {
    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("flip : un nouveau Bits, une copie", () -> {
            Bits a = Bits.zeros(1000);
            Words.reset();
            Bits b = a.flip(700);
            Spec.eq(Words.copies(), 1L, "copies pour un flip");
            Spec.check(b.get(700) && !a.get(700), "flip ne doit modifier que le nouveau Bits");
            Spec.eq(b.flip(700).cardinality(), 0, "flip deux fois");
            Spec.raises(IndexOutOfBoundsException.class, () -> a.flip(1000), "flip(1000) sur 1000 bits");
        });

        Spec.test("flipAll : une primitive, une seule copie", () -> {
            Bits a = Bits.zeros(10_000);
            int[] idx = new int[5_000];
            for (int k = 0; k < idx.length; k++) idx[k] = 2 * k;
            Words.reset();
            Bits b = a.flipAll(idx);
            Spec.eq(Words.copies(), 1L, "copies pour flipAll de 5 000 indices");
            Spec.eq(b.cardinality(), 5_000, "cardinalité");
            Spec.check(b.get(9_998) && !b.get(9_999), "bits pairs à 1, impairs à 0");
            Spec.eq(a.cardinality(), 0, "l'original");
            Spec.raises(IndexOutOfBoundsException.class, () -> a.flipAll(1, -1), "flipAll avec un indice négatif");
        });

        Spec.test("Builder : travail en place, une copie au build", () -> {
            Words.reset();
            Bits.Builder b = new Bits.Builder(10_000);
            for (int i = 0; i < 10_000; i += 3) b.flip(i);
            for (int i = 0; i < 10_000; i += 2) b.set(i, false);
            Spec.eq(Words.copies(), 0L, "copies avant build (Builder ne doit pas recopier à chaque étape)");
            Bits bits = b.build();
            Spec.check(Words.copies() <= 1, "au plus une copie pour build(), vu : " + Words.copies());
            Spec.eq(bits.cardinality(), 1_667, "multiples de 3 impairs entre 0 et 9 999");
            Spec.raises(IndexOutOfBoundsException.class, () -> b.set(10_000, true), "set(10 000)");
        });

        Spec.test("toBuilder puis build : au plus deux copies", () -> {
            Bits a = Bits.zeros(4_096).flip(1);
            Words.reset();
            Bits.Builder b = a.toBuilder();
            for (int i = 0; i < 4_096; i++) b.set(i, true);
            Bits c = b.build();
            Spec.check(Words.copies() <= 2, "au plus deux copies, vu : " + Words.copies());
            Spec.eq(c.cardinality(), 4_096, "tout à 1");
            Spec.eq(a.cardinality(), 1, "l'original n'a pas bougé");
        });

        Spec.test("un Bits construit ne change jamais, même si on réutilise le builder", () -> {
            Bits.Builder b = new Bits.Builder(128);
            b.set(5, true);
            Bits first = b.build();
            b.set(6, true).flip(5);
            Bits second = b.build();
            Spec.check(first.get(5) && !first.get(6), "le premier Bits après réutilisation du builder");
            Spec.check(!second.get(5) && second.get(6), "le second Bits");
            Bits.Builder fromFirst = first.toBuilder();
            fromFirst.flip(100);
            Spec.check(!first.get(100), "toBuilder ne doit pas partager le tableau du Bits d'origine");
        });

        Spec.test("structure", () -> {
            for (Field f : Bits.class.getDeclaredFields()) {
                if (Modifier.isStatic(f.getModifiers())) continue;
                Spec.check(Modifier.isPrivate(f.getModifiers()) && Modifier.isFinal(f.getModifiers()),
                        "Bits." + f.getName() + " doit être private final");
            }
            Spec.check(Modifier.isFinal(Bits.class.getModifiers()), "Bits doit rester final");
        });

        Spec.done();
    }
}
