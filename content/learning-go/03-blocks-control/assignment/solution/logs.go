package lab

import (
	"maps"
	"slices"
	"strings"
)

// Report résume un journal.
type Report struct {
	Lines        int            // lignes prises en compte : valides ou mal formées, hors lignes vides et commentaires
	Counts       map[string]int // nombre de lignes par niveau canonique : DEBUG, INFO, WARN, ERROR
	ErrorSources []string       // sources distinctes ayant au moins une ligne ERROR, triées
	Malformed    int            // lignes ignorées car illisibles
	Truncated    bool           // vrai si le journal s'est arrêté sur --END--
}

// Analyze lit un journal dont chaque ligne a la forme « NIVEAU SOURCE message… ».
func Analyze(log string) Report {
	report := Report{Counts: map[string]int{}}
	errorSources := map[string]bool{}

loop:
	for _, raw := range strings.Split(log, "\n") {
		line := strings.TrimSpace(raw)
		switch {
		case line == "" || strings.HasPrefix(line, "#"):
			continue
		case line == "--END--":
			report.Truncated = true
			break loop
		}

		report.Lines++
		fields := strings.Fields(line)
		if len(fields) < 2 {
			report.Malformed++
			continue
		}

		var level string
		switch fields[0] {
		case "DEBUG", "INFO":
			level = fields[0]
		case "WARN", "WARNING":
			level = "WARN"
		case "ERROR", "FATAL":
			level = "ERROR"
			errorSources[fields[1]] = true
		default:
			report.Malformed++
			continue
		}
		report.Counts[level]++
	}

	report.ErrorSources = slices.Sorted(maps.Keys(errorSources))
	return report
}
