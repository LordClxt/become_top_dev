package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
)

// Config est lue depuis les variables d'environnement RUNNER_*.
type Config struct {
	Addr              string
	Token             string
	Images            map[string]string
	MaxConcurrentRuns int
	MemoryBytes       int64
	CPUs              float64
	PidsLimit         int64
	MaxTimeoutS       int
	MaxOutputBytes    int
	DockerSocket      string
}

func LoadConfig() (Config, error) {
	c := Config{
		Addr:              env("RUNNER_ADDR", ":8001"),
		Token:             env("RUNNER_TOKEN", "dev-runner-token"),
		Images:            map[string]string{"go": "btd-runner-go", "groovy": "btd-runner-groovy"},
		MaxConcurrentRuns: 4,
		CPUs:              1.0,
		PidsLimit:         256,
		MaxTimeoutS:       120,
		MaxOutputBytes:    1_000_000,
		DockerSocket:      strings.TrimPrefix(env("DOCKER_HOST", "unix:///var/run/docker.sock"), "unix://"),
	}
	var err error
	if v := os.Getenv("RUNNER_IMAGES"); v != "" {
		if err = json.Unmarshal([]byte(v), &c.Images); err != nil {
			return c, fmt.Errorf("RUNNER_IMAGES : JSON invalide : %w", err)
		}
	}
	if c.MemoryBytes, err = parseBytes(env("RUNNER_MEMORY_LIMIT", "512m")); err != nil {
		return c, fmt.Errorf("RUNNER_MEMORY_LIMIT : %w", err)
	}
	for name, dst := range map[string]any{
		"RUNNER_MAX_CONCURRENT_RUNS": &c.MaxConcurrentRuns,
		"RUNNER_CPUS":                &c.CPUs,
		"RUNNER_PIDS_LIMIT":          &c.PidsLimit,
		"RUNNER_MAX_TIMEOUT_S":       &c.MaxTimeoutS,
		"RUNNER_MAX_OUTPUT_BYTES":    &c.MaxOutputBytes,
	} {
		v := os.Getenv(name)
		if v == "" {
			continue
		}
		switch p := dst.(type) {
		case *int:
			*p, err = strconv.Atoi(v)
		case *int64:
			*p, err = strconv.ParseInt(v, 10, 64)
		case *float64:
			*p, err = strconv.ParseFloat(v, 64)
		}
		if err != nil {
			return c, fmt.Errorf("%s : %w", name, err)
		}
	}
	return c, nil
}

func env(name, fallback string) string {
	if v := os.Getenv(name); v != "" {
		return v
	}
	return fallback
}

// parseBytes lit une taille au format Docker : 512m, 1g, 65536…
func parseBytes(s string) (int64, error) {
	s = strings.ToLower(strings.TrimSpace(s))
	mult := int64(1)
	if n := len(s); n > 0 {
		switch s[n-1] {
		case 'k':
			mult, s = 1<<10, s[:n-1]
		case 'm':
			mult, s = 1<<20, s[:n-1]
		case 'g':
			mult, s = 1<<30, s[:n-1]
		}
	}
	v, err := strconv.ParseInt(s, 10, 64)
	if err != nil || v <= 0 {
		return 0, fmt.Errorf("taille invalide : %q", s)
	}
	return v * mult, nil
}
