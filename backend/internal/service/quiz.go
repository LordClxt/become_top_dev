package service

import (
	"fmt"
	"math"
	"reflect"
	"slices"
	"strconv"
	"strings"

	"btd/backend/internal/content"
)

// ErrUngradable signale une question corrigée à la main (type free).
type ErrUngradable struct{ Type string }

func (e ErrUngradable) Error() string { return e.Type }

// IsCorrect corrige une réponse. answer vient d'un corps JSON (nombres en float64), comme q.Answer.
func IsCorrect(q content.QuizQuestion, answer any) (bool, error) {
	switch q.Type {
	case "single", "order":
		return reflect.DeepEqual(answer, q.Answer), nil
	case "multiple":
		got, ok1 := answer.([]any)
		want, ok2 := q.Answer.([]any)
		if !ok1 || !ok2 {
			return false, nil
		}
		a, b := slices.Clone(got), slices.Clone(want)
		if !sortScalars(a) || !sortScalars(b) {
			return false, nil
		}
		return reflect.DeepEqual(a, b), nil
	case "code-output":
		return normalizeOutput(pyStr(answer)) == normalizeOutput(pyStr(q.Answer)), nil
	}
	return false, ErrUngradable{q.Type}
}

// sortScalars trie des nombres ou des chaînes ; renvoie false pour un mélange impossible à ordonner.
func sortScalars(s []any) bool {
	ok := true
	slices.SortFunc(s, func(x, y any) int {
		switch a := x.(type) {
		case float64:
			if b, isNum := y.(float64); isNum {
				return cmpFloat(a, b)
			}
		case string:
			if b, isStr := y.(string); isStr {
				return strings.Compare(a, b)
			}
		}
		ok = false
		return 0
	})
	return ok
}

func cmpFloat(a, b float64) int {
	switch {
	case a < b:
		return -1
	case a > b:
		return 1
	}
	return 0
}

func normalizeOutput(text string) string {
	text = strings.NewReplacer("\r\n", "\n", "\r", "\n").Replace(strings.TrimSpace(text))
	lines := strings.Split(text, "\n")
	for i, l := range lines {
		lines[i] = strings.TrimRight(l, " \t\v\f")
	}
	return strings.Join(lines, "\n")
}

// pyStr reproduit str() de Python sur une valeur JSON.
func pyStr(v any) string {
	switch t := v.(type) {
	case string:
		return t
	case nil:
		return "None"
	case bool:
		if t {
			return "True"
		}
		return "False"
	case float64:
		if t == math.Trunc(t) && math.Abs(t) < 1e15 {
			return strconv.FormatInt(int64(t), 10)
		}
		return strconv.FormatFloat(t, 'g', -1, 64)
	}
	return fmt.Sprint(v)
}
