// Commande btd : API de la plateforme et outils autour du contenu.
//
//	btd [serve]                  migrations puis serveur HTTP
//	btd migrate                  migrations seulement
//	btd validate-content         charge et valide content/
//	btd verify-diagram <lab>     vérifie un exercice diagram (solution passe, starter échoue)
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"
	_ "time/tzdata" // fuseaux IANA embarqués : l'image finale n'en contient pas

	"btd/backend/internal/api"
	"btd/backend/internal/content"
	"btd/backend/internal/repository"
	"btd/backend/internal/service"
)

type config struct {
	addr          string
	databaseURL   string
	contentDir    string
	sessionSecret string
	appPassword   string
	secureCookies bool
	runnerURL     string
	runnerToken   string
}

func loadConfig() config {
	secure, _ := strconv.ParseBool(env("BTD_SECURE_COOKIES", "false"))
	return config{
		addr:          env("BTD_ADDR", ":8000"),
		databaseURL:   env("BTD_DATABASE_URL", "postgres://btd:btd@localhost:5433/btd"),
		contentDir:    env("BTD_CONTENT_DIR", "../content"),
		sessionSecret: env("BTD_SESSION_SECRET", "dev-session-secret-change-me"),
		appPassword:   env("BTD_APP_PASSWORD", "dev"),
		secureCookies: secure,
		runnerURL:     env("BTD_RUNNER_URL", "http://localhost:8001"),
		runnerToken:   env("BTD_RUNNER_TOKEN", "dev-runner-token"),
	}
}

func env(name, fallback string) string {
	if v := os.Getenv(name); v != "" {
		return v
	}
	return fallback
}

func main() {
	cmd := "serve"
	if len(os.Args) > 1 {
		cmd = os.Args[1]
	}
	cfg := loadConfig()
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	var err error
	switch cmd {
	case "serve":
		err = serve(ctx, cfg)
	case "migrate":
		err = repository.Migrate(ctx, cfg.databaseURL)
	case "validate-content":
		var idx *content.Index
		if idx, err = content.Load(cfg.contentDir); err == nil {
			fmt.Printf("✅ contenu chargé : %d cours, %d chapitres, %d leçons, %d exercices\n",
				len(idx.Courses), len(idx.Chapters), len(idx.Lessons), len(idx.Exercises))
		}
	case "verify-diagram":
		if len(os.Args) != 3 {
			fmt.Fprintln(os.Stderr, "usage : btd verify-diagram <dossier_du_lab>")
			os.Exit(2)
		}
		var ok bool
		if ok, err = verifyDiagram(os.Args[2]); err == nil && !ok {
			os.Exit(1)
		}
	default:
		fmt.Fprintf(os.Stderr, "commande inconnue : %s (serve, migrate, validate-content, verify-diagram)\n", cmd)
		os.Exit(2)
	}
	if err != nil {
		slog.Error(cmd, "err", err)
		os.Exit(1)
	}
}

func serve(ctx context.Context, cfg config) error {
	idx, err := content.Load(cfg.contentDir)
	if err != nil {
		return err
	}
	if err := repository.Migrate(ctx, cfg.databaseURL); err != nil {
		return fmt.Errorf("migrations : %w", err)
	}
	store, err := repository.Open(ctx, cfg.databaseURL)
	if err != nil {
		return err
	}
	defer store.Close()

	svc := service.New(idx, store, service.HTTPRunner{URL: cfg.runnerURL, Token: cfg.runnerToken})
	srv := &http.Server{
		Addr: cfg.addr,
		Handler: api.New(svc, api.Config{
			AppPassword: cfg.appPassword, SessionSecret: cfg.sessionSecret, SecureCookies: cfg.secureCookies,
		}),
		ReadHeaderTimeout: 10 * time.Second,
	}
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdown)
	}()
	slog.Info("backend prêt", "addr", cfg.addr, "cours", len(idx.Courses), "exercices", len(idx.Exercises))
	if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

// verifyDiagram affiche le résultat de chaque règle pour la solution et le starter.
func verifyDiagram(dir string) (bool, error) {
	palette, checks, err := content.LoadDiagramLab(dir)
	if err != nil {
		return false, err
	}
	labels := service.PaletteLabels(palette)
	results := map[string]string{}
	for _, side := range []string{"solution", "starter"} {
		report, err := service.VerifyDiagramSide(dir, side, checks, labels)
		if err != nil {
			return false, err
		}
		results[side] = "fail"
		if report.Passed {
			results[side] = "pass"
		}
		fmt.Printf("== %s\n", side)
		for _, tc := range report.Tests {
			mark, detail := "✓", ""
			if tc.Status != "pass" {
				mark = "✗"
			}
			if tc.Output != "" {
				detail = "  — " + tc.Output
			}
			fmt.Printf("  %s %s%s\n", mark, tc.Name, detail)
		}
	}
	fmt.Printf("\nsolution: %s   starter: %s\n", results["solution"], results["starter"])
	return results["solution"] == "pass" && results["starter"] == "fail", nil
}
