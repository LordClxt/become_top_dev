"""Tests d'intégration : nécessitent Docker et l'image btd-runner-go."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
AUTH = {"Authorization": "Bearer dev-runner-token"}
GO_MOD = "module lab\n\ngo 1.23\n"


def run(files, command="go test ./...", timeout_s=60):
    return client.post(
        "/run",
        json={"language": "go", "files": files, "command": command, "timeout_s": timeout_s},
        headers=AUTH,
    )


def test_rejects_missing_token():
    r = client.post("/run", json={"language": "go", "files": {}, "command": "true", "timeout_s": 1})
    assert r.status_code == 401


def test_rejects_path_traversal():
    r = run({"../evil.go": "x"})
    assert r.status_code == 422


def test_passing_tests():
    files = {
        "go.mod": GO_MOD,
        "add.go": "package lab\n\nfunc Add(a, b int) int { return a + b }\n",
        "add_test.go": 'package lab\n\nimport "testing"\n\nfunc TestAdd(t *testing.T) {\n'
        '\tif Add(1, 2) != 3 {\n\t\tt.Fatal("bad")\n\t}\n}\n',
    }
    body = run(files).json()
    assert body["exit_code"] == 0, body["output"]
    assert "ok" in body["output"]


def test_failing_tests():
    files = {
        "go.mod": GO_MOD,
        "add.go": "package lab\n\nfunc Add(a, b int) int { return a - b }\n",
        "add_test.go": 'package lab\n\nimport "testing"\n\nfunc TestAdd(t *testing.T) {\n'
        '\tif Add(1, 2) != 3 {\n\t\tt.Fatal("bad")\n\t}\n}\n',
    }
    body = run(files).json()
    assert body["exit_code"] != 0
    assert "FAIL" in body["output"]


def test_no_network():
    files = {
        "go.mod": GO_MOD,
        "main.go": 'package main\n\nimport ("fmt"; "net/http")\n\nfunc main() {\n'
        '\t_, err := http.Get("http://example.com")\n\tfmt.Println(err != nil)\n}\n',
    }
    body = run(files, command="go run .").json()
    assert body["output"].strip().endswith("true"), body["output"]


def test_timeout_kills_container():
    files = {"go.mod": GO_MOD, "main.go": "package main\n\nfunc main() { for {} }\n"}
    body = run(files, command="go run .", timeout_s=5).json()
    assert body["timed_out"] is True
