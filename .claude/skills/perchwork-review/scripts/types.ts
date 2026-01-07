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

// Index types (aligned with frontend ReviewIndex)

export interface IndexSummary {
  total_files: number;
  total_fix_plans: number;
  by_priority: { high: number; medium: number; low: number };
  average_code_score?: number;
  average_coverage_score?: number;
}

export interface PriorityCount {
  high: number;
  medium: number;
  low: number;
}

export interface IndexFile {
  path: string;
  fix_plans: number;
  by_priority: PriorityCount;
  code_score?: number;
  coverage_score?: number;
}

export interface IndexJson {
  version: string;
  generated_at: string;
  config: {
    target_dir: string;
    mode: "diff" | "full";
  };
  summary: IndexSummary;
  files: IndexFile[];
}
