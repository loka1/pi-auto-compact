/**
 * Auto Context Compaction
 *
 * Automatically triggers compaction when the conversation context drops to a
 * configured percentage remaining (default 20%, i.e. 80% of the context window
 * is used). The threshold can be set:
 *
 *   - Globally  (applies to every model that has no override)
 *   - Per model (specific <provider>/<id> or bare <id> overrides global)
 *
 * Configuration lives in a JSON file (editable by hand) and can also be
 * managed interactively with the /autocompact command:
 *
 *   JSON files (later files override earlier ones):
 *     1. ~/.pi/agent/auto-compact.json        (global; /autocompact commands write here)
 *     2. <project>/.pi/auto-compact.json      (project-local, wins)
 *
 *   Per-model thresholds are stored in the same file under the "models" key
 *   (this is the "by model" setting), while "percentRemaining" is the global
 *   default used by every model that has no per-model override.
 *
 *   {
 *     "enabled": true,
 *     "percentRemaining": 20,          // compact when this % of context remains
 *     "cooldownTurns": 1,              // min turns between auto-compactions
 *     "models": {
 *       "anthropic/claude-sonnet-4-5": 15,   // key by provider/id or bare id
 *       "gpt-4o": 25
 *     }
 *   }
 *
 *   Commands:
 *     /autocompact                          show config + current status
 *     /autocompact set <percent>            set global threshold
 *     /autocompact model <id> <percent>     set per-model threshold
 *     /autocompact unset <id>               remove per-model override
 *     /autocompact toggle                   enable/disable
 *     /set-auto-compact-limit <pct>              quick global set
 *     /set-auto-compact-limit <pct> model <id>   quick per-model set
 *
 *   A footer status bar shows: auto-compact @<limit>% · ctx <used>% used
 *   (<remaining>% left), updated every turn and on model change.
 *
 * Install: place in ~/.pi/agent/extensions/ (global) or .pi/extensions/
 * (project-local), then /reload.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

interface AutoCompactConfig {
	enabled: boolean;
	/** Compact when this percentage of the context window remains. */
	percentRemaining: number;
	/** Minimum number of turns between automatic compactions. */
	cooldownTurns: number;
	/** Per-model overrides keyed by "provider/id" or bare "id" -> percentRemaining. */
	models: Record<string, number>;
}

const DEFAULTS: AutoCompactConfig = {
	enabled: true,
	percentRemaining: 20,
	cooldownTurns: 1,
	models: {},
};

const globalConfigPath = () => join(homedir(), ".pi", "agent", "auto-compact.json");
const projectConfigPath = (ctx: ExtensionContext) => join(ctx.cwd, ".pi", "auto-compact.json");

function normalize(value: unknown): AutoCompactConfig {
	const src = (value ?? {}) as Partial<AutoCompactConfig>;
	return {
		enabled: typeof src.enabled === "boolean" ? src.enabled : DEFAULTS.enabled,
		percentRemaining:
			typeof src.percentRemaining === "number"
				? clampPercent(src.percentRemaining)
				: DEFAULTS.percentRemaining,
		cooldownTurns:
			typeof src.cooldownTurns === "number" && src.cooldownTurns >= 0
				? src.cooldownTurns
				: DEFAULTS.cooldownTurns,
		models: src.models && typeof src.models === "object" ? (src.models as Record<string, number>) : {},
	};
}

function clampPercent(n: number): number {
	return Math.min(100, Math.max(1, n));
}

function tryReadJson(path: string): { file: string; data: Record<string, unknown> } | null {
	try {
		if (!existsSync(path)) return null;
		const data = JSON.parse(readFileSync(path, "utf8"));
		return { file: path, data: data as Record<string, unknown> };
	} catch {
		return null;
	}
}

/** Load config, merging defaults <- global <- project (project wins). */
function loadConfig(ctx: ExtensionContext): AutoCompactConfig {
	let config = { ...DEFAULTS };
	const globalPath = globalConfigPath();
	const projectPath = projectConfigPath(ctx);

	for (const path of [globalPath, projectPath]) {
		const found = tryReadJson(path);
		if (found) config = { ...config, ...normalize(found.data) };
	}
	return config;
}

/** Save config to the global config file (project files can still override by hand). */
function saveConfig(_ctx: ExtensionContext, config: AutoCompactConfig): { ok: boolean; path: string; error?: string } {
	const file = globalConfigPath();
	try {
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(file, JSON.stringify(config, null, 2) + "\n", "utf8");
		return { ok: true, path: file };
	} catch (error) {
		return { ok: false, path: file, error: error instanceof Error ? error.message : String(error) };
	}
}

