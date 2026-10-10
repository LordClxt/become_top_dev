package lab

import (
	"bytes"
	"errors"
	"strings"
	"testing"
)

const limit = 5_000_000

func run(t *testing.T, program string, input string) []byte {
	t.Helper()
	out, err := Run(program, []byte(input), limit)
	if err != nil {
		t.Fatalf("Run(%.40q…) a échoué : %v", program, err)
	}
	return out
}

func TestHelloWorld(t *testing.T) {
	program := "++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++."
	if got := string(run(t, program, "")); got != "Hello World!\n" {
		t.Errorf("Hello World = %q", got)
	}
}

func TestBasicPrograms(t *testing.T) {
	cases := []struct {
		name, program, input string
		want                 []byte
	}{
		{"écrire A (8*8+1)", "++++++++[>++++++++<-]>+.", "", []byte("A")},
		{"cat", ",[.,]", "abc", []byte("abc")},
		{"inverser l'entrée", ">,[>,]<[.<]", "abc", []byte("cba")},
		{"boucles imbriquées (4*3*2)", "++++[>+++[>++<-]<-]>>.", "", []byte{24}},
		{"commentaires ignorés", "ceci est un commentaire + encore du texte . fin", "", []byte{1}},
		{"boucle ignorée quand la case vaut 0", "[+++.]+.", "", []byte{1}},
		{"lecture après la fin de l'entrée", ",.", "", []byte{0}},
		{"deux lectures", ",.,.", "x", []byte{'x', 0}},
		{"programme vide", "", "", nil},
		{"aucune sortie", "+++", "", nil},
	}
	for _, c := range cases {
		if got := run(t, c.program, c.input); !bytes.Equal(got, c.want) {
			t.Errorf("%s : %q, attendu %q", c.name, got, c.want)
		}
	}
}

func TestCellsWrapAround(t *testing.T) {
	if got := run(t, "-.", ""); !bytes.Equal(got, []byte{255}) {
		t.Errorf("0 - 1 doit faire le tour jusqu'à 255, reçu %v", got)
	}
	if got := run(t, strings.Repeat("+", 256)+".", ""); !bytes.Equal(got, []byte{0}) {
		t.Errorf("256 incréments ramènent à 0, reçu %v", got)
	}
	if got := run(t, strings.Repeat("+", 300)+".", ""); !bytes.Equal(got, []byte{44}) {
		t.Errorf("300 incréments donnent 300 mod 256 = 44, reçu %v", got)
	}
}

func TestUnbalancedBracketsAreRejectedBeforeRunning(t *testing.T) {
	for _, program := range []string{"[", "]", "[]]", "[[]", "+.]", "+.[", "][" } {
		out, err := Run(program, nil, limit)
		if !errors.Is(err, ErrUnbalanced) {
			t.Errorf("Run(%q) : erreur %v, attendu ErrUnbalanced", program, err)
		}
		if len(out) != 0 {
			t.Errorf("Run(%q) a produit %q avant de signaler l'erreur : les crochets se vérifient avant l'exécution", program, out)
		}
	}
}

func TestPointerBounds(t *testing.T) {
	if _, err := Run("<", nil, limit); !errors.Is(err, ErrPointer) {
		t.Errorf("« < » sur la première case : erreur %v, attendu ErrPointer", err)
	}
	if _, err := Run(strings.Repeat(">", TapeSize-1)+"+", nil, limit); err != nil {
		t.Errorf("atteindre la dernière case est permis : %v", err)
	}
	if _, err := Run(strings.Repeat(">", TapeSize), nil, limit); !errors.Is(err, ErrPointer) {
		t.Errorf("dépasser la dernière case : erreur %v, attendu ErrPointer", err)
	}
	out, err := Run("+.<", nil, limit)
	if !errors.Is(err, ErrPointer) || !bytes.Equal(out, []byte{1}) {
		t.Errorf("la sortie produite avant l'erreur doit être renvoyée : (%v, %v)", out, err)
	}
}

func TestStepLimit(t *testing.T) {
	if _, err := Run("+[]", nil, 1000); !errors.Is(err, ErrSteps) {
		t.Errorf("boucle infinie : erreur %v, attendu ErrSteps", err)
	}
	if _, err := Run("+++.", nil, 4); err != nil {
		t.Errorf("4 instructions avec une limite de 4 : erreur %v", err)
	}
	if _, err := Run("+++.", nil, 3); !errors.Is(err, ErrSteps) {
		t.Errorf("4 instructions avec une limite de 3 : erreur %v, attendu ErrSteps", err)
	}
	out, err := Run("+.+.", nil, 3)
	if !errors.Is(err, ErrSteps) || !bytes.Equal(out, []byte{1}) {
		t.Errorf("limite atteinte au milieu : (%v, %v), attendu la sortie partielle [1] et ErrSteps", out, err)
	}
	if _, err := Run("", nil, 0); err != nil {
		t.Errorf("un programme vide ne coûte aucune étape : %v", err)
	}
	if _, err := Run("commentaire sans instruction", nil, 0); err != nil {
		t.Errorf("les commentaires ne comptent pas comme des étapes : %v", err)
	}
	if _, err := Run("+", nil, 0); !errors.Is(err, ErrSteps) {
		t.Errorf("une instruction avec une limite de 0 : erreur %v, attendu ErrSteps", err)
	}
}

func TestStepsCountBracketsToo(t *testing.T) {
	// +[-] : + (1), [ (2), - (3), ] (4) → 4 étapes.
	if _, err := Run("+[-]", nil, 4); err != nil {
		t.Errorf("« +[-] » tient en 4 étapes : %v", err)
	}
	if _, err := Run("+[-]", nil, 3); !errors.Is(err, ErrSteps) {
		t.Errorf("« +[-] » ne tient pas en 3 étapes : %v", err)
	}
}

func TestLongRunningProgram(t *testing.T) {
	// 10 * 10 * 10 itérations imbriquées : exécution plus longue, doit rester rapide.
	out, err := Run("++++++++++[>++++++++++[>++++++++++[>+<-]<-]<-]>>>.", nil, limit)
	if err != nil || !bytes.Equal(out, []byte{232}) { // 1000 mod 256 = 232
		t.Errorf("1000 incréments : (%v, %v), attendu [232]", out, err)
	}
}
