package main

// Client minimal de l'API Docker Engine, parlé directement sur le socket Unix.
// Six appels suffisent (create, archive, start, wait, logs, delete) : pas besoin du SDK.

import (
	"archive/tar"
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	apiVersion = "v1.44" // Docker 25+
	workdir    = "/work"
	nobody     = 65534
)

type RunResult struct {
	ExitCode   int    `json:"exit_code"`
	Output     string `json:"output"`
	DurationMs int64  `json:"duration_ms"`
	TimedOut   bool   `json:"timed_out"`
	Truncated  bool   `json:"truncated"`
}

// Executor lance un conteneur jetable et rend sa sortie. Interface pour tester le serveur sans Docker.
type Executor interface {
	Run(ctx context.Context, image string, files map[string]string, command string, timeout time.Duration) (RunResult, error)
}

type DockerExecutor struct {
	cfg  Config
	http *http.Client
}

func NewDockerExecutor(cfg Config) *DockerExecutor {
	transport := &http.Transport{
		DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
			return (&net.Dialer{}).DialContext(ctx, "unix", cfg.DockerSocket)
		},
	}
	return &DockerExecutor{cfg: cfg, http: &http.Client{Transport: transport}}
}

func (d *DockerExecutor) Run(
	ctx context.Context, image string, files map[string]string, command string, timeout time.Duration,
) (RunResult, error) {
	id, err := d.create(ctx, image, command)
	if err != nil {
		return RunResult{}, err
	}
	defer func() {
		// Contexte détaché : le conteneur doit disparaître même si la requête a été annulée.
		cleanup, cancel := context.WithTimeout(context.WithoutCancel(ctx), 30*time.Second)
		defer cancel()
		_ = d.call(cleanup, http.MethodDelete, "/containers/"+id+"?force=true", nil, "", nil)
	}()

	archive, err := tarFiles(files)
	if err != nil {
		return RunResult{}, err
	}
	if err := d.call(ctx, http.MethodPut, "/containers/"+id+"/archive?path="+url.QueryEscape(workdir),
		bytes.NewReader(archive), "application/x-tar", nil); err != nil {
		return RunResult{}, err
	}

	start := time.Now()
	if err := d.call(ctx, http.MethodPost, "/containers/"+id+"/start", nil, "", nil); err != nil {
		return RunResult{}, err
	}
	res := RunResult{}
	waitCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	var wait struct{ StatusCode int }
	err = d.call(waitCtx, http.MethodPost, "/containers/"+id+"/wait", nil, "", &wait)
	switch {
	case err == nil:
		res.ExitCode = wait.StatusCode
	case errors.Is(waitCtx.Err(), context.DeadlineExceeded) && ctx.Err() == nil:
		res.TimedOut, res.ExitCode = true, -1
		_ = d.call(ctx, http.MethodPost, "/containers/"+id+"/kill", nil, "", nil)
	default:
		return RunResult{}, err
	}
	res.DurationMs = time.Since(start).Milliseconds()

	res.Output, res.Truncated, err = d.logs(ctx, id)
	return res, err
}

func (d *DockerExecutor) create(ctx context.Context, image, command string) (string, error) {
	body := map[string]any{
		"Image":      image,
		"Cmd":        []string{"sh", "-c", command},
		"WorkingDir": workdir,
		"User":       fmt.Sprintf("%d:%d", nobody, nobody),
		"HostConfig": map[string]any{
			"NetworkMode": "none",
			"Memory":      d.cfg.MemoryBytes,
			"MemorySwap":  d.cfg.MemoryBytes,
			"NanoCpus":    int64(d.cfg.CPUs * 1e9),
			"PidsLimit":   d.cfg.PidsLimit,
			"CapDrop":     []string{"ALL"},
			"SecurityOpt": []string{"no-new-privileges"},
		},
	}
	raw, err := json.Marshal(body)
	if err != nil {
		return "", err
	}
	var out struct{ Id string }
	if err := d.call(ctx, http.MethodPost, "/containers/create", bytes.NewReader(raw), "application/json", &out); err != nil {
		return "", err
	}
	return out.Id, nil
}

// logs lit stdout et stderr dans l'ordre d'écriture, en s'arrêtant à MaxOutputBytes.
func (d *DockerExecutor) logs(ctx context.Context, id string) (string, bool, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		"http://docker/"+apiVersion+"/containers/"+id+"/logs?stdout=1&stderr=1", nil)
	if err != nil {
		return "", false, err
	}
	resp, err := d.http.Do(req)
	if err != nil {
		return "", false, fmt.Errorf("docker logs : %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", false, apiError(resp)
	}

	limit := d.cfg.MaxOutputBytes
	var out bytes.Buffer
	truncated := false
	header := make([]byte, 8)
	// Flux multiplexé : en-tête de 8 octets (type de flux, 3 octets nuls, taille big-endian) puis les données.
	for {
		if _, err := io.ReadFull(resp.Body, header); err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			return "", false, fmt.Errorf("docker logs : %w", err)
		}
		size := int64(binary.BigEndian.Uint32(header[4:]))
		keep := min(size, int64(limit-out.Len()))
		if _, err := io.CopyN(&out, resp.Body, keep); err != nil {
			return "", false, fmt.Errorf("docker logs : %w", err)
		}
		if keep < size {
			truncated = true
			break
		}
	}
	return strings.ToValidUTF8(out.String(), string(utf8.RuneError)), truncated, nil
}

func (d *DockerExecutor) call(ctx context.Context, method, path string, body io.Reader, ctype string, out any) error {
	req, err := http.NewRequestWithContext(ctx, method, "http://docker/"+apiVersion+path, body)
	if err != nil {
		return err
	}
	if ctype != "" {
		req.Header.Set("Content-Type", ctype)
	}
	resp, err := d.http.Do(req)
	if err != nil {
		return fmt.Errorf("docker %s %s : %w", method, path, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 && resp.StatusCode != http.StatusNotModified {
		return apiError(resp)
	}
	if out != nil {
		return json.NewDecoder(resp.Body).Decode(out)
	}
	return nil
}

func apiError(resp *http.Response) error {
	var e struct{ Message string }
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	if json.Unmarshal(raw, &e) != nil || e.Message == "" {
		e.Message = string(raw)
	}
	return fmt.Errorf("docker %s %s : HTTP %d : %s", resp.Request.Method, resp.Request.URL.Path, resp.StatusCode, e.Message)
}

func tarFiles(files map[string]string) ([]byte, error) {
	var buf bytes.Buffer
	tw := tar.NewWriter(&buf)
	for path, content := range files {
		hdr := &tar.Header{Name: path, Mode: 0o644, Size: int64(len(content)), Uid: nobody, Gid: nobody}
		if err := tw.WriteHeader(hdr); err != nil {
			return nil, err
		}
		if _, err := io.WriteString(tw, content); err != nil {
			return nil, err
		}
	}
	if err := tw.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
