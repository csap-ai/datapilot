package aiprovider

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type OpenAIProvider struct {
	cfg    Config
	client *http.Client
}

func New(cfg Config) *OpenAIProvider {
	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = DefaultBaseURL(cfg.Provider)
	}
	cfg.BaseURL = strings.TrimRight(baseURL, "/")
	return &OpenAIProvider{
		cfg:    cfg,
		client: &http.Client{Timeout: 90 * time.Second},
	}
}

func (p *OpenAIProvider) Name() string { return p.cfg.Provider }

type chatMsg struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatReq struct {
	Model     string    `json:"model"`
	Messages  []chatMsg `json:"messages"`
	MaxTokens int       `json:"max_tokens,omitempty"`
}

type chatResp struct {
	Choices []struct {
		Message chatMsg `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (p *OpenAIProvider) Complete(ctx context.Context, req Request) (Response, error) {
	system, user := buildPrompt(req)

	body := chatReq{
		Model: p.cfg.Model,
		Messages: []chatMsg{
			{Role: "system", Content: system},
			{Role: "user", Content: user},
		},
		MaxTokens: 2048,
	}

	data, err := json.Marshal(body)
	if err != nil {
		return Response{}, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		p.cfg.BaseURL+"/chat/completions", bytes.NewReader(data))
	if err != nil {
		return Response{}, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if p.cfg.APIKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+p.cfg.APIKey)
	}

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return Response{}, err
	}
	defer resp.Body.Close()

	var cr chatResp
	if err := json.NewDecoder(resp.Body).Decode(&cr); err != nil {
		return Response{}, fmt.Errorf("decode response: %w", err)
	}
	if cr.Error != nil {
		return Response{}, fmt.Errorf("AI error: %s", cr.Error.Message)
	}
	if len(cr.Choices) == 0 {
		return Response{}, fmt.Errorf("empty response from AI provider")
	}

	return Response{Content: strings.TrimSpace(cr.Choices[0].Message.Content)}, nil
}

func buildPrompt(req Request) (system, user string) {
	switch req.Action {
	case ActionGenerate:
		system = "You are an expert SQL assistant. Generate a valid SQL query based on the user's request and the provided database schema. Return ONLY the SQL query, no explanation, no markdown code fences."
		user = req.UserPrompt
		if req.Schema != "" {
			user = "Database schema:\n" + req.Schema + "\n\nRequest: " + req.UserPrompt
		}
	case ActionExplain:
		system = "You are an expert SQL assistant. Explain the following SQL query clearly and concisely. Describe what it does, which tables it accesses, and any potential issues. Respond in the same language the user is likely using."
		user = "SQL:\n" + req.SQL
		if req.Schema != "" {
			user += "\n\nDatabase schema:\n" + req.Schema
		}
	case ActionOptimize:
		system = "You are an expert SQL performance tuning assistant. Optimize the given SQL for better performance. Return the optimized SQL first (no markdown fences), then a brief explanation of the changes separated by a blank line."
		user = "SQL:\n" + req.SQL
		if req.Schema != "" {
			user += "\n\nDatabase schema:\n" + req.Schema
		}
	case ActionRepair:
		system = "You are an expert SQL assistant. Fix the SQL query that produced an error. Return ONLY the corrected SQL, no explanation, no markdown code fences."
		user = "SQL:\n" + req.SQL + "\n\nError:\n" + req.ErrorMsg
	default:
		system = "You are an expert SQL assistant."
		user = req.UserPrompt
	}
	return
}
