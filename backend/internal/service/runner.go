package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type RunResult struct {
	ExitCode   int    `json:"exit_code"`
	Output     string `json:"output"`
	DurationMs int64  `json:"duration_ms"`
	TimedOut   bool   `json:"timed_out"`
}

// Runner exécute du code dans le service runner (seul composant autorisé à parler à Docker).
type Runner interface {
	Run(ctx context.Context, language string, files map[string]string, command string, timeoutS int) (RunResult, error)
}

type HTTPRunner struct {
	URL   string
	Token string
}

func (r HTTPRunner) Run(ctx context.Context, language string, files map[string]string, command string, timeoutS int) (RunResult, error) {
	body, err := json.Marshal(map[string]any{
		"language": language, "files": files, "command": command, "timeout_s": timeoutS,
	})
	if err != nil {
		return RunResult{}, err
	}
	ctx, cancel := context.WithTimeout(ctx, time.Duration(timeoutS+30)*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, r.URL+"/run", bytes.NewReader(body))
	if err != nil {
		return RunResult{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+r.Token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return RunResult{}, unavailable("runner injoignable : %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		text, _ := io.ReadAll(io.LimitReader(resp.Body, 200))
		return RunResult{}, unavailable("runner : HTTP %d %s", resp.StatusCode, text)
	}
	var res RunResult
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return RunResult{}, unavailable("runner : réponse illisible : %v", err)
	}
	return res, nil
}

func unavailable(format string, args ...any) error {
	return &Error{Kind: Unavailable, Detail: fmt.Sprintf(format, args...)}
}
