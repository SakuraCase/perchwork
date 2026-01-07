/**
 * Generate index.json from existing review JSON files
 *
 * Usage:
 *   node dist/generate-index.js <review-dir> [target-dir] [mode]
 *
 * Example:
 *   node dist/generate-index.js ./public/data/review ../../backend/src/lib/domain full
 */

import * as fs from "fs";
import * as path from "path";
import type {
  ReviewFile,
  IndexJson,
  IndexFile,
  IndexSummary,
  PriorityCount,
} from "./types.js";

const VERSION = "1.0.0";

interface Args {
  reviewDir: string;
  targetDir: string;
  mode: "diff" | "full";
}

function parseArgs(): Args {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: generate-index.ts <review-dir> [target-dir] [mode]");
    process.exit(1);
  }

  return {
    reviewDir: args[0],
    targetDir: args[1] ?? ".",
    mode: (args[2] as "diff" | "full") ?? "full",
  };
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

function generateIndex(reviewDir: string, targetDir: string, mode: "diff" | "full"): IndexJson {
  const jsonFiles = findJsonFiles(reviewDir);
  const files: IndexFile[] = [];
  const summary: IndexSummary = {
    total_files: 0,
    total_fix_plans: 0,
    by_priority: { high: 0, medium: 0, low: 0 },
  };

  // Accumulators for averages
  let totalCoverage = 0;
  let totalCodeReview = 0;
  let coverageCount = 0;
  let codeReviewCount = 0;

  for (const filePath of jsonFiles) {
    const review = loadReviewFile(filePath);
    if (!review) continue;

    const agents = review.agents;
    const prTestAnalyzer = agents["pr-test-analyzer"];
    const codeReviewer = agents["code-reviewer"];

    // Count fix_plans by priority (per file and summary)
    const filePriority: PriorityCount = { high: 0, medium: 0, low: 0 };
    for (const plan of review.fix_plans ?? []) {
      const priority = plan.priority as keyof PriorityCount;
      if (priority in filePriority) {
        filePriority[priority]++;
        summary.by_priority[priority]++;
      }
    }

    // Extract scores
    const coverageScore = prTestAnalyzer?.coverage_score;
    const codeScore = codeReviewer?.score;

    files.push({
      path: review.path,
      fix_plans: review.fix_plans?.length ?? 0,
      by_priority: filePriority,
      code_score: codeScore,
      coverage_score: coverageScore,
    });

    summary.total_files++;
    summary.total_fix_plans += review.fix_plans?.length ?? 0;

    // Accumulate for averages
    if (coverageScore !== undefined) {
      totalCoverage += coverageScore;
      coverageCount++;
    }
    if (codeScore !== undefined) {
      totalCodeReview += codeScore;
      codeReviewCount++;
    }
  }

  // Calculate averages
  if (codeReviewCount > 0) {
    summary.average_code_score = Math.round((totalCodeReview / codeReviewCount) * 10) / 10;
  }
  if (coverageCount > 0) {
    summary.average_coverage_score = Math.round((totalCoverage / coverageCount) * 10) / 10;
  }

  // Sort by high priority first, then by total fix_plans count (descending)
  files.sort((a, b) => {
    // First by high priority (descending)
    if (b.by_priority.high !== a.by_priority.high) {
      return b.by_priority.high - a.by_priority.high;
    }
    // Then by medium priority (descending)
    if (b.by_priority.medium !== a.by_priority.medium) {
      return b.by_priority.medium - a.by_priority.medium;
    }
    // Finally by total fix_plans (descending)
    return b.fix_plans - a.fix_plans;
  });

  return {
    version: VERSION,
    generated_at: new Date().toISOString(),
    config: {
      target_dir: targetDir,
      mode,
    },
    summary,
    files,
  };
}

function main() {
  const { reviewDir, targetDir, mode } = parseArgs();

  if (!fs.existsSync(reviewDir)) {
    console.error(`Review directory not found: ${reviewDir}`);
    process.exit(1);
  }

  const index = generateIndex(reviewDir, targetDir, mode);
  const outputPath = path.join(reviewDir, "index.json");

  fs.writeFileSync(outputPath, JSON.stringify(index, null, 2) + "\n");
  console.log(`Generated: ${outputPath}`);
  console.log(`  Version: ${index.version}`);
  console.log(`  Files: ${index.summary.total_files}`);
  console.log(`  Fix plans: ${index.summary.total_fix_plans}`);
  console.log(`  Priority: high=${index.summary.by_priority.high}, medium=${index.summary.by_priority.medium}, low=${index.summary.by_priority.low}`);
  if (index.summary.average_code_score !== undefined) {
    console.log(`  Avg code score: ${index.summary.average_code_score}`);
  }
  if (index.summary.average_coverage_score !== undefined) {
    console.log(`  Avg coverage score: ${index.summary.average_coverage_score}`);
  }
}

main();
