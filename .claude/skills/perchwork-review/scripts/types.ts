// Review file types

export interface FixPlan {
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  prompt: string;
  agent: string;
}

export interface TypeDesignScores {
  encapsulation: number;
  invariant: number;
  usefulness: number;
  enforcement: number;
}

export interface AgentResult {
  status: string;
  // comment-analyzer
  issues?: { line: number; confidence: string; message: string }[];
  // pr-test-analyzer
  coverage_score?: number;
  gaps?: { item: string; description: string }[];
  // silent-failure-hunter
  findings?: { line: number; severity: string; message: string }[];
  // type-design-analyzer
  scores?: TypeDesignScores;
  recommendations?: string[];
  // code-reviewer
  score?: number;
  // code-simplifier
  suggestions?: { line_start: number; line_end: number; description: string; improvement: string }[];
}

export interface ReviewFile {
  path: string;
  agents: Record<string, AgentResult>;
  fix_plans: FixPlan[];
}

// Index types

export interface IndexAgentScores {
  "comment-analyzer": { issues: number };
  "pr-test-analyzer": { coverage_score: number };
  "silent-failure-hunter": { findings: number; by_severity: { critical: number; high: number; medium: number } };
  "type-design-analyzer": TypeDesignScores;
  "code-reviewer": { score: number };
  "code-simplifier": { suggestions: number };
}

export interface IndexFile {
  path: string;
  fix_plans: { total: number; high: number; medium: number; low: number };
  agents: IndexAgentScores;
}

export interface IndexSummary {
  total_files: number;
  total_fix_plans: number;
  by_priority: { high: number; medium: number; low: number };
  avg_scores: {
    "pr-test-analyzer": number;
    "code-reviewer": number;
    "type-design-analyzer": TypeDesignScores;
  };
}

export interface IndexJson {
  summary: IndexSummary;
  files: IndexFile[];
}