/** Effective remaining-percent threshold for a given model (per-model wins over global). */
function thresholdForModel(config: AutoCompactConfig, provider: string, id: string): number {
	const model = config.models[id] ?? config.models[`${provider}/${id}`];
	return typeof model === "number" ? clampPercent(model) : config.percentRemaining;
}

function modelKey(provider: string | undefined, id: string): string {
	return `${provider ?? "?"}/${id}`;
}

export default function (pi: ExtensionAPI) {
	let lastCompactTurn = -Infinity;

	const updateStatus = (ctx: ExtensionContext) => {
		if (!ctx.hasUI) return;
		const model = ctx.model;
		const usage = ctx.getContextUsage();
		const window = model?.contextWindow;
		let text = "auto-compact: n/a";
		if (model && window) {
			const threshold = thresholdForModel(configOf(ctx), model.provider, model.id);
			if (usage && typeof usage.tokens === "number") {
				const usedPct = ((usage.tokens / window) * 100).toFixed(1);
				const remaining = (100 - parseFloat(usedPct)).toFixed(1);
				text = `auto-compact @${threshold}% · ctx ${usedPct}% used (${remaining}% left)`;
			} else {
				text = `auto-compact @${threshold}% · ctx —`;
			}
		}
		ctx.ui.setStatus("auto-compact", text);
	};

	// Re-read config fresh each event so edits to the JSON file take effect
	// without a reload. Cheap enough per turn.
	const configOf = (ctx: ExtensionContext) => loadConfig(ctx);

	const maybeCompact = (ctx: ExtensionContext, turnIndex: number) => {
		const config = configOf(ctx);
		if (!config.enabled) return;
		const usage = ctx.getContextUsage();
		if (!usage || typeof usage.tokens !== "number") return;
		const model = ctx.model;
		if (!model || !model.contextWindow) return;

		const window = model.contextWindow;
		const remainingPercent = ((window - usage.tokens) / window) * 100;
		const threshold = thresholdForModel(config, model.provider, model.id);

		// Only cross from above -> at/below, and respect cooldown.
		if (remainingPercent > threshold) return;
		if (turnIndex - lastCompactTurn < config.cooldownTurns) return;
		lastCompactTurn = turnIndex;

		if (ctx.hasUI) {
			ctx.ui.notify(
				`Auto-compact: ${remainingPercent.toFixed(1)}% context remaining (threshold ${threshold}%) for ${modelKey(model.provider, model.id)} — compacting…`,
				"info",
			);
		}
		ctx.compact({
			customInstructions: `Context was at ${remainingPercent.toFixed(1)}% remaining (threshold ${threshold}%). Summarize the conversation to free up context while preserving all critical context, decisions, and next steps.`,
			onComplete: () => {
				if (ctx.hasUI) ctx.ui.notify("Auto-compaction completed.", "info");
				updateStatus(ctx);
			},
			onError: (error) => {
				if (ctx.hasUI) ctx.ui.notify(`Auto-compaction failed: ${error.message}`, "error");
			},
		});
	};

	pi.on("turn_end", (event, ctx) => {
		updateStatus(ctx);
		maybeCompact(ctx, event.turnIndex);
	});

	pi.on("model_select", (_event, ctx) => {
		updateStatus(ctx);
	});

	pi.registerCommand("autocompact", {
		description: "Show / manage auto-context-compaction settings (global or per model)",
		handler: async (args, ctx) => {
			const parts = (args ?? "").trim().split(/\s+/).filter(Boolean);
			const sub = parts[0]?.toLowerCase();
			const config = configOf(ctx);

			if (!sub) {
				// Show status
				const usage = ctx.getContextUsage();
				const model = ctx.model;
				const lines: string[] = [];
				lines.push(`enabled: ${config.enabled ? "yes" : "no"}`);
				lines.push(`global compact-at-remaining: ${config.percentRemaining}%`);
				lines.push(`cooldown: ${config.cooldownTurns} turn(s)`);
				if (model) {
					const eff = thresholdForModel(config, model.provider, model.id);
					const overrideKey =
						config.models[model.id] !== undefined
							? model.id
							: config.models[`${model.provider}/${model.id}`] !== undefined
								? `${model.provider}/${model.id}`
								: undefined;
					lines.push(
						`current model: ${modelKey(model.provider, model.id)} (window ${model.contextWindow.toLocaleString()} tokens)`,
					);
					lines.push(
						`effective threshold: ${eff}% remaining${overrideKey ? ` (per-model "${overrideKey}")` : " (global)"}`,
					);
					if (usage && typeof usage.tokens === "number") {
						lines.push(
							`current usage: ${usage.tokens.toLocaleString()} tokens (${((usage.tokens / model.contextWindow) * 100).toFixed(1)}%)`,
						);
					}
				}
				if (Object.keys(config.models).length > 0) {
					lines.push(
						`per-model overrides: ${Object.entries(config.models)
							.map(([k, v]) => `${k}@${v}%`)
							.join(", ")}`,
					);
				}
				ctx.ui.notify(lines.join("\n"), "info");
				return;
			}

			if (sub === "toggle") {
				const next = { ...config, enabled: !config.enabled };
				const res = saveConfig(ctx, next);
				ctx.ui.notify(
					res.ok
						? `Auto-compaction ${next.enabled ? "enabled" : "disabled"} (${res.path})`
						: `Failed to save: ${res.error}`,
					res.ok ? "info" : "error",
				);
				return;
			}

			if (sub === "set") {
				const pct = Number(parts[1]);
				if (!Number.isFinite(pct)) {
					ctx.ui.notify("Usage: /autocompact set <percentRemaining>", "error");
					return;
				}
				const next = { ...config, percentRemaining: clampPercent(pct) };
				const res = saveConfig(ctx, next);
				ctx.ui.notify(
					res.ok
						? `Global compact-at-remaining set to ${clampPercent(pct)}% (${res.path})`
						: `Failed to save: ${res.error}`,
					res.ok ? "info" : "error",
				);
				return;
			}

			if (sub === "model") {
				const id = parts[1];
				const pct = Number(parts[2]);
				if (!id || !Number.isFinite(pct)) {
					ctx.ui.notify("Usage: /autocompact model <provider/id|id> <percentRemaining>", "error");
					return;
				}
				const models = { ...config.models, [id]: clampPercent(pct) };
				const res = saveConfig(ctx, { ...config, models });
				ctx.ui.notify(
					res.ok ? `Per-model ${id} compact-at-remaining set to ${clampPercent(pct)}% (${res.path})` : `Failed to save: ${res.error}`,
					res.ok ? "info" : "error",
				);
				return;
			}

			if (sub === "unset") {
				const id = parts[1];
				if (!id) {
					ctx.ui.notify("Usage: /autocompact unset <provider/id|id>", "error");
					return;
				}
				const models = { ...config.models };
				delete models[id];
				const res = saveConfig(ctx, { ...config, models });
				ctx.ui.notify(
					res.ok ? `Removed per-model override for ${id} (${res.path})` : `Failed to save: ${res.error}`,
					res.ok ? "info" : "error",
				);
				return;
			}

			ctx.ui.notify(
				"Unknown subcommand. Try: /autocompact [set <pct> | model <id> <pct> | unset <id> | toggle]",
				"error",
			);
		},
	});

	// Dedicated, easy-to-type command to change the limit quickly.
	pi.registerCommand("set-auto-compact-limit", {
		description: "Set auto-compact limit (context % remaining) globally or per model",
		handler: async (args, ctx) => {
			const parts = (args ?? "").trim().split(/\s+/).filter(Boolean);
			const pct = Number(parts[0]);
			if (!Number.isFinite(pct)) {
				ctx.ui.notify(
					"Usage: /set-auto-compact-limit <percentRemaining> [model <provider/id|id>]",
					"error",
				);
				return;
			}

			const next = { ...configOf(ctx) };
			const modelIdx = parts.findIndex((p) => p.toLowerCase() === "model");
			let where = "globally";
			if (modelIdx !== -1 && parts[modelIdx + 1]) {
				const id = parts[modelIdx + 1];
				next.models = { ...next.models, [id]: clampPercent(pct) };
				where = `for model "${id}"`;
			} else {
				next.percentRemaining = clampPercent(pct);
			}

			const res = saveConfig(ctx, next);
			if (!res.ok) {
				ctx.ui.notify(`Failed to save: ${res.error}`, "error");
				return;
			}

			ctx.ui.notify(
				`Auto-compact limit set to ${clampPercent(pct)}% remaining ${where} (compact when ${100 - clampPercent(pct)}% used); saved to ${res.path}`,
				"info",
			);
			updateStatus(ctx);
		},
	});
}
