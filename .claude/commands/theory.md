# Theory-Based Documentation Generation Prompt

## Objective

Analyze this codebase and generate documentation, outputting in markdown to `THEORY.md`, that helps new programmers build an effective mental model (theory) of the system, following Peter Naur's "Programming as Theory Building" approach.

## Instructions

### 1. Identify the Core Theory

- **What is this system fundamentally?** Identify the central metaphor or mental model that best describes what this codebase does and how it's organized
- **What real-world problem does it solve?** Describe the domain and how the software maps to real-world activities
- **What are the key abstractions?** Identify the 3-5 most important concepts that everything else builds on

### 2. Capture Decision Rationale

- **Why is it structured this way?** For major architectural decisions, explain the reasoning
- **What alternatives were rejected?** Where you can infer from the code, note what approaches were NOT taken and why
- **What are the key tradeoffs?** Identify the main tensions the system balances (performance vs. simplicity, flexibility vs. consistency, etc.)

### 3. Map Similarity Patterns

- **Where do new features typically go?** Help readers recognize patterns for where different types of changes belong
- **What are the "hotspots"?** Identify areas that frequently change and why
- **How do the pieces fit together?** Show the main interaction patterns between components

### 4. Provide Theory-Building Guidance

- **Starting points:** Where should someone begin exploring to build understanding?
- **Mental checkpoints:** What should someone understand before moving to the next level?
- **Warning signs:** What indicates someone might be working against the system's "grain"?

## Output Format

Structure your response as:

### The System Theory

**Central Metaphor:** [One sentence describing what this system is like]

**Core Purpose:** [1-2 sentences on what real-world problem this solves]

**Key Abstractions:** [3-5 bullet points of the main concepts]

### How to Think About This Codebase

**Mental Model:** [2-3 paragraphs describing how to conceptualize the system's organization and flow]

**Decision Rationale:** [Key architectural choices and why they were made]

### Working With This System

**Similarity Patterns:** [Where do different types of changes typically go? How to recognize what's similar to what?]

**Exploration Path:** [Suggested order for understanding the system - what to look at first, second, third]

**Red Flags:** [What indicates you're probably going against the system's design intent?]

### Visual Model

[If helpful, include a simple diagram showing the main conceptual relationships - not implementation details, but how the key ideas relate to each other]

## Guidelines

- **Focus on WHY and HOW TO THINK, not WHAT** - Assume the reader can read code
- **Be concise but insightful** - Aim for clarity over completeness
- **Emphasize patterns over procedures** - Help build intuition, not checklists
- **Make it maintainable** - Structure this so it can be easily updated as the system evolves

---

## For Updates

When re-running this prompt after code changes, focus on what's changed in the theory, not just what code changed. Has the central metaphor shifted? Are there new patterns? Different tradeoffs?
