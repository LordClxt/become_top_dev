// Package repository est la seule couche qui parle à PostgreSQL.
package repository

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib" // pilote database/sql pour goose
	"github.com/pressly/goose/v3"
)

//go:embed migrations/*.sql
var migrations embed.FS

// DBTX est commun au pool et à une transaction : un repository marche avec l'un ou l'autre.
type DBTX interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// Repos regroupe les repositories liés à une même connexion (pool ou transaction).
type Repos struct {
	Progress *ProgressRepo
	Profile  *ProfileRepo
}

func newRepos(db DBTX) Repos {
	return Repos{Progress: &ProgressRepo{db: db}, Profile: &ProfileRepo{db: db}}
}

type Store struct {
	pool *pgxpool.Pool
}

// NormalizeURL accepte aussi l'ancienne forme SQLAlchemy (postgresql+asyncpg://…).
func NormalizeURL(url string) string {
	if scheme, rest, ok := strings.Cut(url, "://"); ok {
		if base, _, ok := strings.Cut(scheme, "+"); ok {
			return base + "://" + rest
		}
	}
	return url
}

func Open(ctx context.Context, url string) (*Store, error) {
	pool, err := pgxpool.New(ctx, NormalizeURL(url))
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("base injoignable : %w", err)
	}
	return &Store{pool: pool}, nil
}

func (s *Store) Close() { s.pool.Close() }

// Repos renvoie les repositories en autocommit, pour les lectures et les écritures isolées.
func (s *Store) Repos() Repos { return newRepos(s.pool) }

// InTx exécute fn dans une transaction : tout est validé ensemble, ou rien en cas d'erreur.
func (s *Store) InTx(ctx context.Context, fn func(Repos) error) error {
	return pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error { return fn(newRepos(tx)) })
}

// Migrate applique les migrations embarquées (goose).
func Migrate(ctx context.Context, url string) error {
	db, err := sql.Open("pgx", NormalizeURL(url))
	if err != nil {
		return err
	}
	defer db.Close()
	goose.SetBaseFS(migrations)
	goose.SetLogger(goose.NopLogger())
	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}
	return goose.UpContext(ctx, db, "migrations")
}
