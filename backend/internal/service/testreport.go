package service

import (
	"encoding/json"
	"strings"
)

type TestCase struct {
	Name   string `json:"name"`
	Status string `json:"status"` // pass | fail | skip | run
	Output string `json:"output"`
}

type TestReport struct {
	Passed      bool       `json:"passed"`
	Tests       []TestCase `json:"tests"`
	BuildOutput string     `json:"build_output"`
	TimedOut    bool       `json:"timed_out"`
	DurationMs  int64      `json:"duration_ms"`
}

// ParseGoTestJSON transforme la sortie de `go test -json` en rapport lisible par le frontend.
func ParseGoTestJSON(raw string, exitCode int, timedOut bool, durationMs int64) TestReport {
	var order []string
	tests := map[string]*TestCase{}
	var build []string
	for line := range strings.SplitSeq(strings.ReplaceAll(raw, "\r\n", "\n"), "\n") {
		var ev struct {
			Action, Test, Output string
		}
		if err := json.Unmarshal([]byte(line), &ev); err != nil {
			// Ligne qui n'est pas un objet JSON : sortie brute du compilateur ou de go.
			if json.Valid([]byte(line)) || strings.TrimSpace(line) != "" {
				build = append(build, line)
			}
			continue
		}
		if ev.Action == "build-output" {
			build = append(build, strings.TrimRight(ev.Output, "\n"))
			continue
		}
		if ev.Test == "" {
			continue
		}
		c, ok := tests[ev.Test]
		if !ok {
			c = &TestCase{Name: ev.Test, Status: "run"}
			tests[ev.Test] = c
			order = append(order, ev.Test)
		}
		switch {
		case ev.Action == "output":
			if !hasAnyPrefix(ev.Output, "=== RUN", "=== PAUSE", "=== CONT", "--- ") {
				c.Output += ev.Output
			}
		case ev.Action == "pass" || ev.Action == "fail" || ev.Action == "skip":
			c.Status = ev.Action
		}
	}

	// On garde les sous-tests (Parent/Sub) ; seuls les tests en échec gardent leur sortie.
	report := TestReport{Tests: []TestCase{}, TimedOut: timedOut, DurationMs: durationMs}
	passed := exitCode == 0 && !timedOut
	for _, name := range order {
		c := *tests[name]
		if c.Status == "fail" {
			c.Output = strings.TrimSpace(c.Output)
			passed = false
		} else {
			c.Output = ""
		}
		report.Tests = append(report.Tests, c)
	}
	report.Passed = passed
	report.BuildOutput = strings.TrimSpace(strings.Join(build, "\n"))
	return report
}

func hasAnyPrefix(s string, prefixes ...string) bool {
	for _, p := range prefixes {
		if strings.HasPrefix(s, p) {
			return true
		}
	}
	return false
}
