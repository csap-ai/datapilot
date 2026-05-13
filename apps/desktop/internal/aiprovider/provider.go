package aiprovider

import "context"

type Action string

const (
	ActionGenerate  Action = "generate"
	ActionExplain   Action = "explain"
	ActionOptimize  Action = "optimize"
	ActionRepair    Action = "repair"
)

type Request struct {
	Action     Action
	SQL        string
	ErrorMsg   string
	Schema     string
	UserPrompt string
}

type Response struct {
	Content string
}

type Provider interface {
	Complete(ctx context.Context, req Request) (Response, error)
	Name() string
}

type Config struct {
	Provider string `json:"provider"` // "openai" | "ollama" | "custom"
	BaseURL  string `json:"baseUrl"`
	Model    string `json:"model"`
	APIKey   string `json:"apiKey"`
}

func DefaultBaseURL(provider string) string {
	switch provider {
	case "openai":
		return "https://api.openai.com/v1"
	case "ollama":
		return "http://localhost:11434/v1"
	}
	return ""
}

func DefaultModel(provider string) string {
	switch provider {
	case "openai":
		return "gpt-4o-mini"
	case "ollama":
		return "llama3.2"
	}
	return ""
}
