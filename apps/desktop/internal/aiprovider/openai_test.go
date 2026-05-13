package aiprovider_test

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/csap-ai/datapilot/apps/desktop/internal/aiprovider"
)

// chatRequest mirrors the minimal shape sent by OpenAIProvider.
type chatRequest struct {
	Model    string `json:"model"`
	Messages []struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	} `json:"messages"`
}

func mockServer(t *testing.T, handler http.HandlerFunc) (url string, captured *chatRequest, authHeader *string) {
	t.Helper()
	captured = &chatRequest{}
	hdr := ""
	authHeader = &hdr
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/chat/completions" {
			t.Errorf("unexpected path %q", r.URL.Path)
		}
		body, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(body, captured)
		*authHeader = r.Header.Get("Authorization")
		handler(w, r)
	}))
	t.Cleanup(srv.Close)
	return srv.URL, captured, authHeader
}

func writeChatOK(w http.ResponseWriter, content string) {
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"` + content + `"}}]}`))
}

func TestCompleteSuccess(t *testing.T) {
	url, captured, authHeader := mockServer(t, func(w http.ResponseWriter, _ *http.Request) {
		writeChatOK(w, "SELECT 1")
	})

	p := aiprovider.New(aiprovider.Config{
		Provider: "openai",
		BaseURL:  url,
		Model:    "gpt-test",
		APIKey:   "sk-test",
	})
	resp, err := p.Complete(context.Background(), aiprovider.Request{
		Action:     aiprovider.ActionGenerate,
		UserPrompt: "list active users",
		Schema:     "users(id, active)",
	})
	if err != nil {
		t.Fatalf("Complete: %v", err)
	}
	if resp.Content != "SELECT 1" {
		t.Fatalf("Content = %q", resp.Content)
	}
	if captured.Model != "gpt-test" {
		t.Fatalf("Model = %q", captured.Model)
	}
	if *authHeader != "Bearer sk-test" {
		t.Fatalf("Authorization = %q", *authHeader)
	}
}

func TestCompleteOmitsAuthHeaderWhenAPIKeyEmpty(t *testing.T) {
	url, _, authHeader := mockServer(t, func(w http.ResponseWriter, _ *http.Request) {
		writeChatOK(w, "x")
	})

	p := aiprovider.New(aiprovider.Config{Provider: "ollama", BaseURL: url, Model: "llama3.2"})
	if _, err := p.Complete(context.Background(), aiprovider.Request{
		Action: aiprovider.ActionExplain, SQL: "SELECT 1",
	}); err != nil {
		t.Fatalf("Complete: %v", err)
	}
	if *authHeader != "" {
		t.Fatalf("expected no Authorization header, got %q", *authHeader)
	}
}

func TestCompletePromptShapeGenerate(t *testing.T) {
	url, captured, _ := mockServer(t, func(w http.ResponseWriter, _ *http.Request) {
		writeChatOK(w, "ok")
	})

	p := aiprovider.New(aiprovider.Config{Provider: "openai", BaseURL: url, Model: "m"})
	_, _ = p.Complete(context.Background(), aiprovider.Request{
		Action:     aiprovider.ActionGenerate,
		UserPrompt: "find users",
		Schema:     "users(id)",
	})
	if len(captured.Messages) != 2 {
		t.Fatalf("expected 2 messages, got %d", len(captured.Messages))
	}
	if captured.Messages[0].Role != "system" {
		t.Fatalf("first message should be system, got %q", captured.Messages[0].Role)
	}
	if !strings.Contains(captured.Messages[1].Content, "find users") {
		t.Fatalf("user message missing prompt: %q", captured.Messages[1].Content)
	}
	if !strings.Contains(captured.Messages[1].Content, "users(id)") {
		t.Fatalf("user message missing schema: %q", captured.Messages[1].Content)
	}
}

func TestCompletePromptShapeRepair(t *testing.T) {
	url, captured, _ := mockServer(t, func(w http.ResponseWriter, _ *http.Request) {
		writeChatOK(w, "fixed")
	})

	p := aiprovider.New(aiprovider.Config{Provider: "openai", BaseURL: url, Model: "m"})
	_, _ = p.Complete(context.Background(), aiprovider.Request{
		Action:   aiprovider.ActionRepair,
		SQL:      "SELEC 1",
		ErrorMsg: "syntax error",
	})
	if !strings.Contains(captured.Messages[1].Content, "SELEC 1") {
		t.Fatalf("user message missing SQL: %q", captured.Messages[1].Content)
	}
	if !strings.Contains(captured.Messages[1].Content, "syntax error") {
		t.Fatalf("user message missing Error: %q", captured.Messages[1].Content)
	}
}

func TestCompleteReturnsErrorWhenAPIErrorField(t *testing.T) {
	url, _, _ := mockServer(t, func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"error":{"message":"invalid api key"}}`))
	})

	p := aiprovider.New(aiprovider.Config{Provider: "openai", BaseURL: url, Model: "m"})
	_, err := p.Complete(context.Background(), aiprovider.Request{
		Action: aiprovider.ActionGenerate, UserPrompt: "x",
	})
	if err == nil {
		t.Fatalf("expected error")
	}
	if !strings.Contains(err.Error(), "invalid api key") {
		t.Fatalf("error should surface upstream message, got %v", err)
	}
}

