// Package testdb prépare une base PostgreSQL vide pour les tests (btd_go_test sur le Postgres de dev).
package testdb

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5"

	"btd/backend/internal/repository"
)

// URL renvoie la base de test : BTD_TEST_DATABASE_URL, sinon btd_go_test sur le port 5433.
func URL() string {
	if u := os.Getenv("BTD_TEST_DATABASE_URL"); u != "" {
		return u
	}
	return "postgres://btd:btd@localhost:5433/btd_go_test"
}

// Fresh crée la base si besoin, la vide, applique les migrations et ouvre un Store.
func Fresh(t *testing.T) *repository.Store {
	t.Helper()
	ctx := context.Background()
	url := URL()
	cfg, err := pgx.ParseConfig(url)
	if err != nil {
		t.Fatal(err)
	}
	name := cfg.Database

	admin := cfg.Copy()
	admin.Database = "postgres"
	conn, err := pgx.ConnectConfig(ctx, admin)
	if err != nil {
		t.Fatalf("Postgres de test injoignable (make dev le démarre sur le port 5433) : %v", err)
	}
	var exists bool
	if err := conn.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1)`, name).Scan(&exists); err != nil {
		t.Fatal(err)
	}
	if !exists {
		if _, err := conn.Exec(ctx, "CREATE DATABASE "+pgx.Identifier{name}.Sanitize()); err != nil {
			t.Fatal(err)
		}
	}
	conn.Close(ctx)

	db, err := pgx.Connect(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `DROP SCHEMA public CASCADE; CREATE SCHEMA public`); err != nil {
		t.Fatal(err)
	}
	db.Close(ctx)

	if err := repository.Migrate(ctx, url); err != nil {
		t.Fatal(err)
	}
	store, err := repository.Open(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(store.Close)
	return store
}
