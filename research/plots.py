from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import PercentFormatter

from research.evaluate import METHODS

COLORS = ("#879398", "#457c78", "#bb762b", "#255641")


def save(fig, directory: Path, name):
    fig.set_facecolor("#fafbf8")
    fig.savefig(directory / name, dpi=170, bbox_inches="tight", pad_inches=0.2)
    plt.close(fig)


def style(ax, axis="y"):
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis=axis, alpha=0.22)
    ax.set_axisbelow(True)


def grouped(ax, names, values, horizontal=False):
    width = 0.18
    for index, (method, color) in enumerate(zip(METHODS, COLORS)):
        locations = [i + (index - 1.5) * width for i in range(len(names))]
        plot = ax.barh if horizontal else ax.bar
        plot(locations, [values(name, method) for name in names], width, label=method, color=color)
    if horizontal:
        ax.set_yticks(range(len(names)), names)
        ax.invert_yaxis()
        ax.xaxis.set_major_formatter(PercentFormatter(1))
        ax.set_xlim(0, 1.05)
    else:
        ax.set_xticks(range(len(names)), names)
        ax.yaxis.set_major_formatter(PercentFormatter(1))
        ax.set_ylim(0, 1.05)
    style(ax, "x" if horizontal else "y")


def plot(metrics, directory):
    overall = metrics["overall"]
    frontier = metrics["matched_review"]
    fig, ax = plt.subplots(figsize=(8.5, 4.6), layout="constrained")
    for method, color in zip(METHODS, COLORS):
        line, = ax.plot(
            [point["target_review_rate"] for point in frontier],
            [point["methods"][method]["unsafe_approval_rate"] for point in frontier],
            color=color, marker="o", markersize=4, label=f"{method} · matched budgets",
        )
        row = overall[method]
        ax.scatter(row["human_review_rate"], row["unsafe_approval_rate"], marker="D",
                   facecolor="none", edgecolor=line.get_color(), s=58, zorder=4)
    ax.set(xlabel="Human review rate · all proposals", ylabel="Unsafe auto-approval · unsafe proposals",
           title="Security–autonomy frontier · equal review counts")
    ax.text(0.99, 0.45, "Open diamonds show native operating points", transform=ax.transAxes,
            ha="right", va="top", fontsize=9, color="#4b5c58")
    ax.xaxis.set_major_formatter(PercentFormatter(1))
    ax.yaxis.set_major_formatter(PercentFormatter(1))
    ax.legend(frameon=False)
    style(ax)
    save(fig, directory, "frontier.png")
    fig, (tradeoff, rejections) = plt.subplots(1, 2, figsize=(11, 4.1), layout="constrained")
    for method, color in zip(METHODS, COLORS):
        row = overall[method]
        tradeoff.scatter(row["human_review_rate"], row["unsafe_approval_rate"], color=color, s=72, label=method)
    tradeoff.set(xlabel="Human-review rate · all proposals", ylabel="Unsafe approvals · nonconforming proposals",
                 xlim=(-0.035, 0.5), ylim=(-0.035, 1.05))
    tradeoff.xaxis.set_major_formatter(PercentFormatter(1))
    tradeoff.yaxis.set_major_formatter(PercentFormatter(1))
    tradeoff.legend(frameon=False)
    style(tradeoff)
    rejection_rates = [overall[method]["false_rejection_rate"] for method in METHODS]
    bars = rejections.bar(range(len(METHODS)), rejection_rates, color=COLORS)
    rejections.bar_label(bars, labels=[f"{rate:.0%}" for rate in rejection_rates], padding=5)
    rejections.set_xticks(range(len(METHODS)), METHODS, rotation=20, ha="right")
    rejections.set(ylabel="False rejections · conformant proposals", ylim=(0, 1.05))
    rejections.yaxis.set_major_formatter(PercentFormatter(1))
    style(rejections)
    fig.suptitle("Decision trade-offs on held-out synthetic proposals", fontweight="bold")
    save(fig, directory, "tradeoffs.png")

    by_family = metrics["by_family"]
    names = {name.replace("_", " ").capitalize(): name for name in by_family}
    fig, ax = plt.subplots(figsize=(9, 5.7), layout="constrained")
    grouped(ax, list(names), lambda name, method: by_family[names[name]][method]["unsafe_approval_rate"], True)
    ax.set(xlabel="Unsafe approval rate", title="Unsafe approvals by synthetic manipulation family")
    ax.legend(frameon=False, ncols=4, loc="upper center", bbox_to_anchor=(0.5, -0.11), fontsize=9)
    save(fig, directory, "families.png")

    by_cohort = {name: metrics["by_cohort"][name] for name in ("Known", "Unseen")}
    fig, ax = plt.subplots(figsize=(7.8, 4), layout="constrained")
    grouped(ax, list(by_cohort), lambda name, method: by_cohort[name][method]["unsafe_approval_rate"])
    ax.set(ylabel="Unsafe approval rate", title="Known vs held-out manipulation families")
    ax.legend(frameon=False, ncols=4, loc="upper center", bbox_to_anchor=(0.5, -0.12), fontsize=9)
    save(fig, directory, "known-unseen.png")

    fig, ax = plt.subplots(figsize=(7.8, 4), layout="constrained")
    y = range(len(METHODS))
    for index, (method, color) in enumerate(zip(METHODS, COLORS)):
        row = overall[method]
        ax.hlines(index, row["median_ms"], row["p95_ms"], color=color, linewidth=3)
        ax.scatter(row["median_ms"], index, color=color, label="Median" if index == 0 else None)
        ax.scatter(row["p95_ms"], index, edgecolors=color, facecolors="white", label="95th percentile" if index == 0 else None)
    ax.set_yticks(y, METHODS)
    ax.invert_yaxis()
    ax.set(xlabel="Milliseconds (log scale)", xscale="log", title="Verification latency · in process")
    ax.legend(frameon=False)
    style(ax, "x")
    save(fig, directory, "latency.png")
