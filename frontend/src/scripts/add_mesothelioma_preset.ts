import { workbenchApi } from '../lib/api/workbenchApi';
import { generatePrefixedUUID } from '../lib/utils/uuid';

/**
 * Script to add the Mesothelioma Research feature preset to the database
 */
async function addMesotheliomaPreset() {
  try {
    console.log('Creating Mesothelioma Research feature preset...');

    const presetData = {
      name: "Mesothelioma Research - Genetically Engineered Mice",
      description: "Feature set for analyzing studies that model malignant mesothelioma in genetically engineered mice exposed to asbestos fibers, particularly via intraperitoneal injection.",
      category: "Research Analysis",
      features: [
        {
          id: generatePrefixedUUID('feat'),
          name: "Genetically Modified Mice Used",
          description: "Identifies if genetically engineered or knockout mice were used",
          type: "boolean" as const,
          extraction_prompt: "Does this study use genetically engineered or knockout mice? Look for mentions of genetic modifications, knockout mice, transgenic mice, or specific gene targeting. Answer with Yes/No."
        },
        {
          id: generatePrefixedUUID('feat'),
          name: "Specific Genes Modified",
          description: "Lists the specific genes that were modified or knocked out",
          type: "text" as const, 
          extraction_prompt: "What specific genes were modified or knocked out in this study? Look for tumor suppressor genes like Bap1, Nf2, Tp53, Cdkn2a, Ink4a, Arf, or any other genetic modifications mentioned. List all genes mentioned or 'None specified' if not detailed."
        },
        {
          id: generatePrefixedUUID('feat'),
          name: "Mesothelioma Target Disease",
          description: "Determines if mesothelioma is the primary target disease",
          type: "boolean" as const,
          extraction_prompt: "Is malignant mesothelioma (MM) the primary target disease or measurable endpoint in this study? Look for explicit mentions of mesothelioma as the disease being studied. Answer with Yes/No."
        },
        {
          id: generatePrefixedUUID('feat'),
          name: "Asbestos Exposure Used",
          description: "Identifies if asbestos exposure was used to induce disease",
          type: "boolean" as const,
          extraction_prompt: "Does this study involve asbestos exposure to induce disease? Look for any mention of asbestos fibers, asbestos treatment, or asbestos-related exposure. Answer with Yes/No."
        },
        {
          id: generatePrefixedUUID('feat'),
          name: "Specific Mineral Type",
          description: "Records the specific type of asbestos or mineral fibers used",
          type: "text" as const,
          extraction_prompt: "What specific type of asbestos or mineral fibers were used? Look for mentions of crocidolite, chrysotile, amosite, tremolite, or other specific mineral types. State the exact type mentioned or 'Not specified' if unclear."
        },
        {
          id: generatePrefixedUUID('feat'),
          name: "Intraperitoneal Injection Route",
          description: "Identifies if intraperitoneal injection was the exposure method",
          type: "boolean" as const, 
          extraction_prompt: "Was intraperitoneal injection used as the route of asbestos exposure? Look for terms like 'intraperitoneal injection', 'IP injection', 'intraperitoneal administration', or similar routes. Answer with Yes/No."
        },
        {
          id: generatePrefixedUUID('feat'),
          name: "Tumor Incidence Measured",
          description: "Determines if quantitative tumor incidence data was reported",
          type: "boolean" as const,
          extraction_prompt: "Does this study measure and report tumor incidence or tumor development rates? Look for quantitative measurements of how many animals developed tumors. Answer with Yes/No."
        },
        {
          id: generatePrefixedUUID('feat'),
          name: "Percentage MM Development",
          description: "Extracts the specific percentage or fraction of mice that developed mesothelioma",
          type: "text" as const,
          extraction_prompt: "What percentage or fraction of mice developed mesothelioma? Look for specific numbers like '80% of mice', '15/20 animals', or similar quantitative results. Provide the exact figure mentioned or 'Not reported' if not specified."
        },
        {
          id: generatePrefixedUUID('feat'),
          name: "Fiber Dosage and Schedule", 
          description: "Captures the specific fiber dosage amounts and exposure schedule used",
          type: "text" as const,
          extraction_prompt: "What was the fiber dosage and exposure schedule used? Look for information about dose amounts (e.g., mg, μg), exposure frequency, and timing. Include all dosage details mentioned or 'Not specified' if unclear."
        },
        {
          id: generatePrefixedUUID('feat'),
          name: "Control vs Experimental Groups",
          description: "Identifies if proper control groups were included in the study design",
          type: "boolean" as const,
          extraction_prompt: "Does this study include proper control groups compared to experimental groups (e.g., wild-type vs knockout, exposed vs unexposed)? Look for comparative study design elements. Answer with Yes/No."
        },
        {
          id: generatePrefixedUUID('feat'),
          name: "Study Design Quality",
          description: "Assesses the overall study design quality and methodology",
          type: "text" as const,
          extraction_prompt: "Assess the overall study design quality. Consider: sample size mentioned, statistical analysis, controls used, methodology clarity. Summarize key strengths or limitations in 1-2 sentences."
        },
        {
          id: generatePrefixedUUID('feat'),
          name: "Key Mesothelioma Findings", 
          description: "Summarizes the main research findings related to mesothelioma",
          type: "text" as const,
          extraction_prompt: "What are the main findings related to mesothelioma development, genetic interactions, or treatment outcomes? Summarize the most important results in 2-3 sentences focusing on mesothelioma-specific outcomes."
        }
      ]
    };

    const createdPreset = await workbenchApi.createFeaturePreset(presetData);
    
    console.log('✅ Mesothelioma Research preset created successfully!');
    console.log(`Preset ID: ${createdPreset.id}`);
    console.log(`Features created: ${createdPreset.features.length}`);
    
    return createdPreset;

  } catch (error) {
    console.error('❌ Failed to create preset:', error);
    throw error;
  }
}

export { addMesotheliomaPreset };

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addMesotheliomaPreset()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}