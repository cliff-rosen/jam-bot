Problem Statement
Translating evidence specifications into effective PubMed Boolean searches requires expert knowledge of controlled vocabulary, search syntax, and strategic trade-offs between sensitivity and specificity. Current manual approaches are time-intensive, prone to inconsistency across researchers, and often result in either missed relevant studies or unmanageable result volumes.

Boolean Search Generation
Stage 1: Natural Language Scope Statement Generation
Objective: Guide users to articulate clean, unambiguous boundary definitions for their evidence requirements.
Requirements for effective scope statements:
Specific enough to exclude irrelevant studies
Complete enough to capture the full research paradigm
Testable - enabling consistent evaluation by AI systems
Mappable to searchable PubMed concepts
Example transformation:
Initial input: "Studies on asbestos and cancer in engineered mice"
Refined scope: "Studies that expose genetically engineered mice to asbestos and measure mesothelioma development"
AI Implementation: Interactive refinement process using structured prompting to help users clarify ambiguous specifications and identify missing scope elements.
Stage 2: Concept Extraction Methodology
Objective: Decompose scope statements into discrete, searchable concepts that serve as Boolean building blocks.
Process components:
Entity recognition (organisms, interventions, outcomes, study designs)
Relationship identification (exposure, measurement, modification, comparison)
Concept ranking by constraining power and specificity
MeSH term mapping and synonym identification
Example output:
Scope: "Studies that expose genetically engineered mice to asbestos and measure mesothelioma development"
Extracted concepts: [genetically engineered mice], [asbestos exposure], [mesothelioma]
Ranked by specificity: High→Low
Stage 3: Iterative Search Construction
Objective: Generate optimized Boolean expressions that maximize recall while maintaining manageable result volumes for Level 2 processing.
Methodology:
Start minimal: Begin with fewest concepts that might capture the boundary
Explode each concept: Expand with OR terms, MeSH hierarchies, synonyms, related terms
Test breadth: Evaluate result volume against processing capacity
Add concepts incrementally: If too broad, introduce additional AND constraints
Iterate: Repeat until achieving manageable, comprehensive result set
Strategic principle: Every additional AND constraint creates false negative risk. Minimize concept requirements while respecting boundary definitions, relying on Level 2 semantic filtering for precision.
Example progression:
Try: [mice OR "laboratory mice" OR "transgenic mice"] AND [asbestos OR "asbestos fibers" OR "chrysotile"]
If too broad: [("genetically engineered mice" OR "transgenic mice" OR "knockout mice")] AND [(asbestos OR "asbestos exposure" OR "asbestos fibers")]
If still too broad: Add [mesothelioma OR "pleural mesothelioma" OR "lung cancer"]


🔹 Goal
Turn a natural language scope statement into a small set of clear, searchable biomedical concepts (with synonyms and MeSH mappings) that Stage 3 can combine into Boolean queries.

🔹 Core Steps
Identify Key Concepts


Use NER or pattern rules to find:


Organisms / Populations


Exposures / Interventions


Outcomes / Diseases


Study Designs (optional if stated)


Ignore fluff words, keep only meaningful biomedical entities.


Assign Roles


Decide what each concept does in the study:


Subject (who), Exposure (what’s done), Outcome (what’s measured).


If unclear, fall back to a simple LLM classification prompt.


Normalize to MeSH


Look each concept up in MeSH.


Pick the best match (descriptor + synonyms + tree number).


If no MeSH exists, keep the raw term but flag as “free-text only.”


Expand with Synonyms


Collect:


MeSH preferred term


Entry terms / common variants


Closely related synonyms


These become OR terms in Stage 3.


Rank by Specificity


Rough scoring:


Narrow concepts (deep MeSH node, rare term) → High specificity


Broad concepts (e.g. “cancer,” “mice”) → Low specificity


Prioritize higher-specificity concepts for constraining searches.



🔹 Output Structure (Simple)
[
  {
    "concept": "asbestos",
    "role": "exposure",
    "mesh": "D001195",
    "synonyms": ["asbestos fibers", "chrysotile", "crocidolite"],
    "specificity": 0.8
  },
  {
    "concept": "genetically engineered mice",
    "role": "organism",
    "mesh": "D019297",
    "synonyms": ["transgenic mice", "knockout mice"],
    "specificity": 0.6
  },
  {
    "concept": "mesothelioma",
    "role": "outcome",
    "mesh": "D008654",
    "synonyms": ["pleural mesothelioma", "malignant mesothelioma"],
    "specificity": 0.9
  }
]

🔹 Design Principles
Focus on few, high-value concepts (usually 2–4).


Don’t over-constrain — Stage 3 will combine and test breadth.


Let Stage 2 output be simple, explainable, and human-checkable.



If you want, next I can boil Stage 3 (iterative Boolean construction) down in the same minimal style — would you like me to do that?