func TestCompleteReturnsErrorWhenEmptyChoices(t *testing.T) {
	url, _, _ := mockServer(t, func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"choices":[]}`))
	})

	p := aiprovider.New(aiprovider.Config{Provider: "openai", BaseURL: url, Model: "m"})
	_, err := p.Complete(context.Background(), aiprovider.Request{
		Action: aiprovider.ActionGenerate, UserPrompt: "x",
	})
	if err == nil {
		t.Fatalf("expected error on empty choices")
	}
}

func TestCompleteRespectsContextCancellation(t *testing.T) {
	url, _, _ := mockServer(t, func(w http.ResponseWriter, _ *http.Request) {
		writeChatOK(w, "x")
	})
	ctx, cancel := context.WithCancel(context.Background())
	cancel() // cancel before call

	p := aiprovider.New(aiprovider.Config{Provider: "openai", BaseURL: url, Model: "m"})
	_, err := p.Complete(ctx, aiprovider.Request{Action: aiprovider.ActionGenerate, UserPrompt: "x"})
	if err == nil {
		t.Fatalf("expected error on cancelled context")
	}
}

func TestNewTrimsTrailingSlashFromBaseURL(t *testing.T) {
	url, _, _ := mockServer(t, func(w http.ResponseWriter, _ *http.Request) {
		writeChatOK(w, "ok")
	})
	// Pass URL with trailing slash; provider must strip it so path becomes /chat/completions.
	p := aiprovider.New(aiprovider.Config{Provider: "openai", BaseURL: url + "/", Model: "m"})
	if _, err := p.Complete(context.Background(), aiprovider.Request{
		Action: aiprovider.ActionGenerate, UserPrompt: "x",
	}); err != nil {
		t.Fatalf("Complete: %v", err)
	}
}

func TestDefaultBaseURL(t *testing.T) {
	if aiprovider.DefaultBaseURL("openai") != "https://api.openai.com/v1" {
		t.Fatalf("openai default url wrong")
	}
	if aiprovider.DefaultBaseURL("ollama") != "http://localhost:11434/v1" {
		t.Fatalf("ollama default url wrong")
	}
	if aiprovider.DefaultBaseURL("custom") != "" {
		t.Fatalf("custom should return empty")
	}
}

func TestDefaultModel(t *testing.T) {
	if aiprovider.DefaultModel("openai") != "gpt-4o-mini" {
		t.Fatalf("openai default model wrong")
	}
	if aiprovider.DefaultModel("ollama") != "llama3.2" {
		t.Fatalf("ollama default model wrong")
	}
	if aiprovider.DefaultModel("unknown") != "" {
		t.Fatalf("unknown provider should return empty")
	}
}

func TestNameReturnsProvider(t *testing.T) {
	p := aiprovider.New(aiprovider.Config{Provider: "openai", BaseURL: "http://x", Model: "m"})
	if p.Name() != "openai" {
		t.Fatalf("Name() = %q", p.Name())
	}
}
