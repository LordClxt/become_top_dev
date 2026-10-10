package main

// Tests d'intégration : nécessitent Docker et l'image btd-runner-go. Ignorés sinon.

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"
)

const goMod = "module lab\n\ngo 1.23\n"

func dockerExecutor(t *testing.T, maxOutput int) *DockerExecutor {
	t.Helper()
	if testing.Short() {
		t.Skip("mode -short : pas de Docker")
	}
	cfg, err := LoadConfig()
	if err != nil {
		t.Fatal(err)
	}
	cfg.MaxOutputBytes = maxOutput
	d := NewDockerExecutor(cfg)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := d.call(ctx, http.MethodGet, "/images/"+cfg.Images["go"]+"/json", nil, "", nil); err != nil {
		t.Skipf("Docker ou image %s indisponible : %v", cfg.Images["go"], err)
	}
	return d
}

func runGo(t *testing.T, d *DockerExecutor, files map[string]string, command string, timeout time.Duration) RunResult {
	t.Helper()
	res, err := d.Run(context.Background(), d.cfg.Images["go"], files, command, timeout)
	if err != nil {
		t.Fatal(err)
	}
	return res
}

const addTest = "package lab\n\nimport \"testing\"\n\nfunc TestAdd(t *testing.T) {\n\tif Add(1, 2) != 3 {\n\t\tt.Fatal(\"bad\")\n\t}\n}\n"

func TestDockerPassingTests(t *testing.T) {
	d := dockerExecutor(t, 1_000_000)
	res := runGo(t, d, map[string]string{
		"go.mod":      goMod,
		"add.go":      "package lab\n\nfunc Add(a, b int) int { return a + b }\n",
		"add_test.go": addTest,
	}, "go test ./...", 60*time.Second)
	if res.ExitCode != 0 || !strings.Contains(res.Output, "ok") {
		t.Fatalf("exit %d : %s", res.ExitCode, res.Output)
	}
}

func TestDockerFailingTests(t *testing.T) {
	d := dockerExecutor(t, 1_000_000)
	res := runGo(t, d, map[string]string{
		"go.mod":      goMod,
		"add.go":      "package lab\n\nfunc Add(a, b int) int { return a - b }\n",
		"add_test.go": addTest,
	}, "go test ./...", 60*time.Second)
	if res.ExitCode == 0 || !strings.Contains(res.Output, "FAIL") {
		t.Fatalf("exit %d : %s", res.ExitCode, res.Output)
	}
}

func TestDockerNoNetwork(t *testing.T) {
	d := dockerExecutor(t, 1_000_000)
	res := runGo(t, d, map[string]string{
		"go.mod": goMod,
		"main.go": "package main\n\nimport (\"fmt\"; \"net/http\")\n\nfunc main() {\n" +
			"\t_, err := http.Get(\"http://example.com\")\n\tfmt.Println(err != nil)\n}\n",
	}, "go run .", 60*time.Second)
	if !strings.HasSuffix(strings.TrimSpace(res.Output), "true") {
		t.Fatalf("le réseau devrait être coupé : %s", res.Output)
	}
}

func TestDockerTimeoutKillsContainer(t *testing.T) {
	d := dockerExecutor(t, 1_000_000)
	res := runGo(t, d, map[string]string{"go.mod": goMod, "main.go": "package main\n\nfunc main() { for {} }\n"},
		"go run .", 5*time.Second)
	if !res.TimedOut || res.ExitCode != -1 {
		t.Fatalf("timeout attendu : %+v", res)
	}
}

func TestDockerOutputTruncatedAndInterleaved(t *testing.T) {
	d := dockerExecutor(t, 64)
	res := runGo(t, d, nil, "echo out1; sleep 0.2; echo err1 >&2; sleep 0.2; echo out2; yes | head -c 1000", 30*time.Second)
	if !res.Truncated || len(res.Output) != 64 {
		t.Fatalf("sortie tronquée à 64 octets attendue : %d octets, truncated=%v", len(res.Output), res.Truncated)
	}
	if !strings.HasPrefix(res.Output, "out1\nerr1\nout2\n") {
		t.Fatalf("stdout et stderr doivent garder leur ordre : %q", res.Output)
	}
}
