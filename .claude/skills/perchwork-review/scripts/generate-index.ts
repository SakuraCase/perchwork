/**
 * Generate index.json from existing review JSON files
 *
 * Usage:
 *   node dist/generate-index.js <review-dir>
 *
 * Example:
 *   node dist/generate-index.js ./public/data/review
 */

import * as fs from "fs";
import * as path from "path";
import type {
  ReviewFile,
  IndexJson,
  IndexFile,
  IndexSummary,
  IndexAgentScores,
  TypeDesignScores,
} from "./types.js";

function parseArgs(): string {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: generate-index.ts <review-dir>");
    process.exit(1);
  }

  return args[0];
}

function findJsonFiles(dir: string): string[] {
  const results: string[] = [];

  function walk(currentDir: string) {
    if (!fs.existsSync(currentDir)) {
      return;
    }

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".json") && entry.name !== "index.json") {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

function loadReviewFile(filePath: string): ReviewFile | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as ReviewFile;
  } catch (error) {
    console.error(`Failed to load ${filePath}:`, error);
    return null;
  }
}

function extractAgentScores(review: ReviewFile): IndexAgentScores {
  const agents = review.agents;

  const commentAnalyzer = agents["comment-analyzer"];
  const prTestAnalyzer = agents["pr-test-analyzer"];
  const silentFailureHunter = agents["silent-failure-hunter"];
  const typeDesignAnalyzer = agents["type-design-analyzer"];
  const codeReviewer = agents["code-reviewer"];
  const codeSimplifier = agents["code-simplifier"];

  // Count silent-failure-hunter findings by severity
  const findings = silentFailureHunter?.findings ?? [];
  const bySeverity = { critical: 0, high: 0, medium: 0 };
  for (const f of findings) {
    const sev = f.severity.toLowerCase() as keyof typeof bySeverity;
    if (sev in bySeverity) {
      bySeverity[sev]++;
    }
  }

  return {
    "comment-analyzer": {
      issues: commentAnalyzer?.issues?.length ?? 0,
    },
    "pr-test-analyzer": {
      coverage_score: prTestAnalyzer?.coverage_score ?? 0,
    },
    "silent-failure-hunter": {
      findings: findings.length,
      by_severity: bySeverity,
    },
    "type-design-analyzer": typeDesignAnalyzer?.scores ?? {
      encapsulation: 0,
      invariant: 0,
      usefulness: 0,
      enforcement: 0,
    },
    "code-reviewer": {
      score: codeReviewer?.score ?? 0,
    },
    "code-simplifier": {
      suggestions: codeSimplifier?.suggestions?.length ?? 0,
    },
  };
}

function generateIndex(reviewDir: string): IndexJson {
  const jsonFiles = findJsonFiles(reviewDir);
  const files: IndexFile[] = [];
  const summary: IndexSummary = {
    total_files: 0,
    total_fix_plans: 0,
    by_priority: { high: 0, medium: 0, low: 0 },
    avg_scores: {
      "pr-test-analyzer": 0,
      "code-reviewer": 0,
      "type-design-analyzer": { encapsulation: 0, invariant: 0, usefulness: 0, enforcement: 0 },
    },
  };

  // Accumulators for averages
  let totalCoverage = 0;
  let totalCodeReview = 0;
  const totalTypeDesign: TypeDesignScores = { encapsulation: 0, invariant: 0, usefulness: 0, enforcement: 0 };

  for (const filePath of jsonFiles) {
    const review = loadReviewFile(filePath);
    if (!review) continue;

    const agentScores = extractAgentScores(review);

    // Count fix_plans by priority
    const fixPlansByPriority = { high: 0, medium: 0, low: 0 };
    for (const plan of review.fix_plans ?? []) {
      const priority = plan.priority as keyof typeof fixPlansByPriority;
      if (priority in fixPlansByPriority) {
        fixPlansByPriority[priority]++;
        summary.by_priority[priority]++;
      }
    }

    files.push({
      path: review.path,
      fix_plans: {
        total: review.fix_plans?.length ?? 0,
        ...fixPlansByPriority,
      },
      agents: agentScores,
    });

    summary.total_files++;
    summary.total_fix_plans += review.fix_plans?.length ?? 0;

    // Accumulate for averages
    totalCoverage += agentScores["pr-test-analyzer"].coverage_score;
    totalCodeReview += agentScores["code-reviewer"].score;
    totalTypeDesign.encapsulation += agentScores["type-design-analyzer"].encapsulation;
    totalTypeDesign.invariant += agentScores["type-design-analyzer"].invariant;
    totalTypeDesign.usefulness += agentScores["type-design-analyzer"].usefulness;
    totalTypeDesign.enforcement += agentScores["type-design-analyzer"].enforcement;
  }

  // Calculate averages
  if (summary.total_files > 0) {
    const n = summary.total_files;
    summary.avg_scores["pr-test-analyzer"] = Math.round((totalCoverage / n) * 10) / 10;
    summary.avg_scores["code-reviewer"] = Math.round((totalCodeReview / n) * 10) / 10;
    summary.avg_scores["type-design-analyzer"] = {
      encapsulation: Math.round((totalTypeDesign.encapsulation / n) * 10) / 10,
      invariant: Math.round((totalTypeDesign.invariant / n) * 10) / 10,
      usefulness: Math.round((totalTypeDesign.usefulness / n) * 10) / 10,
      enforcement: Math.round((totalTypeDesign.enforcement / n) * 10) / 10,
    };
  }

  // Sort by total fix_plans count (descending)
  files.sort((a, b) => b.fix_plans.total - a.fix_plans.total);

  return {
    summary,
    files,
  };
}

function main() {
  const reviewDir = parseArgs();

  if (!fs.existsSync(reviewDir)) {
    console.error(`Review directory not found: ${reviewDir}`);
    process.exit(1);
  }

  const index = generateIndex(reviewDir);
  const outputPath = path.join(reviewDir, "index.json");

  fs.writeFileSync(outputPath, JSON.stringify(index, null, 2));
  console.log(`Generated: ${outputPath}`);
  console.log(`  Files: ${index.summary.total_files}`);
  console.log(`  Fix plans: ${index.summary.total_fix_plans}`);
  console.log(`  Priority: high=${index.summary.by_priority.high}, medium=${index.summary.by_priority.medium}, low=${index.summary.by_priority.low}`);
  console.log(`  Avg scores: coverage=${index.summary.avg_scores["pr-test-analyzer"]}, code-review=${index.summary.avg_scores["code-reviewer"]}`);
}

main();
